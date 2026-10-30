// Offline cache. Bump VERSION whenever app files change so phones pick up the update.
const VERSION = "baulexikon-v1";
const FILES = ["./", "index.html", "style.css", "search.js", "app.js", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  "fonts/InstrumentSans.woff2", "fonts/AzeretMono.woff2",
  "data/kapitel.json", "data/bauteile.json", "data/materialien.json", "data/schadstoffe.json", "data/regeln.json", "data/avv.json",
  "data/tabellen.json", "data/laender.json", "data/quellen.json", "data/wandel.json", "data/bilder.json",
  "img/schnitte/holzbalken.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first (so updates show up on the next start), cache as the offline fallback.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
