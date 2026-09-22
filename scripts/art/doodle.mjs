/**
 * doodle.mjs — a tiny hand-drawn ("architect's sketch") art engine.
 *
 * Everything the portfolio needs is generated from this file: paper, bricks,
 * water, clouds, doors, monitors, props. The look comes from three tricks:
 *
 *   1. Seeded jitter — every straight line wanders slightly, like a real pen.
 *   2. Double stroking — the same path drawn twice with a small offset and a
 *      lighter second pass, which reads as pressure variation.
 *   3. Hatching — parallel strokes at a fixed angle for shading instead of fills.
 *
 * Output is SVG (hand-written path data only — no filters, because librsvg
 * inside sharp does not support feTurbulence) rasterised to WebP by sharp.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

/** mulberry32 — small, fast, seedable PRNG so every run is byte-identical. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string -> int seed, so assets can be seeded by filename. */
export function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ *
 * Render options
 * ------------------------------------------------------------------ */

/**
 * `transparent` — leave the canvas transparent (cut-out props).
 * `solid`       — fill closed shapes with paper colour instead of leaving them
 *                 hollow. The upstream props are solid illustrations; pure
 *                 outlines would let the background show through the object.
 */
export const RENDER_OPTS = { transparent: false, solid: true };

/** Default fill for a closed shape. */
const shapeFill = (explicit) => (explicit !== undefined ? explicit : (RENDER_OPTS.solid ? PAPER : 'none'));

/* ------------------------------------------------------------------ *
 * Palette — matches the app's design tokens
 * ------------------------------------------------------------------ */
export const INK = '#2f2c28';
export const INK_SOFT = '#6f6a63';
export const INK_FAINT = '#b9b3aa';
export const PAPER = '#fbfaf7';
export const PAPER_DIM = '#f2efe9';

/* ------------------------------------------------------------------ *
 * Geometry helpers
 * ------------------------------------------------------------------ */

const n = (v) => Math.round(v * 100) / 100;

/** Perturb points by ±amp — the soul of the hand-drawn look. */
export function jitter(rng, pts, amp) {
  return pts.map(([x, y]) => [x + (rng() - 0.5) * 2 * amp, y + (rng() - 0.5) * 2 * amp]);
}

/** Sample a straight segment into `segs` points. */
export function seg(x1, y1, x2, y2, segs = 6) {
  const out = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
  }
  return out;
}

export function toPath(pts, closed = false) {
  if (!pts.length) return '';
  let d = `M${n(pts[0][0])},${n(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `L${n(pts[i][0])},${n(pts[i][1])}`;
  return closed ? `${d}Z` : d;
}

/* ------------------------------------------------------------------ *
 * Shape primitives — each returns SVG markup
 * ------------------------------------------------------------------ */

export function line(rng, x1, y1, x2, y2, o = {}) {
  const { amp = 1.4, segs = 7, stroke = 3, color = INK, opacity = 1, cap = 'round' } = o;
  const pts = jitter(rng, seg(x1, y1, x2, y2, segs), amp);
  return `<path d="${toPath(pts)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="${cap}" stroke-linejoin="round" opacity="${opacity}"/>`;
}

export function rect(rng, x, y, w, h, o = {}) {
  const { amp = 1.6, stroke = 3, color = INK, opacity = 1, fill, segs = 5, radius = 0 } = o;
  const fillC = shapeFill(fill);
  let pts;
  if (radius > 0) {
    const r = Math.min(radius, w / 2, h / 2);
    pts = [];
    const arc = (cx, cy, a0, a1) => {
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (a1 - a0) * (i / steps);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    pts.push(...seg(x + r, y, x + w - r, y, segs));
    arc(x + w - r, y + r, -Math.PI / 2, 0);
    pts.push(...seg(x + w, y + r, x + w, y + h - r, segs));
    arc(x + w - r, y + h - r, 0, Math.PI / 2);
    pts.push(...seg(x + w - r, y + h, x + r, y + h, segs));
    arc(x + r, y + h - r, Math.PI / 2, Math.PI);
    pts.push(...seg(x, y + h - r, x, y + r, segs));
    arc(x + r, y + r, Math.PI, Math.PI * 1.5);
  } else {
    pts = [
      ...seg(x, y, x + w, y, segs),
      ...seg(x + w, y, x + w, y + h, segs),
      ...seg(x + w, y + h, x, y + h, segs),
      ...seg(x, y + h, x, y, segs),
    ];
  }
  pts = jitter(rng, pts, amp);
  return `<path d="${toPath(pts, true)}" fill="${fillC}" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round" opacity="${opacity}"/>`;
}

export function ellipse(rng, cx, cy, rx, ry, o = {}) {
  const { amp = 1.3, stroke = 3, color = INK, opacity = 1, fill, segs = 30, rot = 0 } = o;
  const fillC = shapeFill(fill);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  const j = jitter(rng, pts, amp);
  j[j.length - 1] = j[0];
  return `<path d="${toPath(j, true)}" fill="${fillC}" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round" opacity="${opacity}"/>`;
}

/** A cloud / blob: radius modulated by a few low-frequency harmonics. */
export function blob(rng, cx, cy, rx, ry, o = {}) {
  const { amp = 1.2, stroke = 3, color = INK, opacity = 1, fill, segs = 48, lobes = 5, depth = 0.16 } = o;
  const fillC = shapeFill(fill);
  const phase = rng() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const k = 1 + Math.sin(a * lobes + phase) * depth + Math.sin(a * (lobes * 2.3) + phase * 1.7) * depth * 0.35;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const j = jitter(rng, pts, amp);
  j[j.length - 1] = j[0];
  return `<path d="${toPath(j, true)}" fill="${fillC}" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round" opacity="${opacity}"/>`;
}

/**
 * A cartoon cloud: a flat base with a scalloped top.
 *
 * The top is a chain of half-arcs that SHARE endpoints along a baseline, so the
 * lobes meet cleanly instead of leaving little "legs". (An implicit-union
 * ray-cast was tried first, but it can only trace star-shaped outlines, so the
 * lobes smoothed into a rounded rectangle.)
 */
export function cloud(rng, cx, cy, w, h, o = {}) {
  const { bumps = 4, amp = 1.0, stroke = 3, color = INK, opacity = 1, fill = PAPER, segs = 12 } = o;
  const fillC = shapeFill(fill);
  const baseY = cy + h * 0.44;
  const topY = cy - h * 0.06;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const step = (x1 - x0) / bumps;
  const pts = [[x0, baseY], [x0, topY]];
  for (let i = 0; i < bumps; i++) {
    const t = bumps === 1 ? 0.5 : i / (bumps - 1);
    const r = step / 2;
    const mx = x0 + step * (i + 0.5);
    // middle lobes stand taller than the edge ones
    const rise = r * (0.55 + 0.75 * Math.sin(Math.PI * (0.18 + 0.64 * t)));
    for (let k = 0; k <= segs; k++) {
      const a = Math.PI - (k / segs) * Math.PI; // pi (left) -> 0 (right)
      pts.push([mx + Math.cos(a) * r, topY - Math.sin(a) * rise]);
    }
  }
  pts.push([x1, topY], [x1, baseY]);
  const j = jitter(rng, pts, amp);
  return `<path d="${toPath(j, true)}" fill="${fillC}" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round" opacity="${opacity}"/>`;
}

/** A single bowed stroke — for waves, whiskers, motion lines. */
export function arc(rng, x1, y1, x2, y2, bulge = 8, o = {}) {
  const { amp = 0.9, stroke = 2, color = INK_SOFT, opacity = 1, segs = 8 } = o;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const bow = Math.sin(Math.PI * t) * bulge;
    pts.push([x1 + dx * t + nx * bow, y1 + dy * t + ny * bow]);
  }
  const j = jitter(rng, pts, amp);
  return `<path d="${toPath(j)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" opacity="${opacity}"/>`;
}

export function poly(rng, pts, o = {}) {
  const { amp = 1.5, stroke = 3, color = INK, opacity = 1, fill, closed = true } = o;
  const fillC = shapeFill(closed ? fill : 'none');
  const j = jitter(rng, pts, amp);
  return `<path d="${toPath(j, closed)}" fill="${fillC}" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round" opacity="${opacity}"/>`;
}

/**
 * Liang–Barsky: clip a segment to an axis-aligned rect.
 * Returns [x1,y1,x2,y2] or null when fully outside.
 */
export function clipSegment(x1, y1, x2, y2, rx, ry, rw, rh) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}

/** Clip a segment to an ellipse (quadratic roots). Returns [x1,y1,x2,y2] or null. */
export function clipSegmentEllipse(x1, y1, x2, y2, cx, cy, rx, ry) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = (x1 - cx) / rx;
  const fy = (y1 - cy) / ry;
  const gx = dx / rx;
  const gy = dy / ry;
  const a = gx * gx + gy * gy;
  const b = 2 * (fx * gx + fy * gy);
  const c = fx * fx + fy * fy - 1;
  if (a === 0) return c <= 0 ? [x1, y1, x2, y2] : null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  let t0 = (-b - sq) / (2 * a);
  let t1 = (-b + sq) / (2 * a);
  if (t1 < 0 || t0 > 1) return null;
  t0 = Math.max(t0, 0);
  t1 = Math.min(t1, 1);
  if (t1 <= t0) return null;
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}

/**
 * Parallel shading strokes inside a box.
 * Clipped analytically to the box by default — without this the strokes spill
 * out diagonally and the whole drawing reads as noise.
 * Pass `ellipse: {cx,cy,rx,ry}` to clip to an elliptical face instead.
 */
export function hatch(rng, x, y, w, h, o = {}) {
  const {
    angle = -Math.PI / 4, gap = 9, stroke = 1.6, color = INK_SOFT, opacity = 0.5,
    amp = 0.8, clip = true, inset = 0, ellipse = null,
  } = o;
  const diag = Math.hypot(w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const out = [];
  for (let d = -diag / 2; d <= diag / 2; d += gap) {
    const ox = -dy * d;
    const oy = dx * d;
    const len = diag / 2;
    let ax = cx + ox - dx * len;
    let ay = cy + oy - dy * len;
    let bx = cx + ox + dx * len;
    let by = cy + oy + dy * len;
    if (ellipse) {
      const c = clipSegmentEllipse(ax, ay, bx, by, ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry);
      if (!c) continue;
      [ax, ay, bx, by] = c;
    } else if (clip) {
      const c = clipSegment(ax, ay, bx, by, x + inset, y + inset, w - inset * 2, h - inset * 2);
      if (!c) continue;
      [ax, ay, bx, by] = c;
    }
    if (Math.hypot(bx - ax, by - ay) < 2) continue;
    out.push(line(rng, ax, ay, bx, by, { amp, segs: 3, stroke, color, opacity }));
  }
  return out.join('');
}

/** Cross-hatch, for darker shading. */
export function crossHatch(rng, x, y, w, h, o = {}) {
  return (
    hatch(rng, x, y, w, h, o) +
    hatch(rng, x, y, w, h, { ...o, angle: (o.angle ?? -Math.PI / 4) + Math.PI / 2, opacity: (o.opacity ?? 0.5) * 0.7 })
  );
}

/** Closed organic region from a list of outline points, with a wobbly edge. */
export function region(rng, pts, o = {}) {
  const { amp = 2, stroke = 3, color = INK, fill, opacity = 1 } = o;
  const fillC = shapeFill(fill);
  const j = jitter(rng, pts, amp);
  return `<path d="${toPath(j, true)}" fill="${fillC}" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round" opacity="${opacity}"/>`;
}

/* ------------------------------------------------------------------ *
 * Compositing
 * ------------------------------------------------------------------ */

export function group(body, { x = 0, y = 0, scale = 1, rotate = 0, opacity = 1 } = {}) {
  const t = `translate(${n(x)},${n(y)}) rotate(${n(rotate)}) scale(${n(scale)})`;
  return `<g transform="${t}" opacity="${opacity}">${body}</g>`;
}

export function svgDoc(w, h, body, { bg = PAPER } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${
    bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''
  }${body}</svg>`;
}

/* ------------------------------------------------------------------ *
 * Rasterisation
 * ------------------------------------------------------------------ */

/**
 * Rasterise SVG markup to WebP.
 * `grain` composites a subtle paper-noise layer underneath so flat areas read
 * as paper rather than as vector fill.
 */
export async function render(svgStr, outPath, { width = 1024, quality = 88 } = {}) {
  mkdirSync(dirname(outPath), { recursive: true });
  const img = sharp(Buffer.from(svgStr), { density: 300 }).resize({ width, fit: 'inside' });
  await img.webp({ quality, effort: 4 }).toFile(outPath);
  return outPath;
}

/** Raw RGBA noise buffer (used for paper grain / texture layers). */
export function noiseBuffer(w, h, rng, { base = 250, spread = 7 } = {}) {
  const buf = Buffer.allocUnsafe(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = base + Math.round((rng() - 0.5) * 2 * spread);
    const c = v < 0 ? 0 : v > 255 ? 255 : v;
    buf[i * 4] = c;
    buf[i * 4 + 1] = c;
    buf[i * 4 + 2] = c;
    buf[i * 4 + 3] = 255;
  }
  return buf;
}

/** Value-noise field, smooth, for paper fibre / water ripple. */
export function valueNoise(w, h, rng, { cells = 16, octaves = 4, gain = 0.5, base = 250, spread = 10 } = {}) {
  const grids = [];
  for (let o = 0; o < octaves; o++) {
    const c = Math.max(2, Math.round(cells * Math.pow(2, o)));
    const g = new Float32Array((c + 1) * (c + 1));
    for (let i = 0; i < g.length; i++) g[i] = rng();
    grids.push({ c, g });
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  const sample = ({ c, g }, u, v) => {
    const x = u * c;
    const y = v * c;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const at = (xx, yy) => g[Math.min(c, Math.max(0, yy)) * (c + 1) + Math.min(c, Math.max(0, xx))];
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const cc = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
  };
  const buf = Buffer.allocUnsafe(w * h * 4);
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    norm += amp;
    amp *= gain;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      let s = 0;
      let a = 1;
      for (let o = 0; o < octaves; o++) {
        s += sample(grids[o], u, v) * a;
        a *= gain;
      }
      s /= norm;
      const val = base + (s - 0.5) * 2 * spread;
      const c = val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
      const i = (y * w + x) * 4;
      buf[i] = c;
      buf[i + 1] = c;
      buf[i + 2] = c;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/** Write a raw RGBA buffer to WebP. */
export async function renderRaw(buf, w, h, outPath, { quality = 88, blur = 0 } = {}) {
  mkdirSync(dirname(outPath), { recursive: true });
  let p = sharp(buf, { raw: { width: w, height: h, channels: 4 } });
  if (blur) p = p.blur(blur);
  await p.webp({ quality, effort: 4 }).toFile(outPath);
  return outPath;
}
