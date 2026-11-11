import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image bytes: each scanline starts with filter byte 0
  const rawBytes = Buffer.alloc((width * 4 + 1) * height);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * (isMaskable ? 0.38 : 0.44);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Colors: Dark modern tech gradient #0f172a to #1e3a8a
      // Draw circular rounded badge
      if (dist <= radius) {
        // Inside main badge
        // Draw Wi-Fi wave rings and central dot
        const angle = Math.atan2(dy, dx);
        const inUpperFan = dy < 0 && Math.abs(dx) <= -dy * 1.5;

        // Wifi arcs
        const ring1 = Math.abs(dist - radius * 0.72) < radius * 0.08;
        const ring2 = Math.abs(dist - radius * 0.48) < radius * 0.08;
        const centerDot = dist < radius * 0.16;

        if ((ring1 || ring2) && inUpperFan) {
          // Cyan / Blue-300
          rawBytes[offset++] = 56;  // R
          rawBytes[offset++] = 189; // G
          rawBytes[offset++] = 248; // B
          rawBytes[offset++] = 255; // A
        } else if (centerDot) {
          // Bright amber/gold accent dot
          rawBytes[offset++] = 251; // R
          rawBytes[offset++] = 191; // G
          rawBytes[offset++] = 36;  // B
          rawBytes[offset++] = 255; // A
        } else {
          // Deep Indigo-blue badge body
          const grad = y / height;
          rawBytes[offset++] = Math.floor(15 + grad * 25);  // R
          rawBytes[offset++] = Math.floor(23 + grad * 40);  // G
          rawBytes[offset++] = Math.floor(62 + grad * 140); // B
          rawBytes[offset++] = 255; // A
        }
      } else if (isMaskable) {
        // Maskable full background
        rawBytes[offset++] = 15;
        rawBytes[offset++] = 23;
        rawBytes[offset++] = 42;
        rawBytes[offset++] = 255;
      } else {
        // Transparent outer corners
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
        rawBytes[offset++] = 0;
      }
    }
  }

  // Deflate IDAT
  const compressedData = zlib.deflateSync(rawBytes);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure public dir
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PNGs
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));

// Generate icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="url(#bg)" />
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1e3a8a" />
      <stop offset="1" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <path d="M120 180 C190 110, 322 110, 392 180" stroke="#38bdf8" stroke-width="32" stroke-linecap="round" fill="none" />
  <path d="M168 228 C216 180, 296 180, 344 228" stroke="#38bdf8" stroke-width="28" stroke-linecap="round" fill="none" />
  <circle cx="256" cy="300" r="32" fill="#fbbf24" />
  <path d="M216 360 L296 360 M256 320 L256 420" stroke="#94a3b8" stroke-width="24" stroke-linecap="round" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('Successfully generated all PWA icons in /public!');
