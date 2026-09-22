/**
 * montage.mjs — composite generated assets into contact sheets for review.
 *   node scripts/art/montage.mjs <outName> <file...>
 */
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const [outName, ...files] = process.argv.slice(2);
const CELL = 300;
const COLS = 5;

const present = files.filter((f) => existsSync(join(process.cwd(), 'public', f)));
if (!present.length) {
  console.error('no input files exist');
  process.exit(1);
}

const tiles = [];
for (const f of present) {
  const buf = await sharp(join(process.cwd(), 'public', f))
    .resize({ width: CELL - 16, height: CELL - 16, fit: 'inside', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  const meta = await sharp(buf).metadata();
  tiles.push({ buf, w: meta.width, h: meta.height });
}

const rows = Math.ceil(tiles.length / COLS);
const W = COLS * CELL;
const H = rows * CELL;

const composite = tiles.map((t, i) => ({
  input: t.buf,
  left: (i % COLS) * CELL + Math.round((CELL - t.w) / 2),
  top: Math.floor(i / COLS) * CELL + Math.round((CELL - t.h) / 2),
}));

// grid lines drawn as a single SVG overlay
let grid = '';
for (let c = 1; c < COLS; c++) grid += `<line x1="${c * CELL}" y1="0" x2="${c * CELL}" y2="${H}" stroke="#dddddd" stroke-width="1"/>`;
for (let r = 1; r < rows; r++) grid += `<line x1="0" y1="${r * CELL}" x2="${W}" y2="${r * CELL}" stroke="#dddddd" stroke-width="1"/>`;

await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
  .composite([...composite, { input: Buffer.from(`<svg width="${W}" height="${H}">${grid}</svg>`), left: 0, top: 0 }])
  .webp({ quality: 88 })
  .toFile(join(process.cwd(), '.research', outName));

console.log(`wrote .research/${outName}  (${present.length} tiles, ${COLS}x${rows})`);
