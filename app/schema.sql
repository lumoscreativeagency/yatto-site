-- ============================================================
--  ЯТО — схема на базата данни
--  Пусни това ЦЯЛОТО в Supabase → SQL Editor → New query → Run.
--  Може да се пуска повторно без страх (използва IF NOT EXISTS).
-- ============================================================


-- ------------------------------------------------------------
--  1. ПРОФИЛИ
--  Един ред за всеки вписан човек. Свързан с вписването в Supabase.
--  Имейлът НЕ се пази тук — той стои в auth.users и не се вижда от други.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  name              text,
  city              text,
  gym               text,
  division          text,              -- RX / Scaled / Masters / Не се състезавам още
  instagram         text,              -- връзката за контакт; чат в приложението няма нарочно
  -- профил на силата (по избор, но захранва съвпадението)
  snatch_kg         numeric,
  clean_jerk_kg     numeric,
  back_squat_kg     numeric,
  fran_seconds      integer,
  strict_pullups    integer,
  bio               text,
  is_admin          boolean not null default false
);

alter table public.profiles enable row level security;

-- Вписаните виждат профилите на другите — това е нужно, за да работи
-- търсенето на отбор. Невписаните не виждат нищо.
drop policy if exists "profiles readable by signed in" on public.profiles;
create policy "profiles readable by signed in"
  on public.profiles for select to authenticated using (true);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- ⚠️ Никой не може да се направи админ сам. Админ се дава само на ръка
-- от таблицата в Supabase. Тази функция пази това правило.
create or replace function public.prevent_admin_escalation()
returns trigger language plpgsql security definer as $$
begin
  if new.is_admin is distinct from old.is_admin then
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;

drop trigger if exists no_admin_escalation on public.profiles;
create trigger no_admin_escalation
  before update on public.profiles
  for each row execute function public.prevent_admin_escalation();

-- Създава празен профил автоматично при първо вписване.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
--  2. ЗАЛИ
-- ------------------------------------------------------------
create table if not exists public.gyms (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  name          text not null,
  city          text not null,
  country       text not null default 'България',
  is_affiliate  boolean not null default false,   -- официален CrossFit афилиат
  dropin_price  text,
  website       text,
  notes         text
);

alter table public.gyms enable row level security;

drop policy if exists "gyms public read" on public.gyms;
create policy "gyms public read" on public.gyms for select to anon, authenticated using (true);

drop policy if exists "gyms admin write" on public.gyms;
create policy "gyms admin write" on public.gyms for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));


-- ------------------------------------------------------------
--  3. СЪСТЕЗАНИЯ
--  Публично четими — календарът е причината хората да идват.
--  Пише само админ (ти).
-- ------------------------------------------------------------
create table if not exists public.competitions (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  name              text not null,
  starts_on         date not null,
  ends_on           date,
  city              text not null,
  country           text not null default 'България',
  distance_km       integer,           -- от София, за колонката „път"
  format            text,              -- Индивидуално / Отбори от 3 / Двойки…
  divisions         text,              -- RX, Scaled, Masters 35+
  fee               text,
  registration_url  text,
  registration_deadline date,
  organiser         text,
  notes             text,
  is_published      boolean not null default true
);

alter table public.competitions enable row level security;

drop policy if exists "competitions public read" on public.competitions;
create policy "competitions public read" on public.competitions for select
  to anon, authenticated using (is_published);

drop policy if exists "competitions admin write" on public.competitions;
create policy "competitions admin write" on public.competitions for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));


-- ------------------------------------------------------------
--  4. КОЙ ОТИВА
-- ------------------------------------------------------------
create table if not exists public.attendances (
  competition_id    bigint not null references public.competitions(id) on delete cascade,
  profile_id        uuid   not null references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  status            text not null default 'going',   -- going | interested
  looking_for_team  boolean not null default false,
  note              text,
  primary key (competition_id, profile_id)
);

alter table public.attendances enable row level security;

drop policy if exists "attendances readable by signed in" on public.attendances;
create policy "attendances readable by signed in"
  on public.attendances for select to authenticated using (true);

drop policy if exists "attendances own write" on public.attendances;
create policy "attendances own write" on public.attendances for all to authenticated
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);


-- ------------------------------------------------------------
--  5. ПЪТУВАНЕ ЗАЕДНО
-- ------------------------------------------------------------
create table if not exists public.rides (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  competition_id    bigint not null references public.competitions(id) on delete cascade,
  driver_id         uuid   not null references public.profiles(id) on delete cascade,
  departs_at        timestamptz,
  from_place        text,
  seats_total       integer not null default 3,
  cost_per_person   text,
  note              text
);

alter table public.rides enable row level security;

drop policy if exists "rides readable by signed in" on public.rides;
create policy "rides readable by signed in" on public.rides for select to authenticated using (true);

drop policy if exists "rides own write" on public.rides;
create policy "rides own write" on public.rides for all to authenticated
  using (auth.uid() = driver_id) with check (auth.uid() = driver_id);

create table if not exists public.ride_seats (
  ride_id     bigint not null references public.rides(id) on delete cascade,
  profile_id  uuid   not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (ride_id, profile_id)
);

alter table public.ride_seats enable row level security;

drop policy if exists "seats readable by signed in" on public.ride_seats;
create policy "seats readable by signed in" on public.ride_seats for select to authenticated using (true);

drop policy if exists "seats own write" on public.ride_seats;
create policy "seats own write" on public.ride_seats for all to authenticated
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);


-- ------------------------------------------------------------
--  6. СПИСЪК НА ЧАКАЩИТЕ (от landing page-а)
-- ------------------------------------------------------------
create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  email       text not null unique,
  city        text,
  level       text,
  pain        text,
  source      text
);

alter table public.waitlist enable row level security;

drop policy if exists "anyone can sign up" on public.waitlist;
create policy "anyone can sign up" on public.waitlist for insert to anon, authenticated with check (true);
-- Нарочно НЯМА политика за четене: никой не може да си свали имейлите
-- през сайта. Ти ги четеш от таблицата в Supabase.


-- ------------------------------------------------------------
--  7. НАЧАЛНИ ДАННИ — зали
--  Петте официални CrossFit афилиата в България, проверени на crossfit.com.
--  Останалите зали се добавят от екрана „Админ".
-- ------------------------------------------------------------
insert into public.gyms (name, city, is_affiliate, website)
select * from (values
  ('CrossFit 681',           'София',  true,  'https://crossfit681.com'),
  ('CrossFit Serdika',       'София',  true,  null),
  ('CrossFit Vitosha',       'София',  true,  null),
  ('CrossFit HammerBeast',   'Пловдив',true,  null),
  ('CrossFit Varna',         'Варна',  true,  'https://crossfitvarna.com')
) as v(name, city, is_affiliate, website)
where not exists (select 1 from public.gyms);


-- ------------------------------------------------------------
--  ГОТОВО.
--
--  Последна стъпка на ръка: направи себе си админ.
--  1. Впиши се веднъж в приложението (за да се създаде профилът ти)
--  2. Supabase → Table Editor → profiles → намери своя ред
--  3. Сложи is_admin = true и запази
--
--  Чак тогава ще виждаш екрана „Админ", от който добавяш състезания.
-- ------------------------------------------------------------
