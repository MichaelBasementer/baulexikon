# Baulexikon

Offline nutzbare Handy-App zum Nachschlagen für Bestand und Rückbau: Bauteilaufbauten, Gebäudeschadstoffe, TRGS, Abfallrecht und Länderregeln.

Orientierung, keine Rechtsberatung. Ersetzt keine Probenahme und Laboranalyse. Verbindlich sind nur die Originaltexte und die zuständige Behörde.

## Lokal starten

    node tools/serve.js

Dann <http://127.0.0.1:8123/> öffnen. Service Worker und `fetch` brauchen http, ein Doppelklick auf `index.html` genügt nicht.

## Inhalte pflegen

| Aufgabe | Befehl |
|---|---|
| DepV, EBV und AVV aus der amtlichen Fassung neu einlesen | `node tools/import-recht.js`, danach Git-Diff prüfen und Stand in `data/quellen.json` anpassen |
| Fotos von Wikimedia Commons holen | `node tools/fetch-fotos.js` |
| Schnittskizzen und Offline-Liste neu erzeugen | `node tools/make-schnitte.js` |
| Daten prüfen | `node test-data.js`, vor einer Veröffentlichung `node test-data.js --release` |
| Suche prüfen | `node test-search.js` |

Nach jeder Änderung an App oder Daten `VERSION` in `sw.js` hochzählen, damit Handys das Update laden.

Grenzwerte werden nie von Hand abgetippt. Zahlen stammen aus Gesetzestext, GMBl, BAuA, LAGA oder der Landesbehörde; Normen werden nur genannt.

## Bildnachweis

Fotos von Wikimedia Commons mit Urheber und Lizenz je Bild, siehe `data/bilder.json` und die Seite Bildnachweis in der App.
