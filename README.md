# ЯТО — сайт

Landing page със списък на чакащите (waitlist). Статичен сайт, без build стъпка, качва се на GitHub Pages безплатно.

**На живо:** https://ПОТРЕБИТЕЛ.github.io/yatto-site/

---

## Какво има вътре

```
index.html    целият сайт — HTML, CSS и JS в един файл
favicon.svg   иконката в таба на браузъра
og.png        картинката при споделяне в Instagram, Messenger, iMessage
README.md     този файл
```

Няма зависимости, няма npm, няма нищо за инсталиране. Отваряш `index.html` и работи.

---

## 1. Свързване на формата (5 минути, безплатно)

Докато не е свързана, формата казва на хората, че базата липсва. Направи това веднъж:

### 1.1 Създай проект в Supabase
1. Влез в [supabase.com](https://supabase.com) → **New project**
2. Име: `yatto`, регион: **Frankfurt** (най-близо до България)
3. Запиши си паролата на базата някъде безопасно

### 1.2 Създай таблицата
В Supabase отвори **SQL Editor** → **New query**, залепи това и натисни **Run**:

```sql
create table public.waitlist (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  email       text not null unique,
  city        text,
  level       text,
  pain        text,
  source      text
);

alter table public.waitlist enable row level security;

-- Всеки може да се записва…
create policy "anyone can sign up"
  on public.waitlist for insert
  to anon
  with check (true);

-- …но никой не може да чете списъка от сайта.
-- Ти го четеш от таблицата в Supabase.
```

> Защо е важно: без последната част всеки можеше да си свали имейлите на всичките ти потребители.

### 1.3 Вземи ключовете
**Project Settings → API**, копирай:
- **Project URL** (изглежда като `https://abcdefgh.supabase.co`)
- **anon public** ключа (дългият надпис, започващ с `eyJ…`)

### 1.4 Сложи ги в сайта
Отвори `index.html`, намери горе в `<script>`:

```js
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
```

Попълни двете и запази. Готово.

> `anon` ключът е публичен по замисъл — той стои в кода на всеки Supabase сайт. Защитата идва от политиките горе, не от скриването на ключа. **Никога** не слагай тук `service_role` ключа.

### 1.5 Провери, че работи
Запиши се сам от сайта, после виж **Table Editor → waitlist** в Supabase. Трябва да те има.

---

## 2. Качване на промени

Ако редактираш през сайта на GitHub: натискаш молива, променяш, **Commit changes**. Готово.

Ако работиш от компютъра си:

```bash
git add -A
git commit -m "описание на промяната"
git push
```

GitHub Pages се обновява до около минута.

---

## 3. Собствен домейн (когато го купиш)

1. Създай файл `CNAME` в тази папка, в него само домейна: `yatto.app`
2. При регистратора на домейна добави:
   - `A` записи към `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - или `CNAME` от `www` към `ПОТРЕБИТЕЛ.github.io`
3. В GitHub: **Settings → Pages → Custom domain**, впиши домейна и включи **Enforce HTTPS**

---

## 4. Свали имейлите

Supabase → **Table Editor → waitlist** → бутонът за експорт горе вдясно → CSV.

---

## Бележки

- Сайтът е тъмен по подразбиране и е правен **първо за телефон** — повечето хора ще го отворят от Instagram.
- Секцията „Честно" изброява какво още го няма. Не я махай. Тя е причината хората да ти вярват.
- Линкът в Instagram bio-то трябва да сочи насам.
