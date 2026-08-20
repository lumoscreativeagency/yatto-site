// ============================================================
//  ЯТО — движението на публичния сайт
//  Обикновен скрипт, не модул: index.html не е модул.
//  Зарежда се с defer, така че body го има.
//
//  Две правила, които държат това честно:
//
//  1. Ако скриптът не се зареди, НИЩО не изчезва. Класът, който
//     крие елемента, се слага само оттук. Без JavaScript сайтът
//     е просто сайт без анимация — не празна страница.
//
//  2. Веднъж показано си остава показано. Първата версия ползваше
//     IntersectionObserver и при бърз скрол пропускаше елементи —
//     оставаха невидими завинаги. Сега на всеки кадър се проверява
//     дали елементът е минал линията, и това не може да се изпусне.
// ============================================================

(function () {
  const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const RISE = [
    "section > .wrap > .eye", "section > .wrap > h2", "section > .wrap > p",
    ".grid > *", ".fgrid > *", ".plist .pitem",
    ".honest", ".form", ".rowcard", ".blank",
    ".pagehead .eye", ".pagehead h1", ".pagehead p",
  ].join(",");

  const watched = new Set();
  const risen = new WeakSet();

  function scan(root) {
    const found = (root || document).querySelectorAll ? (root || document).querySelectorAll(RISE) : [];
    for (const el of found) {
      if (el.dataset.m) continue;
      el.dataset.m = "1";
      // Каквото е на екрана при зареждане, не се крие — иначе
      // първото, което човек вижда, е празнота.
      const above = el.getBoundingClientRect().top < innerHeight * 0.92;
      if (!CALM && !above) {
        el.setAttribute("data-rise", "");
        const n = [].indexOf.call(el.parentElement.children, el) % 4;
        if (n) el.classList.add("d" + n);
      }
      watched.add(el);
    }
    update();
  }

  let queued = false;
  function update() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const H = innerHeight;
      for (const el of watched) {
        const r = el.getBoundingClientRect();

        // Показване: щом е минал линията. Дори да си прескочил
        // половината страница наведнъж, всичко над теб е показано.
        if (!risen.has(el) && r.top < H * 0.92) {
          risen.add(el);
          el.classList.add("in");
        }

        // Контурът се върти само докато елементът е на екрана.
        // Извън него анимацията спира — иначе на телефон двайсет
        // въртящи се ръба ядат батерия за нищо.
        const near = r.bottom > -120 && r.top < H + 120;
        el.classList.toggle("vis", near);
        if (risen.has(el) && !near && r.bottom < -1200) watched.delete(el);
      }
    });
  }

  scan(document);
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update, { passive: true });

  // Редовете за състезания и зали идват от базата след първото рисуване.
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) scan(n.parentElement || n);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Заглавната лента се сгъстява, щом тръгнеш надолу.
  const nav = document.querySelector("nav");
  if (nav) {
    const stick = () => nav.classList.toggle("stuck", scrollY > 12);
    addEventListener("scroll", stick, { passive: true });
    stick();
  }
})();
