// Baulexikon: hash router and views. All content comes from data/*.json.
const FILES = ["kapitel", "bauteile", "erkennung", "materialien", "schadstoffe", "regeln", "avv", "tabellen", "laender", "quellen", "wandel", "bilder"];
const STALE_DAYS = 180;
// Only under /werkzeuge/ on the website does the KE AbfallCheck sit next to this app.
const IM_WERKZEUG = location.pathname.includes("/werkzeuge/baulexikon/");
const pruefen = () => IM_WERKZEUG ? `<a class="link" href="../abfallcheck/index.html">Im KE AbfallCheck prüfen</a>` : "";
const STORE = "baulexikon-v1";
const D = {};
let index = [];
const view = document.getElementById("view"), hdr = document.getElementById("hdr");

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const byId = (list, id) => list.find(x => x.id === id);
const fmtDate = iso => iso ? iso.split("-").reverse().join(".") : "";
const fmtNum = n => n.toLocaleString("de-DE", { maximumFractionDigits: 6 });

// Tables keep the law's own notation in s; country values are built from the number.
function fmtWert(w) {
  if (!w) return "–";
  if (w.text) return w.text;
  if (w.s) return w.s;
  if (w.von != null) return `${fmtNum(w.von)}–${fmtNum(w.bis)}`;
  return `${w.op ? w.op + " " : ""}${fmtNum(w.zahl)}`;
}
const sup = fn => fn ? `<sup>${esc(fn)}</sup>` : "";

// Favourites and recently viewed only; nothing leaves the device. The website edition stores nothing.
function loadStore() {
  if (IM_WERKZEUG) return { fav: [], recent: [] };
  try { return { fav: [], recent: [], ...JSON.parse(localStorage.getItem(STORE)) }; }
  catch { return { fav: [], recent: [] }; }
}
const saveStore = s => { if (!IM_WERKZEUG) localStorage.setItem(STORE, JSON.stringify(s)); };
function remember(entry) {
  const s = loadStore();
  s.recent = [entry.route, ...s.recent.filter(r => r !== entry.route)].slice(0, 12);
  saveStore(s);
}

function isStale(iso) {
  return !iso || (Date.now() - new Date(iso)) / 864e5 > STALE_DAYS;
}
function statusTag(q) {
  if (q.status === "entwurf") return `<span class="tag warn">Entwurf</span>`;
  if (q.status !== "geprueft") return `<span class="tag warn">ungeprüft</span>`;
  if (isStale(q.geprueft)) return `<span class="tag warn">Prüfung überfällig</span>`;
  return `<span class="tag ok">geprüft ${fmtDate(q.geprueft)}</span>`;
}
function srcLine(id, extra = "") {
  const q = byId(D.quellen, id);
  return `<p class="src"><a class="link" href="#/q/${q.id}">${esc(q.kurz)}</a>${extra ? ` · ${esc(extra)}` : ""} · Stand ${esc(q.fassung)} ${statusTag(q)}</p>`;
}

const row = (href, titel, sub, right = "<i>›</i>") =>
  `<a class="item" href="${href}"><span>${esc(titel)}${sub ? `<small>${esc(sub)}</small>` : ""}</span>${right}</a>`;
const avvTag = a => a.gefaehrlich ? `<span class="tag bad">gefährlich</span>` : `<span class="tag ok">nicht gefährlich</span>`;
const paras = list => (list || []).map(p => `<p>${esc(p)}</p>`).join("");
const hRow = (titel, html) => html ? `<div class="section-h">${esc(titel)}</div>${html}` : "";

const FAV_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4h12v17l-6-4-6 4z"/></svg>`;
function head(titel, sub, opts = {}) {
  const fav = opts.route ? loadStore().fav.includes(opts.route) : false;
  const merken = opts.route && !IM_WERKZEUG;
  const zurueck = opts.back && !(IM_WERKZEUG && opts.back === "#/themen"); // The sidebar replaces the Themen page.
  hdr.innerHTML = (zurueck ? `<a class="icon-btn" href="${opts.back}" aria-label="Zurück">‹</a>` : "") +
    `<div class="ttl"><h1>${esc(titel)}</h1><small>${esc(sub || "")}</small></div>` +
    (merken ? `<button class="icon-btn" id="fav" aria-label="Merken" aria-pressed="${fav}">${FAV_ICON}</button>` : "");
  if (merken) document.getElementById("fav").onclick = e => {
    const s = loadStore(), on = !s.fav.includes(opts.route);
    s.fav = on ? [opts.route, ...s.fav] : s.fav.filter(r => r !== opts.route);
    saveStore(s);
    e.currentTarget.setAttribute("aria-pressed", on);
  };
}

const GRUPPEN = { A: "Decken", B: "Fußböden", "B+": "Bodenbeläge", C: "Wände innen", D: "Wände außen", E: "Dächer", F: "Bodenplatten und Keller", G: "Abgehängte Decken und Bekleidungen", H: "Technik und Fugen" };
// CC licences ask for a link to the licence text next to the credit.
const LIZENZ = { "CC BY-SA 2.0": "by-sa/2.0/", "CC BY-SA 3.0": "by-sa/3.0/", "CC BY-SA 3.0 de": "by-sa/3.0/de/", "CC BY-SA 4.0": "by-sa/4.0/", "CC BY 3.0": "by/3.0/", "CC BY 4.0": "by/4.0/" };
const lizenz = l => LIZENZ[l] ? `<a href="https://creativecommons.org/licenses/${LIZENZ[l]}" target="_blank" rel="noopener">${esc(l)}</a>` : esc(l);
const foto = b => `<figure class="foto"><img src="img/fotos/${esc(b.datei)}" alt="${esc(b.titel)}" loading="lazy"><figcaption><a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.titel)}</a> · ${esc(b.urheber)} · ${lizenz(b.lizenz)}</figcaption></figure>`;
// One photo stands alone; several become a swipe row with position dots.
function galerie(ids) {
  const list = (ids || []).map(id => byId(D.bilder, id)).filter(Boolean);
  if (list.length < 2) return list.map(foto).join("");
  return `<div class="galerie" tabindex="0" aria-label="${list.length} Fotos, seitlich wischen">${list.map(foto).join("")}</div><div class="dots">${list.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>`;
}
function wireGalerie() {
  view.querySelectorAll(".galerie").forEach(g => g.addEventListener("scroll", () => {
    const i = Math.round(g.scrollLeft / g.clientWidth);
    [...g.nextElementSibling.children].forEach((d, k) => d.classList.toggle("on", k === i));
  }, { passive: true }));
}
const schadTags = ids => (ids || []).map(s => { const x = byId(D.schadstoffe, s); return `<a class="tag warn" href="#/s/${x.id}">${esc(x.titel)} ›</a>`; }).join("");

/* ---------- Search index ---------- */
function buildEntries() {
  const e = [];
  const add = (titel, sub, stichworte, route, kind) => e.push({ titel, sub, stichworte, route, kind });
  D.bauteile.forEach(b => add(b.titel, `${GRUPPEN[b.gruppe]} · ${b.bauzeit}`, [b.alias, b.stichworte, ...b.schichten.map(s => s[0]), b.erkennen].join(" "), `#/b/${b.id}`));
  D.materialien.forEach(m => add(m.titel, `Material · ${m.sub || ""}`, m.text.join(" "), `#/m/${m.id}`));
  D.schadstoffe.forEach(s => add(s.titel, "Schadstoff", [s.stichworte, ...(s.fundorte || [])].join(" "), `#/s/${s.id}`));
  D.regeln.forEach(r => add(r.titel, `Regelwerk · ${r.sub || ""}`, r.stichworte, `#/r/${r.id}`));
  D.avv.forEach(a => add(`${a.code} ${a.titel}`, `AVV-Schlüssel · ${a.gefaehrlich ? "gefährlich" : "nicht gefährlich"}`, a.stichworte, `#/a/${a.code.replace(/\D/g, "")}`));
  D.tabellen.forEach(t => add(t.titel, `Grenzwerte · ${t.sub}`, t.stichworte, `#/t/${t.id}`));
  D.laender.laender.forEach(l => add(l.name, "Länderregeln", l.stichworte, `#/l/${l.id}`));
  return e;
}

/* ---------- Views ---------- */
const SEARCH = `<div class="search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="17 06 05, Flexplatte, PAK …" aria-label="Suche" autocomplete="off"></div>`;

const trefferListe = text => Search.find(index, text).map(h => row(h.route, h.titel, h.sub)).join("") || `<p class="item">Kein Treffer</p>`;

function start() {
  head(IM_WERKZEUG ? "KE Baulexikon" : "Baulexikon", "Nachschlagen für Bestand und Rückbau");
  const offen = D.wandel.length;
  view.innerHTML = (IM_WERKZEUG ? "" : SEARCH + `<div id="res" class="panel" hidden></div>`) + `<div id="home" class="tiles">` +
    D.kapitel.map(k => `<a class="tile" href="${k.route}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${k.icon}</svg><b>${esc(k.titel)}</b><span>${esc(k.kurz)}</span></a>`).join("") +
    `<a class="tile" href="#/quellen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><b>Im Wandel</b><span>${offen} offene Änderungen</span></a></div>`;
  const q = document.getElementById("q"), res = document.getElementById("res"), home = document.getElementById("home");
  if (IM_WERKZEUG) {
    home.insertAdjacentHTML("afterbegin", `<a class="tile" href="../abfallcheck/index.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3"/></svg><b>KE AbfallCheck</b><span>Einstufung und Grenzwerte</span></a>`);
    return; // The search sits in the sidebar there.
  }
  q.addEventListener("input", () => {
    const on = !!q.value.trim();
    home.hidden = on; res.hidden = !on;
    res.innerHTML = trefferListe(q.value);
  });
}

/* ---------- Website edition: site header, sidebar, footer around the same views ---------- */
function webRahmen() {
  const app = document.querySelector(".app");
  const kapitelLinks = D.kapitel.map(k => `<a href="${k.route}" data-k="${k.id}">${esc(k.titel)}</a>`).join("");
  const raum = document.createElement("div");
  raum.className = "web-raum breite";
  raum.innerHTML = `<aside class="web-leiste">
      <a class="web-marke" href="#/">KE Baulexikon</a>
      ${SEARCH}
      <details class="web-kapitel" id="kapitelwahl"><summary>Kapitel</summary><nav aria-label="Kapitel">
        ${kapitelLinks}
        <a href="#/quellen" data-k="quellen">Quellen</a>
        <a class="trenner" href="../abfallcheck/index.html">KE AbfallCheck</a>
        <a href="../index.html">← Werkzeuge</a>
      </nav></details>
    </aside>`;
  app.replaceWith(raum);
  raum.append(app);
  document.body.insertAdjacentHTML("afterbegin", `<header class="kopf"><nav class="breite" aria-label="Hauptnavigation">
    <a class="marke" href="../../index.html"><svg viewBox="0 0 96 96" aria-hidden="true"><path d="M12 12V84M12 48L46 12M12 48L46 84" stroke="#e9eef3"/><path d="M12 48H84M56 12H84M56 84H84" stroke="#8fd3ff"/></svg>KELLERER ENGINEERING</a>
    <div><a href="../../index.html#software">Software</a><a href="../index.html" aria-current="page">Werkzeuge</a><a href="../../index.html#kontakt">Kontakt</a></div>
  </nav></header>`);
  raum.insertAdjacentHTML("afterend", `<footer class="fuss"><div class="breite"><span>© 2026 Michael Kellerer</span>
    <nav aria-label="Rechtliches"><a href="../../impressum.html">Impressum</a><a href="../../datenschutz.html">Datenschutz</a></nav></div></footer>`);

  const wahl = document.getElementById("kapitelwahl"), breit = matchMedia("(min-width:900px)");
  const passeAn = () => { wahl.open = breit.matches; };
  breit.addEventListener("change", passeAn);
  passeAn();
  wahl.addEventListener("click", e => { if (e.target.closest("a") && !breit.matches) wahl.open = false; });

  const q = document.getElementById("q");
  q.addEventListener("input", () => {
    if (!q.value.trim()) return route();
    head("Suche", q.value.trim());
    view.innerHTML = `<div class="panel">${trefferListe(q.value)}</div>`;
  });
}
const WEB_KAPITEL = { b: "bauteile", m: "bauteile", s: "schadstoffe", t: "abfall", a: "abfall", l: "laender", q: "quellen" };
function webAktiv(h) {
  document.getElementById("q").value = "";
  const r = h.match(/^#\/(\w+)(?:\/([\w-]+))?$/) || [];
  let k = r[1] === "k" ? r[2] : WEB_KAPITEL[r[1]];
  if (r[1] === "quellen" || r[1] === "bilder") k = "quellen";
  if (r[1] === "erkennen") k = "bauteile";
  if (r[1] === "r") {
    const bereich = (byId(D.regeln, r[2]) || {}).bereich;
    k = bereich === "bauteil" ? "bauteile" : bereich === "abfall" ? "abfall" : "regeln";
  }
  document.querySelectorAll(".web-kapitel a[data-k]").forEach(a => a.dataset.k === k ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
}

function themen() {
  head("Themen", "Alle Kapitel");
  view.innerHTML = `<div class="panel">` + D.kapitel.map(k => row(k.route, k.titel, k.lang)).join("") + `</div>`;
}

function kapitel(id) {
  const k = byId(D.kapitel, id);
  if (!k) return notFound();
  head(k.titel, k.kurz, { back: "#/themen" });
  const lists = {
    schadstoffe: () => D.schadstoffe.map(s => row(`#/s/${s.id}`, s.titel, s.kurz)),
    regeln: () => D.regeln.filter(r => r.bereich === "arbeitsschutz").map(r => row(`#/r/${r.id}`, r.titel, r.sub)),
    laender: () => D.laender.laender.map(l => row(`#/l/${l.id}`, l.name, l.ausbau ? "voll ausgearbeitet" : "Linkliste")),
  };
  if (id === "abfall") {
    view.innerHTML = hRow("Grundlagen", `<div class="panel">${D.regeln.filter(r => r.bereich === "abfall").map(r => row(`#/r/${r.id}`, r.titel, r.sub)).join("")}</div>`) +
      hRow("Grenzwerttabellen", `<div class="panel">${D.tabellen.filter(t => !t.gruppe).map(t => row(`#/t/${t.id}`, t.titel, t.sub)).join("")}</div>`) +
      hRow("AVV Kapitel 17", `<div class="panel">${D.avv.map(a => row(`#/a/${a.code.replace(/\D/g, "")}`, a.code, a.titel, avvTag(a))).join("")}</div>`);
    return;
  }
  if (id === "bauteile") {
    view.innerHTML = `<a class="card" href="#/erkennen"><h2>Schnell erkennen</h2><p>Was ist das für eine Decke?</p></a><a class="card" href="#/r/kernbohrung"><h2>Kernbohrungen</h2><p>Was der Bohrkern verrät, und worauf vorher zu achten ist</p></a>` +
      Object.entries(GRUPPEN).map(([g, t]) => hRow(t, `<div class="panel">${D.bauteile.filter(b => b.gruppe === g).map(b => row(`#/b/${b.id}`, b.titel, b.bauzeit)).join("")}</div>`)).join("") +
      hRow("Materialien", `<div class="panel">${D.materialien.map(m => row(`#/m/${m.id}`, m.titel, m.sub)).join("")}</div>`);
    return;
  }
  view.innerHTML = `<div class="panel">${lists[id]().join("") || `<p class="item">Noch keine Einträge</p>`}</div>`;
}

function erkennen() {
  head("Schnell erkennen", "Was ist das für eine Decke?", { back: "#/k/bauteile" });
  view.innerHTML = `<div class="section-h">Beobachtung an Untersicht / beim Bohren</div><div class="panel">` +
    D.erkennung.map(e => { const b = byId(D.bauteile, e.bauteil); return row(`#/b/${b.id}`, e.beobachtung, `Wahrscheinlich: ${b.titel}`); }).join("") + `</div>`;
}

async function bauteil(id) {
  const b = byId(D.bauteile, id), route = `#/b/${id}`;
  if (!b) return notFound();
  head(b.titel, b.alias, { back: "#/k/bauteile", route });
  remember({ route });
  const sch = schadTags(b.schadstoffe), schnitt = b.richtung !== "belag";
  const skizze = schnitt ? `<div class="card section" id="schnitt"></div>` : "";
  const texte = `${b.schichten.length ? `<ul class="panel layers">${b.schichten.map((s, i) => `<li><span class="n">${i + 1}</span><span>${esc(s[0])}</span><span class="num">${esc(s[1])}</span></li>`).join("")}</ul>` : ""}
    <div class="card"><h2>Erkennen</h2><p>${esc(b.erkennen)}</p></div>
    <div class="card alert"><h2>Schadstoffverdacht</h2><p>${esc(b.verdacht)}</p>${sch ? `<div class="tags">${sch}</div>` : ""}</div>`;
  view.innerHTML = `<div class="tags"><span class="tag">${esc(b.bauzeit)}</span>${b.dicke ? `<span class="tag">${esc(b.dicke)}</span>` : ""}</div>
    ${IM_WERKZEUG ? `<div class="web-zwei"><div>${texte}</div><div>${skizze}${galerie(b.fotos)}</div></div>` : `${skizze}${texte}${galerie(b.fotos)}`}
    ${pruefen()}
    ${srcLine(b.quelle || "atlas", "Bandbreiten, keine Planungswerte. Ein Verdacht ersetzt keine Probenahme.")}
    ${(b.belege || []).map(q => srcLine(q)).join("")}`;
  wireGalerie();
  // Inlined so the drawing can use the light/dark CSS variables.
  if (schnitt) {
    const svg = await fetch(`img/schnitte/${b.id}.svg`).then(r => r.text());
    const box = document.getElementById("schnitt");
    if (box) box.innerHTML = svg;
  }
}

function schadstoff(id) {
  const s = byId(D.schadstoffe, id), route = `#/s/${id}`;
  if (!s) return notFound();
  head(s.titel, "Gebäudeschadstoff", { back: "#/k/schadstoffe", route });
  remember({ route });
  const werte = D.laender.werte.filter(w => w.schadstoff === id);
  const avv = (s.avv || []).map(c => D.avv.find(a => a.code === c)).filter(Boolean);
  const regeln = (s.regeln || []).map(r => byId(D.regeln, r)).filter(Boolean);
  const vor = D.bauteile.filter(b => b.schadstoffe.includes(id));
  view.innerHTML = `<div class="card"><h2>Wo typisch?</h2><ul>${s.fundorte.map(f => `<li>${esc(f)}</li>`).join("")}</ul></div>
    ${s.text ? `<div class="card">${paras(s.text)}</div>` : ""}
    ${hRow("Gefährlicher Abfall ab", werte.length ? `<div class="panel">${laenderRows(werte)}</div>${[...new Set(werte.map(w => w.quelle))].map(q => srcLine(q)).join("")}` : "")}
    ${hinweisCards(D.laender.hinweise.filter(h => h.schadstoff === id))}
    ${hRow("AVV-Schlüssel", avv.length ? `<div class="panel">${avv.map(a => row(`#/a/${a.code.replace(/\D/g, "")}`, a.code, a.titel, avvTag(a))).join("")}</div>` : "")}
    ${hRow("Arbeitsschutz", regeln.length ? `<div class="panel">${regeln.map(r => row(`#/r/${r.id}`, r.titel, r.sub)).join("")}</div>` : "")}
    ${hRow("Kommt vor in", vor.length ? `<div class="panel">${vor.map(b => row(`#/b/${b.id}`, b.titel, GRUPPEN[b.gruppe])).join("")}</div>` : "")}
    ${pruefen()}
    ${srcLine(s.quelle, "Orientierung. Ein Verdacht ersetzt keine Probenahme.")}
    ${(s.belege || []).map(q => srcLine(q)).join("")}`;
}

// Values of an unverified source are never displayed, only the state.
function laenderRows(werte) {
  return werte.map(w => {
    const land = byId(D.laender.laender, w.land), q = byId(D.quellen, w.quelle);
    const right = q.status !== "geprueft" ? `<span class="tag warn">ungeprüft</span>` : w.text ? `<span class="tag">${esc(w.text)}</span>` : `<span class="num">${esc(fmtWert(w))} ${esc(w.einheit)}</span>`;
    return `<a class="item" href="#/l/${land.id}"><span>${esc(land.name)}, ${esc(w.material)}<small>${esc(w.bezug)}</small></span>${right}</a>`;
  }).join("");
}

const hinweisCards = list => list.map(h => `<div class="card alert"><h2>${esc(h.titel)}</h2>${paras(h.text)}</div>${srcLine(h.quelle, h.fundstelle)}`).join("");

function regel(id) {
  const r = byId(D.regeln, id), route = `#/r/${id}`;
  if (!r) return notFound();
  head(r.titel, r.sub, { back: { abfall: "#/k/abfall", bauteil: "#/k/bauteile" }[r.bereich] || "#/k/regeln", route });
  remember({ route });
  const tabs = [...(r.tabellen || []).map(t => byId(D.tabellen, t)), ...D.tabellen.filter(t => r.gruppe && t.gruppe === r.gruppe)].filter(Boolean);
  view.innerHTML = `${galerie(r.fotos)}<div class="card">${paras(r.text)}</div>
    ${hRow("Grenzwerttabellen", tabs.length ? `<div class="panel">${tabs.map(t => row(`#/t/${t.id}`, t.titel, t.sub)).join("")}</div>` : "")}
    ${srcLine(r.quelle)}
    ${(r.belege || []).map(q => srcLine(q)).join("")}`;
  wireGalerie();
}

function avv(code) {
  const a = D.avv.find(x => x.code.replace(/\D/g, "") === code), route = `#/a/${code}`;
  if (!a) return notFound();
  head(a.code, "AVV-Schlüssel", { back: "#/k/abfall", route });
  remember({ route });
  const m = a.spiegel ? D.avv.find(x => x.code === a.spiegel) : null;
  const sch = D.schadstoffe.filter(s => (s.avv || []).includes(a.code));
  view.innerHTML = `<div class="card"><h2>${esc(a.titel)}</h2><div class="tags">${avvTag(a)}</div></div>
    ${a.text ? `<div class="card">${paras(a.text)}</div>` : ""}
    ${hRow("Spiegeleintrag", m ? `<div class="panel">${row(`#/a/${m.code.replace(/\D/g, "")}`, m.code, m.titel, avvTag(m))}</div>` : "")}
    ${hRow("Schadstoffe", sch.length ? `<div class="panel">${sch.map(s => row(`#/s/${s.id}`, s.titel)).join("")}</div>` : "")}
    ${srcLine(a.quelle)}`;
}

const picks = {};
function tabelle(id) {
  const t = byId(D.tabellen, id), route = `#/t/${id}`;
  if (!t) return notFound();
  const pick = IM_WERKZEUG ? t.spalten.map((_, i) => i) : picks[id] ||= t.start;
  head(t.titel, t.sub, { back: "#/k/abfall", route });
  remember({ route });
  const shown = pick.slice().sort((a, b) => a - b);
  const wahl = IM_WERKZEUG ? "" : `<div class="section-h">${t.gruppe ? "Bis drei Spalten vergleichen" : "Bis drei Klassen vergleichen"}</div>
    <div class="chips">${t.spalten.map((c, i) => `<button class="chip" data-c="${i}" aria-pressed="${pick.includes(i)}">${esc(c)}</button>`).join("")}</div>`;
  view.innerHTML = `${wahl}
    <div class="tablewrap"><table><thead><tr><th>${t.gruppe ? "Einbauweise" : "Parameter"}</th>${shown.map(i => `<th>${esc(t.spalten[i])}</th>`).join("")}</tr></thead>
    <tbody>${t.zeilen.map(z => `<tr><td>${z.link ? `<a class="link" href="${esc(z.link)}">${esc(z.parameter)} ›</a>` : esc(z.parameter)}${sup(z.fn)}<small>${esc(z.einheit)}</small></td>${shown.map(i => { const w = z.werte[i], v = `${esc(fmtWert(w))}${sup(w && w.fn)}`; const sym = w && { "+": " ja", "–": " nein" }[w.text] || ""; return `<td class="${w && w.text ? "txt" : "num"}${sym}">${z.link && w && w.text ? `<a class="link" href="${esc(z.link)}">${v} ›</a>` : v}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
    ${t.fussnoten.length ? `<details class="card"><summary>Fußnoten</summary>${t.fussnoten.map(f => `<p>${esc(f)}</p>`).join("")}</details>` : ""}
    ${srcLine(t.quelle, t.fundstelle)}`;
  view.querySelectorAll(".chip").forEach(b => b.onclick = () => {
    const c = +b.dataset.c;
    if (pick.includes(c)) { if (pick.length > 1) picks[id] = pick.filter(x => x !== c); }
    else picks[id] = [...pick.slice(-2), c];
    tabelle(id);
  });
}

function land(id) {
  const l = byId(D.laender.laender, id), route = `#/l/${id}`;
  if (!l) return notFound();
  head(l.name, l.ausbau ? "Länderregeln" : "Linkliste", { back: "#/k/laender", route });
  remember({ route });
  const werte = D.laender.werte.filter(w => w.land === id);
  const docs = (l.quellen || []).map(q => byId(D.quellen, q)).filter(Boolean);
  const links = l.links || [];
  view.innerHTML = `${l.text ? `<div class="card">${paras(l.text)}</div>` : ""}
    ${hRow("Werte", werte.length ? `<div class="panel">${laenderRows(werte)}</div>` : "")}
    ${hinweisCards(D.laender.hinweise.filter(h => h.land === id))}
    ${hRow("Dokumente", docs.length ? `<div class="panel">${docs.map(q => row(`#/q/${q.id}`, q.kurz, `Stand ${q.fassung}`, statusTag(q))).join("")}</div>` : "")}
    ${hRow("Links", links.length ? `<div class="panel">${links.map(k => `<a class="item" href="${esc(k.url)}" target="_blank" rel="noopener"><span>${esc(k.titel)}</span><i>↗</i></a>`).join("")}</div>` : "")}
    ${l.ausbau ? "" : `<div class="card"><p>Dieses Land ist noch nicht ausgearbeitet. Die Länderregelungen im Überblick nennt das Informationsportal Abfallbewertung.</p></div><a class="link center" href="https://www.abfallbewertung.org/" target="_blank" rel="noopener">abfallbewertung.org ↗</a>`}`;
}

function material(id) {
  const m = byId(D.materialien, id), route = `#/m/${id}`;
  if (!m) return notFound();
  head(m.titel, m.sub, { back: "#/k/bauteile", route });
  remember({ route });
  const sch = schadTags(m.schadstoffe);
  view.innerHTML = `<div class="card">${paras(m.text)}${sch ? `<div class="tags">${sch}</div>` : ""}</div>${galerie([m.foto])}${pruefen()}${srcLine("atlas")}`;
}

function quelle(id) {
  const q = byId(D.quellen, id);
  if (!q) return notFound();
  head("Quelle", q.kurz, { back: "#/quellen" });
  const zeile = (k, v) => v ? `<div class="item"><span>${esc(k)}</span><span>${v}</span></div>` : "";
  view.innerHTML = `<div class="card"><h2>${esc(q.titel)}</h2><div class="tags">${statusTag(q)}</div></div>
    <div class="panel">${zeile("Fundstelle", esc(q.fundstelle))}${zeile("Stand", esc(q.fassung))}${zeile("Herausgeber", esc(q.herausgeber))}${zeile("Geprüft am", q.geprueft ? `<span class="num">${fmtDate(q.geprueft)}</span>` : "")}</div>
    ${q.hinweis ? `<div class="card alert"><p>${esc(q.hinweis)}</p></div>` : ""}
    ${q.url ? `<a class="link center" href="${esc(q.url)}" target="_blank" rel="noopener">Original öffnen ↗</a>` : ""}`;
}

function quellen() {
  head("Quellen", "Fundstellen und Änderungen");
  const bilder = D.bilder.length ? `<a class="item" href="#/bilder"><span>Bildnachweis<small>${D.bilder.length} Fotos</small></span><i>›</i></a>` : "";
  view.innerHTML = `<div class="section-h">Im Wandel</div><div class="panel">
    ${D.wandel.map(w => `<a class="item" href="#/q/${w.quelle}"><span>${esc(w.titel)}<small>${esc(w.text)}</small></span><span class="tag warn">${esc(w.status)}</span></a>`).join("")}</div>
    <div class="section-h">Regelwerke und Quellen</div>
    <div class="panel">${D.quellen.map(q => row(`#/q/${q.id}`, q.kurz, `Stand ${q.fassung}`, statusTag(q))).join("")}${bilder}</div>
    <p class="src">Orientierung, keine Rechtsberatung. Ersetzt keine Probenahme und Laboranalyse. Verbindlich sind nur die Originaltexte und die zuständige Behörde. Normen werden nur genannt, nicht wiedergegeben.</p>`;
}

function bildnachweis() {
  head("Bildnachweis", "Urheber und Lizenzen", { back: "#/quellen" });
  view.innerHTML = `<div class="panel">${D.bilder.map(b => `<a class="item" href="${esc(b.url)}" target="_blank" rel="noopener"><span>${esc(b.titel)}<small>${esc(b.urheber)} · ${esc(b.lizenz)}</small></span><i>↗</i></a>`).join("")}</div>
    <p class="src">Die Fotos wurden verkleinert, sonst unverändert. Lizenztexte: creativecommons.org.</p>`;
}

function merkliste() {
  head("Merkliste", "Gemerkt und zuletzt angesehen");
  const s = loadStore(), byRoute = r => index.find(e => e.route === r);
  const list = rs => rs.map(byRoute).filter(Boolean).map(e => row(e.route, e.titel, e.sub)).join("");
  const fav = list(s.fav), rec = list(s.recent);
  view.innerHTML = fav || rec
    ? hRow("Gemerkt", fav && `<div class="panel">${fav}</div>`) + hRow("Zuletzt angesehen", rec && `<div class="panel">${rec}</div>`)
    : `<p class="empty">Noch nichts gemerkt. Das Lesezeichen oben auf einer Seite speichert sie hier.</p>`;
}

function notFound() {
  head("Nicht gefunden", "");
  view.innerHTML = `<p class="empty">Diese Seite gibt es nicht.</p><a class="link center" href="#/">Zur Startseite</a>`;
}

/* ---------- Router ---------- */
const ROUTES = [
  [/^#\/themen$/, themen, "themen"], [/^#\/erkennen$/, erkennen, "themen"], [/^#\/k\/(\w+)$/, kapitel, "themen"], [/^#\/b\/([\w-]+)$/, bauteil, "themen"],
  [/^#\/m\/([\w-]+)$/, material, "themen"], [/^#\/s\/([\w-]+)$/, schadstoff, "themen"], [/^#\/r\/([\w-]+)$/, regel, "themen"],
  [/^#\/a\/(\d+)$/, avv, "themen"], [/^#\/t\/([\w-]+)$/, tabelle, "themen"], [/^#\/l\/([\w-]+)$/, land, "themen"],
  [/^#\/q\/([\w-]+)$/, quelle, "quellen"], [/^#\/quellen$/, quellen, "quellen"], [/^#\/bilder$/, bildnachweis, "quellen"],
  [/^#\/merkliste$/, merkliste, "merkliste"],
];
function route() {
  const h = location.hash || "#/";
  if (IM_WERKZEUG && h === "#/merkliste") { location.hash = "#/"; return; }
  if (IM_WERKZEUG) webAktiv(h);
  const r = ROUTES.find(x => x[0].test(h));
  if (r) r[1](...h.match(r[0]).slice(1));
  else if (h === "#/" ) start();
  else notFound();
  const tab = r ? r[2] : "start";
  document.querySelectorAll("#tabs a").forEach(a => a.dataset.t === tab ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  scrollTo(0, 0);
}

async function boot() {
  try {
    await Promise.all(FILES.map(async f => { D[f] = await fetch(`data/${f}.json`).then(r => { if (!r.ok) throw new Error(f); return r.json(); }); }));
  } catch {
    view.innerHTML = `<p class="empty">Die Daten konnten nicht geladen werden. Bitte einmal mit Internetverbindung öffnen.</p>`;
    return;
  }
  index = Search.build(buildEntries());
  if (IM_WERKZEUG) webRahmen();
  addEventListener("hashchange", route);
  route();
}

if (!IM_WERKZEUG && "serviceWorker" in navigator) {
  // First-time installs must not reload; only a replacement worker does.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) location.reload(); });
  navigator.serviceWorker.register("sw.js");
}
boot();
