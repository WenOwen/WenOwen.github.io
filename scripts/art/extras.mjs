/**
 * extras.mjs — the non-texture art: floor map, pins, ink splash, cursors,
 * favicon and the Open Graph card. Same original line-art engine as the rest.
 *
 *   node scripts/art/extras.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import sharp from 'sharp';
import {
  makeRng, seedFrom, line, rect, ellipse, cloud, poly, hatch, arc, svgDoc, render,
  INK, INK_SOFT, INK_FAINT, PAPER, PAPER_DIM,
} from './props.mjs';
import { identity, projects, techLogos } from '../../src/content/site.config.js';

const ROOT = process.cwd();
const PUB = join(ROOT, 'public');

const save = async (svg, rel, opts = {}) => {
  const out = join(PUB, rel);
  mkdirSync(dirname(out), { recursive: true });
  if (opts.png) {
    await sharp(Buffer.from(svg), { density: 300 }).resize(opts.width || 512).png().toFile(out);
  } else {
    await render(svg, out, { width: opts.width || 1024 });
  }
  console.log(`  ${rel}`);
};

const W = 1024;
const H = 512;

/* ---------------- NavigationUI floor map ----------------
 * NavigationUI clips four overlay regions at these positions:
 *   about   polygon(10% 20% .. 10% 55%)   left column, upper
 *   gallery polygon(10% 57% .. 10% 92%)   left column, lower
 *   contact polygon(95% 10% .. 95% 35%)   right column, top
 *   studio  polygon(85% 41% .. 85% 81%)   right column, middle
 * so each room must be drawn at exactly those coordinates.
 */
const ROOMS = {
  about: { x: 0.05, y: 0.16, w: 0.28, h: 0.42, label: 'ABOUT' },
  gallery: { x: 0.05, y: 0.56, w: 0.28, h: 0.4, label: 'PROJECTS' },
  contact: { x: 0.62, y: 0.06, w: 0.33, h: 0.34, label: 'CONTACT' },
  studio: { x: 0.6, y: 0.4, w: 0.36, h: 0.46, label: 'STUDIO' },
};

function mapBase(rng, highlight = null) {
  // The upstream map is ~9% opaque: an outline plan on a transparent canvas, so
  // every wall here is stroked with no fill (a solid fill would hide the page).
  const OUTLINE = { stroke: 3, amp: 2, fill: 'none' };
  let b = '';
  // corridor spine
  b += rect(rng, W * 0.33, H * 0.28, W * 0.28, H * 0.42, OUTLINE);
  b += hatch(rng, W * 0.35, H * 0.3, W * 0.24, H * 0.38, { gap: 16, opacity: 0.22, stroke: 1.5 });
  for (const r of Object.values(ROOMS)) {
    b += rect(rng, W * r.x, H * r.y, W * r.w, H * r.h, { ...OUTLINE, stroke: 3.4 });
  }
  // door gaps between corridor and rooms
  b += line(rng, W * 0.33, H * 0.42, W * 0.33, H * 0.56, { stroke: 6, color: PAPER });
  b += line(rng, W * 0.61, H * 0.44, W * 0.61, H * 0.58, { stroke: 6, color: PAPER });
  b += line(rng, W * 0.33, H * 0.42, W * 0.33, H * 0.56, { stroke: 2.4, color: INK_FAINT });
  b += line(rng, W * 0.61, H * 0.44, W * 0.61, H * 0.58, { stroke: 2.4, color: INK_FAINT });
  // labels
  for (const [key, r] of Object.entries(ROOMS)) {
    b += `<text x="${(r.x + r.w / 2) * W}" y="${(r.y + r.h / 2) * H}" font-family="Segoe UI, Arial, sans-serif" font-size="${H * 0.055}" font-weight="800" fill="${highlight === key ? INK : INK_SOFT}" text-anchor="middle" letter-spacing="3">${r.label}</text>`;
  }
  b += `<text x="${W * 0.47}" y="${H * 0.52}" font-family="Segoe UI, Arial, sans-serif" font-size="${H * 0.04}" font-weight="700" fill="${INK_FAINT}" text-anchor="middle" letter-spacing="2">HALL</text>`;
  // room contents, lightly sketched (outlines only)
  const SK = { stroke: 1.8, color: INK_FAINT, fill: 'none' };
  for (let i = 0; i < 4; i++) b += rect(rng, W * 0.08, H * (0.22 + i * 0.09), W * 0.06, H * 0.05, SK);
  for (let i = 0; i < 5; i++) b += ellipse(rng, W * (0.09 + i * 0.05), H * 0.8, W * 0.014, H * 0.03, SK);
  for (let i = 0; i < 3; i++) b += ellipse(rng, W * (0.7 + i * 0.09), H * (0.15 + i * 0.07), W * 0.02, H * 0.04, SK);
  for (let i = 0; i < 6; i++) b += rect(rng, W * (0.64 + (i % 3) * 0.1), H * (0.5 + Math.floor(i / 3) * 0.16), W * 0.07, H * 0.1, SK);
  // compass + scale
  b += line(rng, W * 0.94, H * 0.94, W * 0.94, H * 0.86, { stroke: 2.4 });
  b += poly(rng, [[W * 0.94, H * 0.84], [W * 0.925, H * 0.88], [W * 0.955, H * 0.88]], { stroke: 2, fill: INK });
  b += `<text x="${W * 0.94}" y="${H * 0.99}" font-family="Segoe UI, Arial, sans-serif" font-size="${H * 0.04}" font-weight="700" fill="${INK_SOFT}" text-anchor="middle">N</text>`;
  if (highlight) {
    const r = ROOMS[highlight];
    b += hatch(rng, W * r.x, H * r.y, W * r.w, H * r.h, { gap: 11, opacity: 0.4, stroke: 1.6, inset: 5, angle: Math.PI / 4 });
  }
  return b;
}

const rng = makeRng(seedFrom('map'));
await save(svgDoc(W, H, mapBase(rng), { bg: null }), 'images/map.webp', { width: W });
for (const key of Object.keys(ROOMS)) {
  const r = makeRng(seedFrom(`map-${key}`));
  await save(svgDoc(W, H, mapBase(r, key), { bg: null }), `images/map_${key}_painted.webp`, { width: W });
}

/* ---------------- pin + slot ---------------- */
{
  const r = makeRng(seedFrom('pin'));
  const w = 128;
  const h = 160;
  let b = ellipse(r, w * 0.5, h * 0.32, w * 0.3, h * 0.26, { stroke: 3.4 });
  b += poly(r, [[w * 0.24, h * 0.44], [w * 0.76, h * 0.44], [w * 0.5, h * 0.95]], { stroke: 3.4 });
  b += ellipse(r, w * 0.5, h * 0.32, w * 0.11, h * 0.09, { stroke: 2.6, fill: PAPER });
  await save(svgDoc(w, h, b, { bg: 'none' }), 'images/pin.webp', { width: 128 });
  await save(svgDoc(w, h, ellipse(r, w * 0.5, h * 0.32, w * 0.34, h * 0.3, { stroke: 2, color: INK_FAINT }), { bg: 'none' }), 'images/pin-slot.webp', { width: 128 });
}

/* ---------------- ink splash ---------------- */
{
  const r = makeRng(seedFrom('ink'));
  const w = 512;
  let b = '';
  for (let i = 0; i < 26; i++) {
    const cx = w * (0.3 + r() * 0.4);
    const cy = w * (0.3 + r() * 0.4);
    const rad = w * (0.03 + r() * 0.18);
    b += cloud(r, cx, cy, rad * 2.2, rad * 1.8, { bumps: 6, amp: 4, stroke: 3, fill: INK, color: INK, opacity: 0.75 });
  }
  for (let i = 0; i < 40; i++) {
    b += ellipse(r, r() * w, r() * w, 1.6 + r() * 5, 1.6 + r() * 5, { fill: INK, stroke: 1, opacity: 0.7 });
  }
  await save(svgDoc(w, w, b, { bg: 'none' }), 'images/ink-splash.webp', { width: 512 });
}

/* ---------------- cursors ---------------- */
{
  const r = makeRng(seedFrom('cursor'));
  const s = 64;
  const arrow = poly(r, [[10, 4], [10, 46], [21, 36], [28, 52], [36, 48], [29, 33], [44, 32]], { stroke: 3, color: '#ffffff', fill: '#1a1a1a', amp: 0.8 });
  await save(svgDoc(s, s, arrow, { bg: 'none' }), 'cursors/cursor-default.webp', { width: 64 });
  const hand = poly(r, [[18, 30], [18, 14], [23, 14], [23, 28], [27, 12], [32, 13], [30, 29], [35, 18], [40, 20], [36, 34], [34, 48], [22, 48]], { stroke: 3, color: '#ffffff', fill: '#1a1a1a', amp: 0.8 });
  await save(svgDoc(s, s, hand, { bg: 'none' }), 'cursors/cursor-pointer.webp', { width: 64 });
}

/* ---------------- favicon ---------------- */
{
  const r = makeRng(seedFrom('favicon'));
  const s = 512;
  let b = rect(r, 30, 30, s - 60, s - 60, { stroke: 22, radius: 84 });
  b += hatch(r, 60, 60, s - 120, s - 120, { gap: 34, opacity: 0.18, stroke: 12, inset: 8 });
  b += `<text x="${s / 2}" y="${s * 0.66}" font-family="Segoe UI, Arial, sans-serif" font-size="${s * 0.42}" font-weight="800" fill="${INK}" text-anchor="middle" letter-spacing="4">WU5</text>`;
  await save(svgDoc(s, s, b, { bg: PAPER }), 'favico.png', { png: true, width: 512 });
}

/* ---------------- Open Graph card ---------------- */
{
  const r = makeRng(seedFrom('og'));
  const w = 1200;
  const h = 630;
  let b = rect(r, 26, 26, w - 52, h - 52, { stroke: 6, radius: 18 });
  b += cloud(r, w * 0.13, h * 0.16, w * 0.22, h * 0.16, { bumps: 4, stroke: 3, fill: PAPER });
  b += cloud(r, w * 0.87, h * 0.82, w * 0.24, h * 0.17, { bumps: 5, stroke: 3, fill: PAPER });
  b += `<text x="${w / 2}" y="${h * 0.44}" font-family="Segoe UI, Arial, sans-serif" font-size="150" font-weight="800" fill="${INK}" text-anchor="middle" letter-spacing="10">${identity.handle}</text>`;
  b += `<text x="${w / 2}" y="${h * 0.56}" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="600" fill="${INK_SOFT}" text-anchor="middle" letter-spacing="4">${identity.aboutSubtitle}</text>`;
  const chips = techLogos.slice(0, 6);
  chips.forEach((t, i) => {
    const cw = 108;
    const gap = 18;
    const total = chips.length * cw + (chips.length - 1) * gap;
    const x = (w - total) / 2 + i * (cw + gap);
    b += rect(r, x, h * 0.64, cw, 52, { stroke: 3, radius: 10 });
    b += `<text x="${x + cw / 2}" y="${h * 0.64 + 35}" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="${INK}" text-anchor="middle">${t.label}</text>`;
  });
  b += `<text x="${w / 2}" y="${h * 0.9}" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="500" fill="${INK_FAINT}" text-anchor="middle" letter-spacing="3">${identity.siteUrl.replace(/^https?:\/\//, '')}</text>`;
  await save(svgDoc(w, h, b, { bg: PAPER }), 'og-image.webp', { width: w });
}

console.log('\nextras done');
