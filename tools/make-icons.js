// Writes icon-192.png and icon-512.png: stacked building layers on the accent colour.
// Run with: node tools/make-icons.js
const zlib = require("zlib"), fs = require("fs");

function crc32(buf) {
  let c, crc = ~0;
  for (const b of buf) { c = (crc ^ b) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0, o = 0; y < size; y++) { raw[o++] = 0; for (let x = 0; x < size; x++) { const p = pixel(x / size, y / size); raw[o++] = p[0]; raw[o++] = p[1]; raw[o++] = p[2]; } }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const BLUE = [35, 80, 200], WHITE = [255, 255, 255], LIGHT = [188, 204, 244], MID = [122, 150, 228];
// Layers as the app's section drawings show them; stays inside the maskable safe zone.
const bands = [[.30, .37, WHITE], [.41, .46, LIGHT], [.50, .60, WHITE], [.64, .70, MID]];
const pixel = (x, y) => {
  if (x < .24 || x > .76) return BLUE;
  const b = bands.find(([a, z]) => y >= a && y < z);
  return b ? b[2] : BLUE;
};
for (const s of [192, 512]) fs.writeFileSync(`icon-${s}.png`, png(s, pixel));
