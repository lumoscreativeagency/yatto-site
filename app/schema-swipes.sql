-- ============================================================
--  ЯТО — добавка: търсене на съотборници с плъзгане (swipe)
--  Пусни това в Supabase → SQL Editor → Run.
--  Може да се пуска повторно без страх.
-- ============================================================


-- ------------------------------------------------------------
--  1. ПЛЪЗГАНИЯ
--  Един ред за всяко решение: харесал или подминал.
--  Всеки вижда САМО своите редове — никой не може да провери
--  кой го е харесал, преди да има взаимно съвпадение.
-- ------------------------------------------------------------
create table if not exists public.swipes (
  swiper_id   uuid not null references public.profiles(id) on delete cascade,
  target_id   uuid not null references public.profiles(id) on delete cascade,
  liked       boolean not null,
  created_at  timestamptz not null default now(),
  primary key (swiper_id, target_id),
  constraint no_self_swipe check (swiper_id <> target_id)
);

alter table public.swipes enable row level security;

drop policy if exists "own swipes read" on public.swipes;
create policy "own swipes read" on public.swipes for select
  to authenticated using (auth.uid() = swiper_id);

drop policy if exists "own swipes write" on public.swipes;
create policy "own swipes write" on public.swipes for insert
  to authenticated with check (auth.uid() = swiper_id);

drop policy if exists "own swipes update" on public.swipes;
create policy "own swipes update" on public.swipes for update
  to authenticated using (auth.uid() = swiper_id) with check (auth.uid() = swiper_id);

drop policy if exists "own swipes delete" on public.swipes;
create policy "own swipes delete" on public.swipes for delete
  to authenticated using (auth.uid() = swiper_id);


-- ------------------------------------------------------------
--  2. СЪВПАДЕНИЯ
--  Пише се САМО от тригера долу. Никой не може да си създаде
--  съвпадение на ръка.
--  a_id винаги е по-малкото uuid — така двойката е уникална.
-- ------------------------------------------------------------
create table if not exists public.matches (
  a_id        uuid not null references public.profiles(id) on delete cascade,
  b_id        uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (a_id, b_id)
);

alter table public.matches enable row level security;

drop policy if exists "see own matches" on public.matches;
create policy "see own matches" on public.matches for select
  to authenticated using (auth.uid() = a_id or auth.uid() = b_id);

-- Нарочно НЯМА политика за писане: само тригерът пише тук.

drop policy if exists "leave own match" on public.matches;
create policy "leave own match" on public.matches for delete
  to authenticated using (auth.uid() = a_id or auth.uid() = b_id);


-- ------------------------------------------------------------
--  3. ТРИГЕР: взаимно харесване -> съвпадение
-- ------------------------------------------------------------
create or replace function public.check_mutual_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  reciprocal boolean;
begin
  if not new.liked then
    return new;
  end if;

  select s.liked into reciprocal
  from public.swipes s
  where s.swiper_id = new.target_id and s.target_id = new.swiper_id;

  if reciprocal is true then
    insert into public.matches (a_id, b_id)
    values (least(new.swiper_id, new.target_id), greatest(new.swiper_id, new.target_id))
    on conflict do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_swipe_check_match on public.swipes;
create trigger on_swipe_check_match
  after insert or update on public.swipes
  for each row execute function public.check_mutual_like();


-- ------------------------------------------------------------
--  ГОТОВО.
--
--  Как работи:
--  • Плъзгаш надясно = „интересува ме"; наляво = подминаваш
--  • Само при взаимно харесване се появява съвпадение
--  • Чак тогава двамата виждат Instagram-ите си
--
--  Важно: хората, които са вдигнали „търся отбор" на конкретно
--  състезание, си остават видими там БЕЗ съвпадение. Плъзгането
--  е начин да откриваш хора, не заключалка пред тях.
-- ------------------------------------------------------------
