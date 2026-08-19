// ============================================================
//  ЯТО — общи неща за публичните страници на сайта
//  Само четене. Няма вписване тук — то е в /app/.
//  Преизползва библиотеката и ключа от приложението,
//  за да няма две места за поддържане.
// ============================================================
import { createClient } from "./app/supabase.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./app/config.js";

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const sb = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const MONTHS = ["яну","фев","мар","апр","май","юни","юли","авг","сеп","окт","ное","дек"];

export const dayNum = (iso) => iso ? String(new Date(iso + "T00:00:00").getDate()) : "—";
export const monthShort = (iso) => iso ? MONTHS[new Date(iso + "T00:00:00").getMonth()] : "";

export function dateRange(a, b) {
  if (!a) return "";
  const d1 = new Date(a + "T00:00:00");
  if (!b || a === b) return `${d1.getDate()} ${MONTHS[d1.getMonth()]} ${d1.getFullYear()}`;
  const d2 = new Date(b + "T00:00:00");
  return d1.getMonth() === d2.getMonth()
    ? `${d1.getDate()}–${d2.getDate()} ${MONTHS[d2.getMonth()]} ${d2.getFullYear()}`
    : `${d1.getDate()} ${MONTHS[d1.getMonth()]} – ${d2.getDate()} ${MONTHS[d2.getMonth()]} ${d2.getFullYear()}`;
}

export function daysUntil(iso) {
  if (!iso) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00") - t) / 86400000);
}

/** Слага aria-current на активната връзка в навигацията и футъра. */
export function markActive(file) {
  document.querySelectorAll(`.navlinks a, .fnav a`).forEach(a => {
    if (a.getAttribute("href") === file) a.setAttribute("aria-current", "page");
  });
}
