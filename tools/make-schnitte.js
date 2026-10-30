// Draws img/schnitte/<id>.svg from the layers in data/bauteile.json and lists all offline files in files.js.
// Run with: node tools/make-schnitte.js
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const bauteile = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bauteile.json"), "utf8"));

const W = 340, X0 = 12, DW = 262, Y0 = 18, DH = 124, MX = 312;
// Hatches use CSS variables, so a drawing follows light and dark mode once inlined.
const PATTERNS = `<defs>
<pattern id="p-beton" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".8" fill="var(--muted)"/><path d="M8 8l2 1-1 2z" fill="var(--muted)"/></pattern>
<pattern id="p-estrich" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="var(--muted)" stroke-width=".6"/></pattern>
<pattern id="p-mauerwerk" width="16" height="10" patternUnits="userSpaceOnUse"><path d="M0 0h16M0 5h16M4 0v5M12 5v5" stroke="var(--minus)" stroke-width=".6" fill="none"/></pattern>
<pattern id="p-daemmung" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M0 5q3.5-7 7 0t7 0" stroke="var(--off)" stroke-width=".8" fill="none"/></pattern>
<pattern id="p-hartschaum" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 0l9 9M9 0L0 9" stroke="var(--accent)" stroke-width=".5"/></pattern>
<pattern id="p-holz" width="14" height="6" patternUnits="userSpaceOnUse"><path d="M0 3q7-3 14 0" fill="none" stroke="var(--off)" stroke-width=".7"/></pattern>
<pattern id="p-platte" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".5" fill="var(--accent)"/></pattern>
<pattern id="p-bims" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="none" stroke="var(--muted)" stroke-width=".6"/><circle cx="7.5" cy="7.5" r="1.1" fill="none" stroke="var(--muted)" stroke-width=".6"/></pattern>
<pattern id="p-putz" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".45" fill="var(--muted)"/></pattern>
<pattern id="p-lehm" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M0 6h5M7 2h5" stroke="var(--off)" stroke-width=".9"/></pattern>
<pattern id="p-schuettung" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="var(--muted)"/><circle cx="6" cy="6" r=".8" fill="var(--muted)"/></pattern>
<pattern id="p-kies" width="10" height="9" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="none" stroke="var(--muted)" stroke-width=".7"/><circle cx="8" cy="7" r="1.5" fill="none" stroke="var(--muted)" stroke-width=".7"/></pattern>
<pattern id="p-erde" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M1 8l3-3M8 4l3-3" stroke="var(--plus)" stroke-width=".8"/></pattern>
</defs>`;
const SOLID = { asphalt: "var(--ink)", belag: "var(--muted)", abdichtung: "var(--ink)", folie: "var(--accent)", stahl: "var(--ink)", luft: "none" };
const fill = m => SOLID[m] || `url(#p-${m})`;

// Spreads marker positions so number circles never touch.
function spread(pos, min, lo, hi) {
  const p = pos.slice();
  for (let n = 0; n < 30; n++) for (let i = 1; i < p.length; i++) {
    const gap = p[i] - p[i - 1];
    if (gap < min) { p[i - 1] -= (min - gap) / 2; p[i] += (min - gap) / 2; }
  }
  const shift = Math.max(0, lo - p[0]) - Math.max(0, p[p.length - 1] - hi);
  return p.map(v => v + shift);
}

function dekoDecke(d, r) {
  const { x, y, w, h } = r, n = 3, o = [];
  const dots = yy => { for (let i = 0; i < 26; i++) o.push(`<circle cx="${x + 6 + i * (w - 12) / 25}" cy="${yy}" r="1.3" fill="var(--ink)"/>`); };
  if (d === "bew-u") dots(y + h - 6);
  if (d === "bew-o") dots(y + 6);
  if (d === "gitter") { let p = `M${x + 20} ${y + h - 4}`; for (let i = 1; i <= 16; i++) p += `L${x + 20 + i * 14} ${i % 2 ? y + 10 : y + h - 4}`; o.push(`<path d="${p}" fill="none" stroke="var(--ink)" stroke-width="1"/>`); }
  if (d === "fuge") o.push(`<line x1="${x + w * .62}" y1="${y + h - 12}" x2="${x + w * .62}" y2="${y + h}" stroke="var(--bg)" stroke-width="3"/><line x1="${x + w * .62}" y1="${y + h - 12}" x2="${x + w * .62}" y2="${y + h}" stroke="var(--ink)" stroke-width=".8"/>`);
  if (d === "hohl") for (let i = 0; i < 6; i++) o.push(`<circle cx="${x + 26 + i * 42}" cy="${y + h / 2}" r="${Math.min(h * .28, 16)}" fill="var(--surface)" stroke="var(--ink)"/>`);
  if (d === "rohre") for (let i = 0; i < 7; i++) o.push(`<circle cx="${x + 24 + i * 36}" cy="${y + h - 10}" r="6" fill="var(--surface)" stroke="var(--minus)" stroke-width="1.4"/>`);
  if (d === "lager") for (let i = 0; i < n; i++) o.push(`<rect x="${x + 30 + i * 86}" y="${y}" width="26" height="${h}" fill="var(--surface)"/><rect x="${x + 30 + i * 86}" y="${y}" width="26" height="${h}" fill="url(#p-holz)" stroke="var(--ink)"/>`);
  if (d === "rippe") for (let i = 0; i < 4; i++) o.push(`<rect x="${x + 4 + i * 82}" y="${y}" width="14" height="${h}" fill="var(--surface)"/><rect x="${x + 4 + i * 82}" y="${y}" width="14" height="${h}" fill="url(#p-beton)" stroke="var(--ink)"/><circle cx="${x + 11 + i * 82}" cy="${y + h - 7}" r="2" fill="var(--ink)"/>`);
  if (d === "kammer") for (let i = 0; i < 3; i++) o.push(`<rect x="${x + 36 + i * 82}" y="${y + 10}" width="30" height="${h - 20}" rx="3" fill="var(--surface)" stroke="var(--ink)" stroke-width=".8"/>`);
  if (d === "stuetze") for (let i = 0; i < 3; i++) o.push(`<line x1="${x + 11 + i * 110}" y1="${y + h}" x2="${x + 11 + i * 110}" y2="${y + h + 14}" stroke="var(--ink)" stroke-width="2.4"/>`);
  if (d === "trapez") { let p = `M${x} ${y + h - 2}`; for (let i = 0; i < 7; i++) { const a = x + i * w / 7; p += `L${a + 12} ${y + h - 2}L${a + 18} ${y + 2}L${a + 31} ${y + 2}L${a + w / 7} ${y + h - 2}`; } o.push(`<path d="${p}" fill="none" stroke="var(--ink)" stroke-width="2"/>`); }
  return o.join("");
}

function decke(b) {
  const real = b.schichten.filter(s => s[2]), sum = real.reduce((a, s) => a + s[3], 0);
  // Long stacks get a taller drawing so every number circle fits beside its layer.
  const dh = Math.max(DH, b.schichten.length * 21), k = dh / sum;
  let y = Y0, o = "", last = null;
  const marks = [];
  for (const s of b.schichten) {
    if (s[2]) {
      const h = s[3] * k;
      last = { x: X0, y, w: DW, h };
      if (s[4] === "bogen") {
        // A thin vault between the beams, the fill above it follows the arc.
        o += `<rect x="${X0}" y="${y}" width="${DW}" height="${h + 16}" fill="url(#p-schuettung)"/><path d="M${X0} ${y + h}Q${X0 + DW / 2} ${y - h * .9} ${X0 + DW} ${y + h}L${X0 + DW} ${y + h + 17}L${X0} ${y + h + 17}Z" fill="var(--surface)"/>`;
        o += `<path d="M${X0} ${y + h}Q${X0 + DW / 2} ${y - h * .9} ${X0 + DW} ${y + h}L${X0 + DW} ${y + h + 16}Q${X0 + DW / 2} ${y + h * .2} ${X0} ${y + h + 16}Z" fill="${fill(s[2])}" stroke="var(--ink)"/>`;
      } else {
        o += `<rect x="${X0}" y="${y}" width="${DW}" height="${h}" fill="${s[4] === "trapez" ? "url(#p-beton)" : fill(s[2])}" stroke="var(--ink)" stroke-width=".9"/>`;
        if (s[4]) o += dekoDecke(s[4], last);
      }
      marks.push(y + h / 2); y += h;
    } else {
      if (s[4] === "itraeger") o += [X0 + 1, X0 + DW - 9].map(a => `<rect x="${a}" y="${last.y - 4}" width="8" height="${last.h + 22}" fill="var(--ink)"/>`).join("");
      else o += dekoDecke(s[4], last);
      marks.push(last.y + last.h / 2 + (s[4] === "bew-u" ? last.h / 3 : s[4] === "bew-o" ? -last.h / 3 : 0));
    }
  }
  const pos = spread(marks, 20, 11, Y0 + dh + 16);
  marks.forEach((m, i) => o += `<path d="M${X0 + DW} ${m}L${MX - 18} ${m}L${MX - 9} ${pos[i]}" fill="none" stroke="var(--muted)" stroke-width=".7"/>`);
  return { o, pos, h: Y0 + dh + 30 };
}

function wand(b) {
  const sum = b.schichten.reduce((a, s) => a + s[3], 0), k = (W - 2 * X0) / sum;
  let x = X0, o = "", marks = [];
  for (const s of b.schichten) {
    const w = s[3] * k;
    o += `<rect x="${x}" y="46" width="${w}" height="92" fill="${fill(s[2])}" stroke="var(--ink)" stroke-width=".9"/>`;
    marks.push(x + w / 2); x += w;
  }
  const pos = spread(marks, 22, 14, W - 14);
  marks.forEach((m, i) => {
    o += `<path d="M${m} 46L${pos[i]} 32" fill="none" stroke="var(--muted)" stroke-width=".7"/><circle cx="${pos[i]}" cy="22" r="9" fill="var(--accent)"/><text x="${pos[i]}" y="26" text-anchor="middle" font-size="11" font-weight="600" fill="var(--accent-ink)" font-family="var(--sans)">${i + 1}</text>`;
  });
  o += `<text x="${X0}" y="156" font-size="11" fill="var(--muted)" font-family="var(--sans)">${b.links}</text><text x="${W - X0}" y="156" text-anchor="end" font-size="11" fill="var(--muted)" font-family="var(--sans)">${b.rechts}</text>`;
  return { o, h: 166 };
}

let n = 0;
for (const b of bauteile) {
  if (b.richtung !== "decke" && b.richtung !== "wand") continue;
  const d = b.richtung === "decke" ? decke(b) : wand(b);
  const circles = d.pos ? d.pos.map((y, i) => `<circle cx="${MX + 4}" cy="${y}" r="9" fill="var(--accent)"/><text x="${MX + 4}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--accent-ink)" font-family="var(--sans)">${i + 1}</text>`).join("") : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${d.h}" role="img" aria-label="Schnitt ${b.titel.replace(/&/g, "und")}, nicht maßstäblich">${PATTERNS}${d.o}${circles}</svg>\n`;
  fs.writeFileSync(path.join(ROOT, "img/schnitte", b.id + ".svg"), svg);
  n++;
}

const list = dir => fs.readdirSync(path.join(ROOT, dir)).sort().map(f => `${dir}/${f}`);
const files = ["./", "index.html", "style.css", "search.js", "app.js", "files.js", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  ...list("fonts"), ...list("data"), ...list("img/schnitte"), ...list("img/fotos")];
fs.writeFileSync(path.join(ROOT, "files.js"), `// Generated by tools/make-schnitte.js: everything the app needs offline.\nconst FILES = ${JSON.stringify(files)};\n`);
console.log(`${n} Skizzen, ${files.length} Offline-Dateien`);
