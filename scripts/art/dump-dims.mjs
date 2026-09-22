/**
 * dump-dims.mjs — record the pixel dimensions of every asset the app expects.
 *
 * The textures are mapped onto fixed 3D planes, so an original redraw MUST keep
 * the original aspect ratio or every surface stretches. This produces the size
 * table the generator renders against.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const REF = join(ROOT, 'reference', 'portfolio-itom', 'public');
const manifest = JSON.parse(readFileSync(join(ROOT, '.research', 'asset-manifest.json'), 'utf8'));

// Everything the app asks for: literals + known dynamic expansions.
const paths = new Set(manifest.referenced);
for (let i = 1; i <= 9; i++) paths.add(`/textures/corridor/avatar_anim/${i}.webp`);
for (const t of ['about', 'kontakt', 'projekty', 'social']) {
  paths.add(`/textures/corridor/doors/drzwi${t}.webp`);
  paths.add(`/textures/corridor/doors/drzwi${t}_painted.webp`);
}

const dims = {};
const missing = [];
for (const p of [...paths].sort()) {
  if (!p.endsWith('.webp')) continue;
  const file = join(REF, p.replace(/^\//, ''));
  if (!existsSync(file)) {
    missing.push(p);
    continue;
  }
  const meta = await sharp(file).metadata();
  dims[p] = { w: meta.width, h: meta.height };
}

writeFileSync(join(ROOT, '.research', 'asset-dims.json'), JSON.stringify(dims, null, 2));

// Summarise aspect ratios by folder so the generator can be written against them.
const byFolder = {};
for (const [p, d] of Object.entries(dims)) {
  const f = p.split('/')[2] || '_root';
  (byFolder[f] ||= []).push({ p: p.replace('/textures/', ''), ...d, ar: +(d.w / d.h).toFixed(3) });
}

for (const f of Object.keys(byFolder).sort()) {
  console.log(`\n### ${f}`);
  for (const e of byFolder[f]) console.log(`  ${e.w}x${e.h}  ar=${e.ar}  ${e.p}`);
}
console.log('\nmissing (no source to measure):', missing.join(', ') || '(none)');
console.log('\nwrote .research/asset-dims.json');
