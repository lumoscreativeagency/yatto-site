// ============================================================
//  ЯТО — общи неща за всички екрани
//  Без build стъпка. Всичко се зарежда направо в браузъра.
// ============================================================
// Библиотеката е сложена локално, не от чужд CDN — ако този CDN падне,
// приложението пада с него. Файлът се обновява ръчно, рядко.
import { createClient } from "./supabase.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const sb = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* ---------- дребни помощници ---------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Екранира текст, за да не може чужд текст да вкара HTML в страницата. */
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export function show(el, text, kind = "info") {
  if (!el) return;
  el.className = "msg on " + kind;
  el.textContent = text;
}
export function hide(el) { if (el) el.className = "msg"; }

const MONTHS = ["яну","фев","мар","апр","май","юни","юли","авг","сеп","окт","ное","дек"];

export function dayNum(iso) { return iso ? String(new Date(iso + "T00:00:00").getDate()) : "—"; }
export function monthShort(iso) { return iso ? MONTHS[new Date(iso + "T00:00:00").getMonth()] : ""; }

export function dateRange(a, b) {
  if (!a) return "";
  const d1 = new Date(a + "T00:00:00");
  if (!b || a === b) return `${d1.getDate()} ${MONTHS[d1.getMonth()]} ${d1.getFullYear()}`;
  const d2 = new Date(b + "T00:00:00");
  const sameMonth = d1.getMonth() === d2.getMonth();
  return sameMonth
    ? `${d1.getDate()}–${d2.getDate()} ${MONTHS[d2.getMonth()]} ${d2.getFullYear()}`
    : `${d1.getDate()} ${MONTHS[d1.getMonth()]} – ${d2.getDate()} ${MONTHS[d2.getMonth()]} ${d2.getFullYear()}`;
}

/** Колко дни остават. Отрицателно = минало. */
export function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00") - today) / 86400000);
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/** Чисти Instagram handle — приема "@ime", "ime" или цял линк. */
export function igHandle(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  const m = s.match(/instagram\.com\/([^/?#]+)/i);
  return (m ? m[1] : s).replace(/^@/, "").replace(/\/+$/, "");
}

/* ---------- вписване ---------- */

export async function currentUser() {
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data?.user ?? null;
}

export async function currentProfile() {
  const user = await currentUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ? { ...data, email: user.email } : { id: user.id, email: user.email };
}

/** Праща към вписване, ако още не е вписан. Връща профила, ако е. */
export async function requireAuth() {
  if (!configured) { renderNotConfigured(); return null; }
  const user = await currentUser();
  if (!user) {
    const back = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.replace(`login.html?next=${back}`);
    return null;
  }
  return await currentProfile();
}

export async function signOut() {
  await sb?.auth.signOut();
  location.href = "login.html";
}

/* ---------- когато базата още не е свързана ---------- */

export function renderNotConfigured() {
  const main = $("main .wrap") || $("main") || document.body;
  main.innerHTML = `
    <div class="setup">
      <h3 style="font-size:18px;margin-bottom:8px">Базата още не е свързана</h3>
      <p class="muted">Приложението е готово, но не знае към коя база да говори.
      Отвори <code>app/config.js</code> и попълни двете стойности от Supabase.
      Стъпките са в <code>app/README-app.md</code>.</p>
    </div>`;
}

/* ---------- заглавка и долна лента ---------- */

const ICONS = {
  home:  '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  comps: '<path d="M8 3v4M16 3v4"/><rect x="3" y="6" width="18" height="15" rx="2.5"/><path d="M3 11h18"/>',
  gyms:  '<path d="M4 9v6M20 9v6M7 6v12M17 6v12M7 12h10M2 11v2M22 11v2"/>',
  me:    '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c0-4 3.4-6.4 7.5-6.4s7.5 2.4 7.5 6.4"/>',
};

export function mountChrome({ title, active, back = null, profile = null }) {
  const head = $("header .bar");
  if (head) {
    head.innerHTML = `
      ${back ? `<a class="back" href="${back}" aria-label="Назад">‹</a>` : ""}
      <h1>${esc(title)}</h1>
      ${profile
        ? `<a class="avatar" href="profile.html" aria-label="Профил">${esc(initials(profile.name || profile.email))}</a>`
        : `<span style="width:36px"></span>`}
    `;
  }
  const tabs = $("nav.tabs");
  if (tabs) {
    const items = [
      ["index.html", "home", "Начало"],
      ["competitions.html", "comps", "Състезания"],
      ["gyms.html", "gyms", "Зали"],
      ["profile.html", "me", "Профил"],
    ];
    const brand = `
      <a class="brandmark" href="index.html" aria-label="ЯТО">
        <svg viewBox="0 0 44 44" fill="none" stroke="#F1FF00" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 19 L22 7 L36 19" stroke-width="4.6"/>
          <path d="M3 34 L10 27 L17 34" stroke-width="3.6" opacity=".5"/>
          <path d="M27 34 L34 27 L41 34" stroke-width="3.6" opacity=".5"/>
        </svg><b>Ято</b>
      </a>`;
    tabs.innerHTML = brand + items.map(([href, key, label]) => `
      <a href="${href}" class="${active === key ? "on" : ""}">
        <svg viewBox="0 0 24 24">${ICONS[key]}</svg>${label}
      </a>`).join("");
  }
}

/** Показва подсказка, ако профилът е празен — matching-ът зависи от него. */
export function profileNudge(profile) {
  if (!profile || (profile.name && profile.city && profile.instagram)) return "";
  return `
    <a class="card" href="profile.html" style="background:linear-gradient(150deg,rgba(241,255,0,.10),transparent 60%),var(--charcoal);border-color:rgba(241,255,0,.28)">
      <div class="ath">
        <div class="ava y">!</div>
        <div>
          <div class="nm">Профилът ти е празен</div>
          <div class="sub">Без име, град и Instagram никой не може да те намери за отбор.</div>
        </div>
      </div>
    </a>`;
}
