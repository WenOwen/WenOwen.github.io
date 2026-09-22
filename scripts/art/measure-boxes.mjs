/**
 * measure-boxes.mjs — record the alpha bounding box of every upstream texture.
 *
 * The upstream props are cut-outs on transparent canvases; each drawing occupies
 * only part of its canvas, and that fraction is what makes the 3D scene compose
 * correctly. Our originals are generated, so the drawn shape must be placed into
 * the SAME sub-rectangle, otherwise every prop renders at the wrong size.
 *
 * Output: .research/asset-boxes.json  ->  { "<path>": { x, y, w, h, alpha } }
 * where x/y/w/h are fractions of the canvas (0..1) covering the opaque pixels.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const REF = join(ROOT, 'reference', 'portfolio-itom', 'public');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'backups') walk(p, out); }
    else out.push(p);
  }
  return out;
}

const files = existsSync(REF) ? walk(REF).filter((f) => f.endsWith('.webp')) : [];
const boxes = {};
const S = 128; // sample size — proportions only, so small is fine

for (const f of files) {
  const rel = '/' + relative(join(REF), f).replace(/\\/g, '/');
  try {
    const { data, info } = await sharp(f)
      .resize(S, S, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width: w, height: h } = info;
    let minX = w; let minY = h; let maxX = -1; let maxY = -1; let opaque = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = data[(y * w + x) * 4 + 3];
        if (a > 24) {
          opaque++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) {
      // Fully transparent (or fully opaque check below)
      boxes[rel] = { x: 0, y: 0, w: 1, h: 1, alpha: 0 };
      continue;
    }
    boxes[rel] = {
      x: +(minX / w).toFixed(4),
      y: +(minY / h).toFixed(4),
      w: +((maxX - minX + 1) / w).toFixed(4),
      h: +((maxY - minY + 1) / h).toFixed(4),
      alpha: +(opaque / (w * h)).toFixed(4),
    };
  } catch (e) {
    boxes[rel] = { error: e.message };
  }
}

writeFileSync(join(ROOT, '.research', 'asset-boxes.json'), JSON.stringify(boxes, null, 2));

const full = Object.entries(boxes).filter(([, b]) => b.alpha > 0.97).length;
const cut = Object.entries(boxes).filter(([, b]) => b.alpha > 0 && b.alpha <= 0.97).length;
const empty = Object.entries(boxes).filter(([, b]) => b.alpha === 0).length;

console.log(`measured ${Object.keys(boxes).length} textures`);
console.log(`  fully opaque (walls/floors/cards): ${full}`);
console.log(`  cut-outs (props with alpha)      : ${cut}`);
console.log(`  fully transparent                : ${empty}`);
console.log('\n--- cut-out sample (fraction of canvas actually drawn) ---');
for (const [p, b] of Object.entries(boxes).filter(([, x]) => x.alpha > 0 && x.alpha <= 0.97).slice(0, 25)) {
  console.log(`  ${p.replace('/textures/', '')}  box=(${b.x},${b.y},${b.w},${b.h}) alpha=${b.alpha}`);
}
console.log('\nwrote .research/asset-boxes.json');
