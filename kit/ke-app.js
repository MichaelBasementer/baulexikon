// KE App-Grundgerüst – shared behaviour of the KE app family.
// Load in <head> WITHOUT defer, after ke-icons.js, so the stored light/dark choice applies before the first paint:
//   <script src="kit/ke-icons.js"></script><script src="kit/ke-app.js"></script>
// Then, from the app script:  KE.start({ app: "stempeluhr", version: "2.0.0", eigene: () => [...] })
(function () {
  "use strict";
  const doc = document, html = doc.documentElement;
  const IMPRESSUM = "https://kellerer-engineering.de/impressum.html";
  const DATENSCHUTZ = "https://kellerer-engineering.de/datenschutz.html";
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const speicher = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: the choice just isn't kept */ } }
  };
  const ruhig = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Symbols: straight lines, square ends and corners like the KE logo ----------
  const PFADE = {
    heute: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>',
    kalender: '<path d="M3.5 5.5h17v15h-17zM3.5 10h17M8 3v4.5M16 3v4.5"/>',
    ueberstunden: '<path d="M3 20.5h18M6 20.5v-7M11 20.5v-11M16 20.5V7"/><path d="M14 9l2-2 2 2"/>',
    start: '<path d="M3.5 11L12 4l8.5 7M5.5 9.5v11h13v-11M10 20.5v-6h4v6"/>',
    themen: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    merkliste: '<path d="M6 3.5h12v17l-6-4.5-6 4.5z"/>',
    quellen: '<path d="M6 3.5h8.5l3.5 3.5v13.5H6zM14.5 3.5V7H18M9 11.5h6M9 15h6"/>',
    proben: '<path d="M4 4h16v16H4zM9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>',
    mischproben: '<path d="M9 3.5v6l-5 11h16l-5-11v-6M7.5 3.5h9M6.5 15h11"/>',
    herleitung: '<path d="M17.5 4.5h-11l6 7.5-6 7.5h11"/>',
    pruefen: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5"/><path d="M7.5 10.5l2 2 3.5-3.5"/>',
    suche: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    merken: '<path d="M6 3.5h12v17l-6-4.5-6 4.5z"/>'
  };
  const MENUE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="10.6" y="3.6" width="2.8" height="2.8"/><rect x="10.6" y="10.6" width="2.8" height="2.8"/><rect x="10.6" y="17.6" width="2.8" height="2.8"/></svg>';
  function symbol(name, gefuellt) {
    if (name === "menue") return MENUE;
    return `<svg viewBox="0 0 24 24" fill="${gefuellt ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${PFADE[name] || ""}</svg>`;
  }

  // ---------- Light / dark: "system" follows the phone, or fixed by the in-app switch ----------
  const DARSTELLUNG = "ke-darstellung";
  const darstellung = {
    get() { const m = speicher.get(DARSTELLUNG); return m === "hell" || m === "dunkel" ? m : "system"; },
    set(m) { speicher.set(DARSTELLUNG, m); darstellung.anwenden(); },
    anwenden() {
      const m = darstellung.get();
      if (m === "system") delete html.dataset.theme; else html.dataset.theme = m;
      const meta = doc.querySelector('meta[name="theme-color"]');
      if (meta) {
        const dunkel = m === "dunkel" || (m === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
        meta.setAttribute("content", dunkel ? "#0a0e13" : "#ffffff");
      }
    }
  };
  darstellung.anwenden();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", darstellung.anwenden);

  // ---------- KE logo "Konstruktion" ----------
  function logo(klein) {
    const g = (c, d) => `<path class="${c}" d="${d}" pathLength="1"/>`;
    return `<svg class="ke-logo${klein ? " ke-logo--klein" : ""}" viewBox="0 0 96 96" aria-hidden="true">` +
      `<g class="hilfe">${g("g1", "M-8 12H104")}${g("g2", "M-8 48H104")}${g("g3", "M-8 84H104")}${g("g4", "M12 -8V104")}${g("g5", "M56 -8V104")}${g("g6", "M84 -8V104")}</g>` +
      `<g class="k">${g("kv", "M12 12V84")}${g("ko", "M12 48L46 12")}${g("ku", "M12 48L46 84")}</g>` +
      `<g class="e">${g("em", "M12 48H84")}${g("eo", "M56 12H84")}${g("eu", "M56 84H84")}</g></svg>`;
  }
  function spielen(svg) { svg.classList.remove("spielt"); void svg.getBoundingClientRect(); svg.classList.add("spielt"); }

  // Loading indicator: the logo draws itself in a loop. Returns a function that removes it.
  function laden(ziel, text) {
    const el = doc.createElement("div");
    el.className = "ke-laden";
    el.setAttribute("role", "status");
    el.innerHTML = logo(false) + (text ? `<span>${esc(text)}</span>` : "");
    ziel.appendChild(el);
    const svg = el.querySelector("svg");
    let t = 0;
    const runde = () => { spielen(svg); t = setTimeout(runde, 2200); };
    if (!ruhig()) runde();
    return () => { clearTimeout(t); el.remove(); };
  }

  // Start screen: once per day on the first open, then the app appears. Tap skips it.
  const START_TAG = "ke-start-tag";
  function startbild(name) {
    const d = new Date(), heute = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (speicher.get(START_TAG) === heute || ruhig()) return;
    speicher.set(START_TAG, heute);
    const el = doc.createElement("div");
    el.className = "ke-start";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = logo(false) + `<span class="ke-start__name">${esc(name)}<small>Kellerer Engineering</small></span>`;
    doc.body.appendChild(el);
    spielen(el.querySelector("svg"));
    let fertig = false;
    const weg = () => { if (fertig) return; fertig = true; el.classList.add("ke-start--weg"); setTimeout(() => el.remove(), 240); };
    el.addEventListener("click", weg);
    setTimeout(weg, 2000);
  }

  // ---------- Sheet from below ----------
  function blatt(inhalt, opts = {}) {
    const vorher = doc.activeElement;
    const s = doc.createElement("div");
    s.className = "ke-schleier";
    s.innerHTML = `<div class="ke-blatt" role="dialog" aria-modal="true" aria-label="${esc(opts.label || "Dialog")}">${inhalt}</div>`;
    doc.body.appendChild(s);
    const b = s.firstElementChild;
    const zu = () => {
      if (!s.isConnected) return;
      s.remove(); doc.removeEventListener("keydown", taste);
      if (vorher && vorher.focus) vorher.focus();
      if (opts.onClose) opts.onClose();
    };
    const taste = e => { if (e.key === "Escape") zu(); };
    s.addEventListener("click", e => { if (e.target === s) zu(); });
    doc.addEventListener("keydown", taste);
    // Focus the sheet itself: screen readers land in the dialog, and no button shows a focus ring on open.
    b.tabIndex = -1;
    b.focus({ preventScroll: true });
    return { el: b, zu };
  }

  function toast(text, ms = 2600) {
    doc.querySelectorAll(".ke-toast").forEach(t => t.remove());
    const t = doc.createElement("div");
    t.className = "ke-toast"; t.setAttribute("role", "status"); t.textContent = text;
    doc.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  // ---------- Menu: app's own rows, then light/dark, all KE apps, version, legal ----------
  let cfg = { app: "", version: "", eigene: () => [] };
  function menue() {
    const eigene = (cfg.eigene && cfg.eigene()) || [];
    const m = darstellung.get();
    const wahl = [["system", "Wie das Handy"], ["hell", "Hell"], ["dunkel", "Dunkel"]];
    const icons = window.KE_ICONS;
    const apps = icons ? Object.entries(icons.APPS).filter(([id, a]) => a.online || id === cfg.app) : [];
    const zeile = (e, i) => e.href
      ? `<a class="ke-z ke-z--tipp" href="${esc(e.href)}"${e.extern ? ' target="_blank" rel="noopener"' : ""}><span>${esc(e.label)}</span><span class="ke-z__w"><b>${esc(e.wert || "")}</b></span></a>`
      : `<button type="button" class="ke-z ke-z--tipp" data-eigen="${i}"><span>${esc(e.label)}</span><span class="ke-z__w"><b>${esc(e.wert || "")}</b></span></button>`;
    const { el, zu } = blatt(`
      ${eigene.length ? `<div class="ke-zeilen">${eigene.map(zeile).join("")}</div>` : ""}
      <div class="ke-blatt__kz"><h2>Darstellung</h2><span>Version ${esc(cfg.version)}</span></div>
      <div class="ke-zeilen" role="radiogroup" aria-label="Darstellung">${wahl.map(([k, l]) =>
        `<button type="button" class="ke-z ke-z--klein" role="radio" aria-checked="${m === k}" data-modus="${k}"><span>${l}</span><span class="ke-box${m === k ? " ke-box--an" : ""}"></span></button>`).join("")}</div>
      ${apps.length > 1 ? `<div class="ke-blatt__kz"><h3>Alle KE-Apps</h3></div>
      <div class="ke-apps">${apps.map(([id, a]) => `<a href="${a.url}"${id === cfg.app ? ' aria-current="true"' : ""}>${icons.svg(id)}${esc(a.name)}</a>`).join("")}</div>` : ""}
      <div class="ke-zeilen">
        <a class="ke-z ke-z--tipp" href="${IMPRESSUM}" target="_blank" rel="noopener"><span>Impressum</span><span class="ke-z__w"><b></b></span></a>
        <a class="ke-z ke-z--tipp" href="${DATENSCHUTZ}" target="_blank" rel="noopener"><span>Datenschutz</span><span class="ke-z__w"><b></b></span></a>
      </div>
      <button type="button" class="ke-knopf ke-knopf--zweit" data-zu>Schließen</button>`, { label: "Menü" });
    el.querySelectorAll("[data-modus]").forEach(b => b.onclick = () => {
      darstellung.set(b.dataset.modus);
      el.querySelectorAll("[data-modus]").forEach(x => {
        const an = x === b;
        x.setAttribute("aria-checked", an);
        x.querySelector(".ke-box").classList.toggle("ke-box--an", an);
      });
    });
    el.querySelectorAll("[data-eigen]").forEach(b => b.onclick = () => { zu(); const f = eigene[+b.dataset.eigen].onClick; if (f) f(); });
    el.querySelector("[data-zu]").onclick = zu;
  }

  function start(c) {
    cfg = Object.assign(cfg, c);
    doc.querySelectorAll("[data-ke-menue]").forEach(b => {
      if (!b.innerHTML.trim()) b.innerHTML = MENUE;
      b.setAttribute("aria-label", "Menü");
      b.addEventListener("click", menue);
    });
    const name = c.name || (window.KE_ICONS && window.KE_ICONS.APPS[c.app] && window.KE_ICONS.APPS[c.app].name) || "";
    if (c.startbild !== false) startbild(name);
  }

  window.KE = { start, menue, blatt, toast, laden, logo, spielen, startbild, symbol, darstellung, esc };
})();
