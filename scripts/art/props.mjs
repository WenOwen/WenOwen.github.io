/**
 * props.mjs — reusable hand-drawn "prop" builders.
 *
 * Each builder takes (rng, W, H, opts) and returns SVG markup sized to fill a
 * W×H canvas, so the caller can render at whatever aspect the engine expects.
 * Everything here is original line art generated from primitives in doodle.mjs.
 */
import {
  makeRng, seedFrom, jitter, seg, toPath, line, rect, ellipse, cloud, poly, hatch,
  crossHatch, arc, blob, svgDoc, render, renderRaw, valueNoise, group,
  INK, INK_SOFT, INK_FAINT, PAPER, PAPER_DIM, RENDER_OPTS,
} from './doodle.mjs';

export { makeRng, seedFrom, line, rect, ellipse, cloud, poly, hatch, crossHatch, arc, blob, group, svgDoc, render, renderRaw, valueNoise, INK, INK_SOFT, INK_FAINT, PAPER, PAPER_DIM };

/* ================================================================== *
 * Shared helpers
 * ================================================================== */

/**
 * Global render options live in doodle.mjs (the shape primitives read them to
 * decide the default fill). Re-exported here so callers have one import site.
 *
 * `transparent` must be set before building a prop that is a cut-out: the
 * upstream textures are drawings on transparent canvases, and if we paint a
 * paper background the prop renders as an opaque rectangle that occludes the
 * rest of the scene. Walls, floors and cards stay opaque.
 */
export { RENDER_OPTS };

/** Wrap a shape body in a full SVG document, honouring RENDER_OPTS.transparent. */
export function scene(W, H, body, { bg } = {}) {
  const background = bg !== undefined ? bg : (RENDER_OPTS.transparent ? null : PAPER);
  return svgDoc(W, H, body, { bg: background });
}

/** Small hand-drawn tick/plus used as incidental texture on surfaces. */
export function speckle(rng, W, H, count = 40, { color = INK_FAINT, opacity = 0.5, len = 10 } = {}) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const a = rng() * Math.PI;
    s += line(rng, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, { stroke: 1.6, color, opacity, amp: 0.6, segs: 2 });
  }
  return s;
}

/** A label rendered as plain stroked text (SVG <text> works in librsvg). */
export function label(text, x, y, o = {}) {
  const { size = 40, color = INK, anchor = 'middle', weight = '700', family = 'Segoe UI, Arial, sans-serif', opacity = 1, spacing = 2 } = o;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}">${String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
}

/* ================================================================== *
 * Surface / texture builders
 * ================================================================== */

/** Brick wall tile with running bond, deliberately wobbly so it reads as drawn. */
export function bricksWall(rng, W, H, o = {}) {
  const { rowH = H / 11, brickW = W / 9.8, stroke = 2.6, color = '#3a3630', bg = PAPER_DIM } = o;
  let b = '';
  let row = 0;
  for (let y = -rowH; y < H + rowH; y += rowH, row++) {
    const off = row % 2 ? brickW * 0.5 : 0;
    for (let x = -brickW + off; x < W + brickW; x += brickW) {
      b += rect(rng, x, y, brickW, rowH, { amp: 1.9, stroke, color, radius: 2 });
    }
  }
  return scene(W, H, b, { bg });
}

/** Rough paper floor: long fibres plus faint creases. */
export function paperFloor(rng, W, H, o = {}) {
  const { bg = PAPER, creases = 14 } = o;
  let b = '';
  for (let i = 0; i < creases; i++) {
    const y = (i / creases) * H + rng() * 10;
    b += line(rng, -20, y, W + 20, y + (rng() - 0.5) * 22, { amp: 3, segs: 9, stroke: 1.4, color: INK_FAINT, opacity: 0.5 });
  }
  b += speckle(rng, W, H, 90, { opacity: 0.35, len: 14 });
  return scene(W, H, b, { bg });
}

/** Irregular stone slab path, drawn as fitted polygons. */
export function stonePath(rng, W, H, o = {}) {
  const { cols = 3, rows = 7, bg = PAPER } = o;
  let b = '';
  const cw = W / cols;
  const ch = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + (rng() - 0.5) * cw * 0.16;
      const y = r * ch + (rng() - 0.5) * ch * 0.14;
      const w = cw * (0.86 + rng() * 0.1);
      const h = ch * (0.84 + rng() * 0.12);
      const pts = [
        [x + w * 0.1, y], [x + w * 0.92, y + h * 0.06],
        [x + w, y + h * 0.86], [x + w * 0.22, y + h],
        [x, y + h * 0.3],
      ];
      b += poly(rng, pts, { amp: 3.4, stroke: 3, color: '#4a453e' });
    }
  }
  return scene(W, H, b, { bg });
}

/** Interior wall: vertical panels + faint seams. */
export function wallTexture(rng, W, H, o = {}) {
  const { bg = PAPER_DIM, panels = 6 } = o;
  let b = '';
  for (let i = 0; i <= panels; i++) {
    const x = (i / panels) * W;
    b += line(rng, x, 0, x, H, { amp: 2.2, segs: 10, stroke: 1.8, color: INK_FAINT, opacity: 0.7 });
  }
  for (let i = 0; i < 3; i++) {
    const y = (i + 1) / 4 * H;
    b += line(rng, 0, y, W, y, { amp: 2.4, segs: 12, stroke: 1.4, color: INK_FAINT, opacity: 0.45 });
  }
  b += speckle(rng, W, H, 60, { opacity: 0.28, len: 18 });
  return scene(W, H, b, { bg });
}

/** Ceiling: repeated beam + panel rhythm. */
export function ceilingTexture(rng, W, H, o = {}) {
  const { bg = PAPER_DIM, beams = 7 } = o;
  let b = '';
  for (let i = 0; i <= beams; i++) {
    const x = (i / beams) * W;
    b += line(rng, x, 0, x, H, { amp: 2.6, segs: 8, stroke: 3.2, color: '#3f3a34' });
    b += line(rng, x + 7, 0, x + 7, H, { amp: 2.2, segs: 8, stroke: 1.2, color: INK_SOFT, opacity: 0.5 });
  }
  return scene(W, H, b, { bg });
}

/** Top-down water: rows of layered wave strokes, denser than random scatter. */
export function waterSurface(rng, W, H, o = {}) {
  const { bg = PAPER, rows = 26 } = o;
  let b = '';
  const rowH = H / rows;
  for (let r = 0; r < rows; r++) {
    const y = rowH * (r + 0.5);
    const perRow = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < perRow; i++) {
      const x = rng() * W;
      const len = W * (0.05 + rng() * 0.09);
      const amp = rowH * (0.28 + rng() * 0.5);
      b += arc(rng, x, y, x + len, y, (rng() > 0.5 ? 1 : -1) * amp, {
        stroke: 1.7 + rng() * 1.1,
        color: INK_SOFT,
        opacity: 0.4 + rng() * 0.35,
        amp: 1.1,
        segs: 6,
      });
      // occasional crest tick for texture
      if (rng() > 0.82) {
        b += line(rng, x + len * 0.5, y - amp * 0.55, x + len * 0.5, y - amp * 0.95, { stroke: 1.4, color: INK_FAINT, opacity: 0.6 });
      }
    }
  }
  return scene(W, H, b, { bg });
}

/** Wood planks for floors and desk legs. */
export function woodPlanks(rng, W, H, o = {}) {
  const { bg = PAPER_DIM, planks = 6, vertical = false } = o;
  let b = '';
  const n = planks;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (vertical ? W : H);
    if (vertical) b += line(rng, t, 0, t, H, { amp: 2, segs: 8, stroke: 2.4, color: '#463f37' });
    else b += line(rng, 0, t, W, t, { amp: 2, segs: 10, stroke: 2.4, color: '#463f37' });
  }
  for (let i = 0; i < n * 3; i++) {
    const y = rng() * H;
    b += line(rng, 0, y, W, y, { amp: 1.6, segs: 6, stroke: 1, color: INK_SOFT, opacity: 0.35 });
  }
  return scene(W, H, b, { bg });
}

/* ================================================================== *
 * Object faces (mapped onto boxes by the 3D scene)
 * ================================================================== */

/** Optional shading pass for "painted" texture variants. */
function shade(rng, x, y, w, h, painted, opts = {}) {
  if (!painted) return '';
  return hatch(rng, x, y, w, h, { gap: Math.max(9, w / 12), opacity: 0.32, stroke: 1.6, inset: 4, ...opts });
}

/** Door leaf: panels, handle, and a hinged look. */
export function doorFace(rng, W, H, { painted = false, kind = 'about' } = {}) {
  const pad = W * 0.06;
  let b = '';
  b += rect(rng, pad, H * 0.02, W - pad * 2, H * 0.96, { radius: W * 0.03, stroke: 4 });
  b += rect(rng, pad * 1.9, H * 0.06, W - pad * 3.8, H * 0.36, { radius: 4, stroke: 3 });
  b += rect(rng, pad * 1.9, H * 0.47, W - pad * 3.8, H * 0.45, { radius: 4, stroke: 3 });
  b += shade(rng, W * 0.2, H * 0.08, W * 0.6, H * 0.32, painted);
  // handle
  b += ellipse(rng, W - pad * 2.6, H * 0.47, W * 0.035, W * 0.035, { stroke: 3 });
  b += line(rng, W - pad * 2.6, H * 0.47, W - pad * 2.6, H * 0.53, { stroke: 3 });
  // a small drawn pictogram telling you which room this is
  b += roomGlyph(rng, W / 2, H * 0.24, Math.min(W, H) * 0.12, kind);
  return scene(W, H, b);
}

/** Tiny room pictogram for door panels. */
export function roomGlyph(rng, cx, cy, r, kind) {
  let g = '';
  if (kind === 'projekty') {
    // stacked picture frames
    g += rect(rng, cx - r, cy - r * 0.75, r * 2, r * 1.3, { stroke: 2.6 });
    g += poly(rng, [[cx - r * 0.6, cy + r * 0.3], [cx - r * 0.1, cy - r * 0.35], [cx + r * 0.35, cy + r * 0.3]], { stroke: 2.4, closed: false });
  } else if (kind === 'about') {
    g += ellipse(rng, cx, cy - r * 0.3, r * 0.42, r * 0.42, { stroke: 2.6 });
    g += arc(rng, cx - r * 0.8, cy + r * 0.85, cx + r * 0.8, cy + r * 0.85, -r * 0.55, { stroke: 2.6, color: INK });
  } else if (kind === 'kontakt') {
    g += rect(rng, cx - r, cy - r * 0.6, r * 2, r * 1.2, { stroke: 2.6, radius: 4 });
    g += poly(rng, [[cx - r, cy - r * 0.6], [cx, cy + r * 0.2], [cx + r, cy - r * 0.6]], { stroke: 2.6, closed: false });
  } else {
    // social: three dots + arcs (a "share" mark)
    for (const [dx, dy] of [[-r * 0.6, -r * 0.5], [r * 0.55, 0], [-r * 0.6, r * 0.5]]) {
      g += ellipse(rng, cx + dx, cy + dy, r * 0.22, r * 0.22, { stroke: 2.4 });
    }
    g += line(rng, cx - r * 0.42, cy - r * 0.42, cx + r * 0.36, cy - r * 0.06, { stroke: 2 });
    g += line(rng, cx - r * 0.42, cy + r * 0.42, cx + r * 0.36, cy + r * 0.06, { stroke: 2 });
  }
  return g;
}

/** Monitor / TV / phone box faces. */
export function boxFace(rng, W, H, { face = 'front', kind = 'monitor', painted = false } = {}) {
  const line0 = { stroke: 3 };
  let b = '';
  if (face === 'front') {
    const bez = Math.max(4, W * 0.025);
    b += rect(rng, 0, 0, W, H, { radius: W * 0.02, stroke: 3.5 });
    b += rect(rng, bez, bez, W - bez * 2, H - bez * 2, { radius: W * 0.015, stroke: 3 });
    if (kind === 'phone') {
      b += rect(rng, W * 0.08, H * 0.06, W * 0.84, H * 0.1, { radius: 6, stroke: 2.4 });
      b += ellipse(rng, W / 2, H * 0.955, W * 0.06, W * 0.06, { stroke: 2.4 });
    } else {
      // screen content: rows of "text" and a chart
      const rows = kind === 'tv' ? 8 : 10;
      for (let i = 0; i < rows; i++) {
        const y = bez * 2.2 + (i / rows) * (H - bez * 4);
        const wl = W * (0.28 + rng() * 0.5);
        b += line(rng, bez * 2.4, y, bez * 2.4 + wl, y, { stroke: 2.2, color: INK_SOFT, opacity: 0.8, amp: 0.9 });
      }
      b += poly(rng, [
        [W * 0.62, H * 0.78], [W * 0.72, H * 0.6], [W * 0.82, H * 0.68], [W * 0.9, H * 0.5],
      ], { stroke: 2.6, closed: false });
      if (kind === 'tv') b += rect(rng, W * 0.06, H * 0.86, W * 0.2, H * 0.07, { radius: 3, stroke: 2 });
    }
    if (painted) b += hatch(rng, bez, bez, W - bez * 2, H - bez * 2, { gap: Math.max(12, W / 16), opacity: 0.22, stroke: 1.6 });
  } else if (face === 'back') {
    b += rect(rng, 0, 0, W, H, { radius: W * 0.02, stroke: 3.5 });
    b += ellipse(rng, W * 0.5, H * 0.45, W * 0.13, H * 0.13, { stroke: 2.6 });
    for (let i = 0; i < 5; i++) {
      b += line(rng, W * 0.12, H * (0.7 + i * 0.04), W * (0.4 + rng() * 0.4), H * (0.7 + i * 0.04), { stroke: 2, color: INK_SOFT, opacity: 0.7 });
    }
    if (painted) b += hatch(rng, 4, 4, W - 8, H - 8, { gap: Math.max(12, W / 14), opacity: 0.2, stroke: 1.6 });
  } else if (face === 'side' || face === 'left' || face === 'right') {
    b += rect(rng, 0, 0, W, H, { radius: W * 0.04, stroke: 3 });
    b += line(rng, W * 0.5, H * 0.05, W * 0.5, H * 0.95, { stroke: 1.6, color: INK_FAINT, opacity: 0.6 });
    if (painted) b += hatch(rng, 3, 3, W - 6, H - 6, { gap: Math.max(9, W / 4), opacity: 0.28, stroke: 1.6, angle: -Math.PI / 6 });
  } else {
    // top / bottom
    b += rect(rng, 0, 0, W, H, { radius: Math.min(W, H) * 0.06, stroke: 3 });
    if (painted) b += hatch(rng, 3, 3, W - 6, H - 6, { gap: Math.max(9, H / 3), opacity: 0.26, stroke: 1.6 });
  }
  return scene(W, H, b);
}

/* ================================================================== *
 * Badges, balloons, cards
 * ================================================================== */

/** A tech logo, redrawn as an original badge: rounded tile + initials. */
export function logoBadge(rng, W, H, { name = '', painted = false } = {}) {
  const s = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  let b = '';
  b += rect(rng, cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84, { radius: s * 0.16, stroke: 3.4 });
  b += label(name, cx, cy + s * 0.11, { size: s * 0.3, weight: '800' });
  if (painted) b += hatch(rng, cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84, { gap: s * 0.08, opacity: 0.25, stroke: 1.5, inset: 4 });
  return scene(W, H, b);
}

/** A balloon carrying a tech name — About room decoration. */
export function balloon(rng, W, H, { name = '', painted = false, big = false } = {}) {
  const cx = W / 2;
  const ry = H * 0.36;
  const rx = W * 0.36;
  const cy = H * 0.38;
  let b = '';
  b += ellipse(rng, cx, cy, rx, ry, { stroke: 3.4 });
  b += poly(rng, [[cx - rx * 0.12, cy + ry * 0.98], [cx + rx * 0.12, cy + ry * 0.98], [cx, cy + ry * 1.16]], { stroke: 3 });
  b += arc(rng, cx, cy + ry * 1.16, cx + rx * 0.24, H * 0.97, rx * 0.3, { stroke: 2.4, color: INK_SOFT });
  b += label(name, cx, cy + ry * 0.16, { size: Math.min(W, H) * (big ? 0.16 : 0.14), weight: '800' });
  // highlight
  b += arc(rng, cx - rx * 0.55, cy - ry * 0.45, cx - rx * 0.15, cy - ry * 0.72, -rx * 0.2, { stroke: 3, color: INK_SOFT, opacity: 0.6 });
  if (painted) b += hatch(rng, cx - rx * 0.7, cy - ry * 0.2, rx * 1.4, ry * 1.1, { gap: Math.max(12, W / 18), opacity: 0.22, stroke: 1.6, ellipse: { cx, cy: cy + ry * 0.4, rx: rx * 0.72, ry: ry * 0.55 } });
  return scene(W, H, b);
}

/** Award certificate plate (Site of the Day etc.). */
export function certificate(rng, W, H, { title = 'SITE OF THE DAY', sub = '' } = {}) {
  const pad = Math.min(W, H) * 0.07;
  let b = '';
  b += rect(rng, pad, pad, W - pad * 2, H - pad * 2, { stroke: 4 });
  b += rect(rng, pad * 1.7, pad * 1.7, W - pad * 3.4, H - pad * 3.4, { stroke: 2.2, color: INK_SOFT });
  b += label(title, W / 2, H * 0.5, { size: Math.min(W * 0.1, H * 0.2), weight: '800' });
  // laurels
  const ly = H * 0.5;
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const x = W / 2 + dir * (W * 0.24 + t * W * 0.06);
      const y = ly + H * 0.16 - t * H * 0.32;
      b += arc(rng, x, y, x + dir * W * 0.04, y - H * 0.03, dir * 8, { stroke: 2.6, color: INK });
    }
  }
  if (sub) b += label(sub, W / 2, H * 0.66, { size: Math.min(W * 0.045, H * 0.09), weight: '600', color: INK_SOFT });
  b += line(rng, W * 0.3, H * 0.74, W * 0.7, H * 0.74, { stroke: 2 });
  return scene(W, H, b);
}

/** A project card hanging in the gallery: frame, title, thumbnail, tech row. */
export function projectCard(rng, W, H, { title = '', blurb = '', tech = [], painted = false } = {}) {
  const pad = W * 0.06;
  let b = '';
  b += rect(rng, pad, pad, W - pad * 2, H - pad * 2, { stroke: 4, radius: 4 });
  b += rect(rng, pad * 1.3, pad * 1.3, W - pad * 2.6, H * 0.46, { stroke: 3 });
  // thumbnail: an abstract "screen" drawing
  const tx = pad * 1.3;
  const ty = pad * 1.3;
  const tw = W - pad * 2.6;
  const th = H * 0.46;
  b += poly(rng, [
    [tx + tw * 0.08, ty + th * 0.78], [tx + tw * 0.3, ty + th * 0.36],
    [tx + tw * 0.52, ty + th * 0.62], [tx + tw * 0.74, ty + th * 0.24], [tx + tw * 0.92, ty + th * 0.78],
  ], { stroke: 2.6, closed: true });
  b += line(rng, tx + tw * 0.1, ty + th * 0.86, tx + tw * 0.9, ty + th * 0.86, { stroke: 2, color: INK_SOFT });
  // title
  b += label(title, W / 2, H * 0.64, { size: W * 0.088, weight: '800' });
  if (blurb) {
    const words = blurb.split(/\s+/);
    const lines = [];
    let cur = '';
    const maxChars = Math.max(18, Math.round(W / (W * 0.032)));
    for (const wd of words) {
      if ((cur + ' ' + wd).trim().length > maxChars) { lines.push(cur.trim()); cur = wd; }
      else cur += ' ' + wd;
    }
    if (cur.trim()) lines.push(cur.trim());
    lines.slice(0, 5).forEach((ln, i) => {
      b += label(ln, W / 2, H * 0.7 + i * W * 0.05, { size: W * 0.032, weight: '400', color: INK_SOFT, spacing: 0 });
    });
  }
  // tech row
  const n = Math.max(1, tech.length);
  tech.slice(0, 4).forEach((t, i) => {
    const x = pad * 1.6 + (i / Math.min(4, n)) * (W - pad * 3.2);
    b += rect(rng, x, H * 0.88, W * 0.12, W * 0.06, { radius: 3, stroke: 2 });
    b += label(t, x + W * 0.06, H * 0.92, { size: W * 0.028, weight: '700', color: INK_SOFT, spacing: 0 });
  });
  if (painted) b += hatch(rng, pad * 1.35, H * 0.62, W - pad * 2.7, H * 0.32, { gap: W * 0.05, opacity: 0.2, stroke: 1.5 });
  return scene(W, H, b);
}

/* ================================================================== *
 * Scene props
 * ================================================================== */

export function catSketch(rng, W, H, { pose = 'sit' } = {}) {
  const cx = W / 2;
  const cy = H * 0.42;
  const r = Math.min(W, H) * 0.2;
  let b = '';
  b += ellipse(rng, cx, cy, r, r * 0.9, { stroke: 3.6 });
  b += poly(rng, [[cx - r * 0.82, cy - r * 0.45], [cx - r * 1.0, cy - r * 1.35], [cx - r * 0.3, cy - r * 0.78]], { stroke: 3.4 });
  b += poly(rng, [[cx + r * 0.82, cy - r * 0.45], [cx + r * 1.0, cy - r * 1.35], [cx + r * 0.3, cy - r * 0.78]], { stroke: 3.4 });
  const eye = pose === 'blink' ? 1.5 : r * 0.11;
  b += ellipse(rng, cx - r * 0.36, cy - r * 0.1, r * 0.11, eye, { stroke: 2.6, fill: pose === 'blink' ? 'none' : INK });
  b += ellipse(rng, cx + r * 0.36, cy - r * 0.1, r * 0.11, eye, { stroke: 2.6, fill: pose === 'blink' ? 'none' : INK });
  b += poly(rng, [[cx - r * 0.09, cy + r * 0.16], [cx + r * 0.09, cy + r * 0.16], [cx, cy + r * 0.28]], { stroke: 2.2, fill: INK_SOFT });
  if (pose === 'meow') {
    b += ellipse(rng, cx, cy + r * 0.5, r * 0.2, r * 0.24, { stroke: 2.6 });
  } else {
    b += arc(rng, cx - r * 0.2, cy + r * 0.38, cx, cy + r * 0.44, 4, { stroke: 2.2, color: INK });
    b += arc(rng, cx, cy + r * 0.44, cx + r * 0.2, cy + r * 0.38, -4, { stroke: 2.2, color: INK });
  }
  // whiskers
  for (const s of [-1, 1]) {
    b += line(rng, cx + s * r * 0.3, cy + r * 0.24, cx + s * r * 1.15, cy + r * 0.12, { stroke: 1.6, color: INK_SOFT, opacity: 0.7 });
    b += line(rng, cx + s * r * 0.3, cy + r * 0.3, cx + s * r * 1.1, cy + r * 0.38, { stroke: 1.6, color: INK_SOFT, opacity: 0.7 });
  }
  // body
  const by = cy + r * 1.0;
  b += poly(rng, [[cx - r * 0.86, by], [cx - r * 0.8, by + r * 2.0], [cx + r * 0.8, by + r * 2.0], [cx + r * 0.86, by]], { stroke: 3.6, radius: 0 });
  b += arc(rng, cx + r * 0.86, by + r * 1.1, cx + r * 2.0, by + r * 0.5, -r * 0.6, { stroke: 3.6, color: INK });
  for (const dx of [-0.4, 0.4]) {
    b += line(rng, cx + r * dx, by + r * 2.0, cx + r * dx, by + r * 2.3, { stroke: 3.4 });
  }
  b += ellipse(rng, cx - r * 0.45, by + r * 2.25, r * 0.24, r * 0.14, { stroke: 2.6 });
  b += ellipse(rng, cx + r * 0.45, by + r * 2.25, r * 0.24, r * 0.14, { stroke: 2.6 });
  return scene(W, H, b);
}

export function treeSketch(rng, W, H) {
  const cx = W * 0.5;
  let b = '';
  b += poly(rng, [[cx - W * 0.055, H * 0.98], [cx - W * 0.03, H * 0.45], [cx + W * 0.03, H * 0.45], [cx + W * 0.055, H * 0.98]], { stroke: 3.6 });
  // branches
  const branches = [
    [cx, H * 0.5, cx - W * 0.24, H * 0.34],
    [cx, H * 0.46, cx + W * 0.26, H * 0.3],
    [cx, H * 0.42, cx - W * 0.14, H * 0.22],
    [cx, H * 0.4, cx + W * 0.12, H * 0.18],
  ];
  for (const [x1, y1, x2, y2] of branches) {
    b += line(rng, x1, y1, x2, y2, { stroke: 3, amp: 3, segs: 6 });
  }
  // canopy: overlapping clouds
  b += cloud(rng, cx, H * 0.24, W * 0.78, H * 0.3, { bumps: 5, stroke: 3.2, fill: PAPER });
  b += cloud(rng, cx - W * 0.17, H * 0.32, W * 0.42, H * 0.2, { bumps: 4, stroke: 3, fill: PAPER });
  b += cloud(rng, cx + W * 0.19, H * 0.29, W * 0.4, H * 0.2, { bumps: 4, stroke: 3, fill: PAPER });
  return scene(W, H, b);
}

export function mouseHanging(rng, W, H) {
  const cx = W / 2;
  const cy = H * 0.55;
  const rx = W * 0.22;
  const ry = H * 0.3;
  let b = '';
  b += line(rng, cx, 0, cx, cy - ry, { stroke: 2 });
  b += ellipse(rng, cx, cy, rx, ry, { stroke: 3.6 });
  b += line(rng, cx, cy - ry, cx, cy - ry * 0.35, { stroke: 2.6 });
  b += rect(rng, cx - rx * 0.12, cy - ry * 0.62, rx * 0.24, ry * 0.3, { radius: rx * 0.1, stroke: 2.4 });
  return scene(W, H, b);
}

export function potWithDuck(rng, W, H) {
  const cx = W / 2;
  let b = '';
  const py = H * 0.62;
  b += poly(rng, [[cx - W * 0.3, py], [cx - W * 0.25, H * 0.97], [cx + W * 0.25, H * 0.97], [cx + W * 0.3, py]], { stroke: 3.6 });
  b += rect(rng, cx - W * 0.32, py - H * 0.05, W * 0.64, H * 0.06, { stroke: 3.4, radius: 4 });
  b += hatch(rng, cx - W * 0.28, py + H * 0.04, W * 0.56, H * 0.3, { gap: 16, opacity: 0.3, stroke: 1.6 });
  // plants
  for (let i = 0; i < 9; i++) {
    const x = cx - W * 0.26 + (i / 8) * W * 0.52;
    b += arc(rng, x, py - H * 0.04, x + (rng() - 0.5) * W * 0.1, py - H * (0.16 + rng() * 0.14), (rng() - 0.5) * 20, { stroke: 2.6, color: '#4a453e' });
  }
  // duck
  const dx = cx + W * 0.12;
  const dy = H * 0.5;
  b += ellipse(rng, dx, dy, W * 0.075, H * 0.07, { stroke: 3 });
  b += ellipse(rng, dx + W * 0.05, dy - H * 0.05, W * 0.042, H * 0.042, { stroke: 3 });
  b += poly(rng, [[dx + W * 0.09, dy - H * 0.05], [dx + W * 0.14, dy - H * 0.04], [dx + W * 0.09, dy - H * 0.03]], { stroke: 2.4 });
  b += ellipse(rng, dx + W * 0.062, dy - H * 0.056, W * 0.007, H * 0.008, { fill: INK, stroke: 1.6 });
  return scene(W, H, b);
}

export function signBoard(rng, W, H, { text = 'PORTFOLIO' } = {}) {
  const p = Math.min(W, H) * 0.08;
  let b = '';
  b += rect(rng, p, p, W - p * 2, H - p * 2, { stroke: 5, radius: 6 });
  b += rect(rng, p * 1.5, p * 1.5, W - p * 3, H - p * 3, { stroke: 2.4, color: INK_SOFT });
  b += label(text, W / 2, H * 0.58, { size: Math.min(W * 0.16, H * 0.42), weight: '800', spacing: W * 0.012 });
  return scene(W, H, b);
}

export function speechBubble(rng, W, H) {
  let b = '';
  b += ellipse(rng, W * 0.5, H * 0.44, W * 0.4, H * 0.34, { stroke: 3.6 });
  b += poly(rng, [[W * 0.38, H * 0.72], [W * 0.46, H * 0.72], [W * 0.34, H * 0.9]], { stroke: 3.4 });
  for (let i = 0; i < 3; i++) {
    b += ellipse(rng, W * (0.36 + i * 0.14), H * 0.46, W * 0.028, W * 0.028, { fill: INK, stroke: 2 });
  }
  return scene(W, H, b);
}

export function characterOnCloud(rng, W, H) {
  const r = H * 0.115;                 // head radius — scale the whole figure off this
  const fx = W * 0.42;
  const fy = H * 0.44;
  let b = '';
  // cloud first, so the figure can sit on top of it
  b += cloud(rng, W * 0.5, H * 0.74, W * 0.66, H * 0.3, { bumps: 5, stroke: 3.4, fill: PAPER });
  // reclining figure: head, torso, two legs, one arm behind the head
  b += ellipse(rng, fx, fy, r * 0.92, r, { stroke: 3.2 });
  b += arc(rng, fx, fy + r * 0.6, fx + r * 0.3, fy + r * 1.3, -r * 0.4, { stroke: 3, color: INK });
  // torso
  b += arc(rng, fx - r * 0.2, fy + r * 1.5, fx + r * 2.2, fy + r * 1.5, -r * 0.75, { stroke: 3.2, color: INK, segs: 10 });
  // legs, one bent
  b += line(rng, fx + r * 0.6, fy + r * 2.1, fx + r * 2.6, fy + r * 2.3, { stroke: 3, amp: 2 });
  b += line(rng, fx + r * 2.6, fy + r * 2.3, fx + r * 3.6, fy + r * 1.5, { stroke: 3, amp: 2 });
  b += line(rng, fx + r * 0.6, fy + r * 2.1, fx + r * 2.2, fy + r * 2.6, { stroke: 3 });
  b += line(rng, fx + r * 2.2, fy + r * 2.6, fx + r * 3.4, fy + r * 2.2, { stroke: 3 });
  // arm reaching back behind the head
  b += arc(rng, fx + r * 1.9, fy + r * 1.0, fx - r * 0.9, fy - r * 0.2, -r * 0.5, { stroke: 3, color: INK });
  // laptop resting on the lap
  b += poly(rng, [
    [fx + r * 1.3, fy + r * 1.9], [fx + r * 2.9, fy + r * 1.9],
    [fx + r * 3.2, fy + r * 1.0], [fx + r * 1.6, fy + r * 1.0],
  ], { stroke: 2.8 });
  b += line(rng, fx + r * 1.5, fy + r * 1.1, fx + r * 3.0, fy + r * 1.1, { stroke: 1.8, color: INK_SOFT, opacity: 0.8 });
  // a couple of small marks floating off the screen
  for (let i = 0; i < 3; i++) {
    b += line(rng, fx + r * (3.4 + i * 0.3), fy + r * (1.0 - i * 0.35), fx + r * (3.9 + i * 0.3), fy + r * (0.6 - i * 0.35), { stroke: 2, color: INK_FAINT });
  }
  return scene(W, H, b);
}

export function birdProp(rng, W, H) {
  const cx = W / 2;
  const cy = H * 0.5;
  let b = '';
  b += ellipse(rng, cx, cy, W * 0.22, H * 0.16, { stroke: 3.2 });
  b += ellipse(rng, cx + W * 0.18, cy - H * 0.08, W * 0.09, H * 0.09, { stroke: 3 });
  b += poly(rng, [[cx + W * 0.26, cy - H * 0.09], [cx + W * 0.36, cy - H * 0.06], [cx + W * 0.26, cy - H * 0.03]], { stroke: 2.4 });
  b += poly(rng, [[cx - W * 0.05, cy - H * 0.02], [cx + W * 0.1, cy - H * 0.22], [cx + W * 0.14, cy + H * 0.02]], { stroke: 2.8 });
  b += ellipse(rng, cx + W * 0.22, cy - H * 0.1, W * 0.014, W * 0.014, { fill: INK, stroke: 1.4 });
  b += poly(rng, [[cx - W * 0.22, cy + H * 0.02], [cx - W * 0.34, cy + H * 0.14], [cx - W * 0.18, cy + H * 0.1]], { stroke: 2.6 });
  return scene(W, H, b);
}

export function housesRow(rng, W, H) {
  let b = '';
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const x = t * W + W * 0.02;
    const w = W / n * 0.86;
    const h = H * (0.3 + rng() * 0.32);
    const y = H - h - H * 0.12;
    b += rect(rng, x, y, w, h, { stroke: 2.8, amp: 2 });
    b += poly(rng, [[x - w * 0.08, y], [x + w / 2, y - H * 0.16], [x + w * 1.08, y]], { stroke: 2.8, amp: 2 });
    if (i % 2 === 0) b += rect(rng, x + w * 0.15, y - H * 0.02, w * 0.22, H * 0.1, { stroke: 2.2 });
    b += rect(rng, x + w * 0.5, y + h * 0.3, w * 0.22, h * 0.3, { stroke: 2.2 });
  }
  b += line(rng, 0, H * 0.9, W, H * 0.9, { stroke: 3 });
  return scene(W, H, b);
}

export function citySkyline(rng, W, H) {
  let b = '';
  // distant towers
  for (let i = 0; i < 26; i++) {
    const x = (i / 26) * W + rng() * W * 0.02;
    const w = W * (0.012 + rng() * 0.03);
    const h = H * (0.14 + rng() * 0.46);
    b += rect(rng, x, H - h, w, h, { stroke: 2, color: INK_SOFT });
    for (let k = 1; k < 5; k++) {
      b += line(rng, x + w * 0.2, H - h + (k / 5) * h, x + w * 0.8, H - h + (k / 5) * h, { stroke: 1.2, color: INK_FAINT, opacity: 0.7 });
    }
    if (rng() > 0.7) b += line(rng, x + w / 2, H - h, x + w / 2, H - h - H * 0.05, { stroke: 1.8, color: INK_SOFT });
  }
  b += line(rng, 0, H * 0.985, W, H * 0.985, { stroke: 3 });
  return scene(W, H, b);
}

export function lighthouse(rng, W, H) {
  const cx = W / 2;
  let b = '';
  b += poly(rng, [[cx - W * 0.13, H * 0.34], [cx + W * 0.13, H * 0.34], [cx + W * 0.2, H * 0.9], [cx - W * 0.2, H * 0.9]], { stroke: 3.6 });
  b += rect(rng, cx - W * 0.15, H * 0.24, W * 0.3, H * 0.1, { stroke: 3.4 });
  b += poly(rng, [[cx - W * 0.13, H * 0.24], [cx + W * 0.13, H * 0.24], [cx, H * 0.16]], { stroke: 3.4 });
  b += hatch(rng, cx - W * 0.14, H * 0.4, W * 0.28, H * 0.1, { gap: 12, opacity: 0.45, stroke: 1.8 });
  b += hatch(rng, cx - W * 0.16, H * 0.6, W * 0.32, H * 0.1, { gap: 12, opacity: 0.45, stroke: 1.8 });
  // rocks
  b += poly(rng, [[cx - W * 0.3, H * 0.92], [cx - W * 0.16, H * 0.86], [cx + W * 0.14, H * 0.87], [cx + W * 0.3, H * 0.93], [cx + W * 0.26, H], [cx - W * 0.28, H]], { stroke: 3, amp: 3 });
  for (const s of [-1, 1]) {
    b += line(rng, cx + s * W * 0.1, H * 0.2, cx + s * W * 0.34, H * 0.15, { stroke: 2, color: INK_FAINT, opacity: 0.7 });
    b += line(rng, cx + s * W * 0.1, H * 0.24, cx + s * W * 0.34, H * 0.29, { stroke: 2, color: INK_FAINT, opacity: 0.7 });
  }
  return scene(W, H, b);
}

export function boatProp(rng, W, H) {
  const cx = W / 2;
  const cy = H * 0.62;
  let b = '';
  b += poly(rng, [[cx - W * 0.4, cy], [cx + W * 0.4, cy], [cx + W * 0.26, cy + H * 0.3], [cx - W * 0.26, cy + H * 0.3]], { stroke: 4 });
  b += poly(rng, [[cx, cy], [cx, cy - H * 0.46], [cx + W * 0.33, cy]], { stroke: 4 });
  b += poly(rng, [[cx, cy], [cx, cy - H * 0.4], [cx - W * 0.3, cy]], { stroke: 4 });
  b += hatch(rng, cx + W * 0.04, cy - H * 0.36, W * 0.24, H * 0.34, { gap: 14, opacity: 0.25, stroke: 1.6, angle: Math.PI / 3 });
  b += hatch(rng, cx - W * 0.26, cy - H * 0.32, W * 0.22, H * 0.3, { gap: 14, opacity: 0.25, stroke: 1.6, angle: -Math.PI / 3 });
  return scene(W, H, b);
}

export function dockProp(rng, W, H) {
  let b = '';
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * W;
    b += line(rng, t, 0, t, H, { stroke: 2.6, color: '#463f37' });
  }
  for (let i = 0; i < 3; i++) {
    const y = (i + 0.5) / 3 * H;
    b += line(rng, 0, y, W, y, { stroke: 3.4 });
  }
  for (let i = 0; i < 30; i++) {
    b += line(rng, rng() * W, rng() * H, 0, 0, { stroke: 1, color: INK_SOFT, opacity: 0.2, amp: 1, segs: 2 });
  }
  return scene(W, H, b);
}

export function barrelProp(rng, W, H, { painted = false } = {}) {
  const cx = W / 2;
  const topY = H * 0.16;
  const botY = H * 0.88;
  const rTop = W * 0.27;
  const rMid = W * 0.34;
  const rBot = W * 0.27;
  // Single source of truth for the silhouette: a barrel bellies out at the middle.
  const halfWidth = (t) => {
    const c = Math.min(1, Math.max(0, t));
    const bell = Math.sin(Math.PI * c) ** 0.55;   // 0 at both ends, 1 at the middle
    const chord = rTop + (rBot - rTop) * c;
    return chord + (rMid - Math.max(rTop, rBot)) * bell;
  };
  const yAt = (t) => topY + (botY - topY) * t;

  let b = '';
  // outline: left side down, bottom, right side up
  const left = [];
  const right = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const hw = halfWidth(t);
    left.push([cx - hw, yAt(t)]);
    right.push([cx + hw, yAt(t)]);
  }
  b += `<path d="M${left.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}L${right.slice().reverse().map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>`;
  // top rim (ellipse) + inner lip
  b += ellipse(rng, cx, topY, rTop, H * 0.055, { stroke: 3.4 });
  b += ellipse(rng, cx, topY, rTop * 0.84, H * 0.04, { stroke: 2.2, color: INK_SOFT });
  // bottom rim
  b += arc(rng, cx - rBot, botY, cx + rBot, botY, H * 0.045, { stroke: 3, color: INK_SOFT, segs: 10 });
  // stave seams, following the silhouette
  for (const f of [-0.62, -0.22, 0.22, 0.62]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push([cx + halfWidth(t) * f, yAt(t)]);
    }
    b += `<path d="M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}" fill="none" stroke="${INK_SOFT}" stroke-width="1.8" opacity="0.65" stroke-linejoin="round"/>`;
  }
  // two iron hoops, clamped to the body
  for (const t of [0.28, 0.72]) {
    const hw = halfWidth(t);
    b += arc(rng, cx - hw, yAt(t), cx + hw, yAt(t), H * 0.05, { stroke: 3.4, color: '#3f3a34', segs: 12 });
  }
  if (painted) {
    b += hatch(rng, cx - halfWidth(0.5) * 0.8, yAt(0.2), halfWidth(0.5) * 1.6, (botY - topY) * 0.6, { gap: 16, opacity: 0.2, stroke: 1.6 });
  }
  return scene(W, H, b);
}

/* ---- corridor decorations ---------------------------------------- */

export function coffeeCup(rng, W, H) {
  const cx = W / 2;
  let b = '';
  b += poly(rng, [[cx - W * 0.24, H * 0.3], [cx + W * 0.24, H * 0.3], [cx + W * 0.18, H * 0.82], [cx - W * 0.18, H * 0.82]], { stroke: 3.4 });
  b += arc(rng, cx + W * 0.24, H * 0.4, cx + W * 0.24, H * 0.62, W * 0.16, { stroke: 3.2, color: INK });
  b += ellipse(rng, cx, H * 0.3, W * 0.24, H * 0.05, { stroke: 2.6, color: INK_SOFT });
  b += ellipse(rng, cx, H * 0.88, W * 0.32, H * 0.05, { stroke: 2.6, color: INK_SOFT });
  for (let i = 0; i < 3; i++) {
    b += arc(rng, cx - W * 0.1 + i * W * 0.1, H * 0.4, cx - W * 0.06 + i * W * 0.1, H * 0.26, 8, { stroke: 1.8, color: INK_FAINT, opacity: 0.8 });
  }
  return scene(W, H, b);
}

export function paperAirplane(rng, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  let b = '';
  b += poly(rng, [[cx - W * 0.4, cy + H * 0.18], [cx + W * 0.42, cy - H * 0.24], [cx - W * 0.06, cy + H * 0.3]], { stroke: 3.2 });
  b += poly(rng, [[cx - W * 0.4, cy + H * 0.18], [cx + W * 0.42, cy - H * 0.24], [cx + W * 0.1, cy + H * 0.34]], { stroke: 2.6 });
  b += line(rng, cx - W * 0.4, cy + H * 0.18, cx + W * 0.1, cy + H * 0.34, { stroke: 2.2, color: INK_SOFT });
  return scene(W, H, b);
}

export function paperBall(rng, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  let b = '';
  const pts = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const r = Math.min(W, H) * (0.3 + rng() * 0.09);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  b += poly(rng, pts, { stroke: 3.2, amp: 2 });
  for (let i = 0; i < 5; i++) {
    b += line(rng, cx + (rng() - 0.5) * W * 0.4, cy + (rng() - 0.5) * H * 0.4, cx + (rng() - 0.5) * W * 0.4, cy + (rng() - 0.5) * H * 0.4, { stroke: 1.8, color: INK_SOFT, opacity: 0.7 });
  }
  return scene(W, H, b);
}

export function pencilProp(rng, W, H) {
  let b = '';
  b += poly(rng, [[W * 0.34, H * 0.18], [W * 0.66, H * 0.18], [W * 0.66, H * 0.78], [W * 0.34, H * 0.78]], { stroke: 3.2 });
  b += poly(rng, [[W * 0.34, H * 0.78], [W * 0.66, H * 0.78], [W * 0.5, H * 0.94]], { stroke: 3.2 });
  b += poly(rng, [[W * 0.44, H * 0.88], [W * 0.56, H * 0.88], [W * 0.5, H * 0.94]], { fill: INK, stroke: 2 });
  b += line(rng, W * 0.34, H * 0.78, W * 0.66, H * 0.78, { stroke: 2.6 });
  b += line(rng, W * 0.66, H * 0.18, W * 0.66, H * 0.78, { stroke: 1.6, color: INK_FAINT, opacity: 0.7 });
  return scene(W, H, b);
}

export function arrowProp(rng, W, H) {
  let b = '';
  b += line(rng, W * 0.05, H * 0.5, W * 0.8, H * 0.5, { stroke: 3, amp: 2 });
  b += poly(rng, [[W * 0.72, H * 0.24], [W * 0.98, H * 0.5], [W * 0.72, H * 0.76]], { stroke: 3, closed: false });
  return scene(W, H, b);
}

export function plantPot(rng, W, H) {
  let b = '';
  b += poly(rng, [[W * 0.22, H * 0.62], [W * 0.78, H * 0.62], [W * 0.7, H * 0.96], [W * 0.3, H * 0.96]], { stroke: 3.2 });
  for (let i = 0; i < 7; i++) {
    const x = W * (0.28 + (i / 6) * 0.44);
    b += arc(rng, x, H * 0.62, x + (rng() - 0.5) * W * 0.2, H * (0.16 + rng() * 0.3), (rng() - 0.5) * 26, { stroke: 2.8, color: '#4a453e' });
  }
  for (let i = 0; i < 5; i++) {
    b += ellipse(rng, W * (0.3 + rng() * 0.4), H * (0.2 + rng() * 0.3), W * 0.05, H * 0.05, { stroke: 2.4, color: '#4a453e' });
  }
  return scene(W, H, b);
}

export function cabinetProp(rng, W, H) {
  let b = '';
  b += rect(rng, W * 0.06, H * 0.04, W * 0.88, H * 0.92, { stroke: 3.4 });
  for (const t of [0.18, 0.5, 0.82]) {
    b += line(rng, W * 0.06, H * t, W * 0.94, H * t, { stroke: 2.6 });
  }
  for (const t of [0.34, 0.66]) {
    b += rect(rng, W * 0.16, H * (t - 0.09), W * 0.26, H * 0.09, { stroke: 2.2, color: INK_SOFT });
    b += rect(rng, W * 0.58, H * (t - 0.09), W * 0.26, H * 0.09, { stroke: 2.2, color: INK_SOFT });
  }
  return scene(W, H, b);
}

export function wallFrame(rng, W, H, { painted = false, inner = 'blank' } = {}) {
  let b = '';
  b += rect(rng, W * 0.03, H * 0.03, W * 0.94, H * 0.94, { stroke: 5, radius: 4 });
  b += rect(rng, W * 0.09, H * 0.09, W * 0.82, H * 0.82, { stroke: 2.4, color: INK_SOFT });
  if (inner === 'avatar') {
    const cx = W / 2;
    const cy = H * 0.46;
    const r = Math.min(W, H) * 0.2;
    b += ellipse(rng, cx, cy, r, r * 1.05, { stroke: 3 });
    b += arc(rng, cx - r * 1.5, cy + r * 2.1, cx + r * 1.5, cy + r * 2.1, -r * 1.1, { stroke: 3, color: INK });
  } else if (inner === 'sketch') {
    for (let i = 0; i < 7; i++) {
      b += line(rng, W * 0.16, H * (0.2 + i * 0.09), W * (0.3 + rng() * 0.5), H * (0.2 + i * 0.09), { stroke: 2.2, color: INK_SOFT, opacity: 0.8 });
    }
    b += poly(rng, [[W * 0.6, H * 0.74], [W * 0.72, H * 0.5], [W * 0.84, H * 0.74]], { stroke: 2.4, closed: false });
  }
  if (painted) b += hatch(rng, W * 0.1, H * 0.1, W * 0.8, H * 0.8, { gap: 18, opacity: 0.18, stroke: 1.5 });
  return scene(W, H, b);
}

/**
 * Punch rectangular holes out of an already-built shape body.
 *
 * Some upstream textures are walls with real openings in them (the entrance
 * wall has a doorway; the door meshes sit just behind it). Painting the wall
 * solid hides the doors entirely, so the openings have to be cut with a mask.
 *
 * @param {string} body  SVG markup to clip
 * @param {number} W     canvas width
 * @param {number} H     canvas height
 * @param {Array<{x:number,y:number,w:number,h:number}>} holes  in canvas units
 */
export function punch(body, W, H, holes) {
  const rects = holes
    .map((h) => `<rect x="${h.x.toFixed(2)}" y="${h.y.toFixed(2)}" width="${h.w.toFixed(2)}" height="${h.h.toFixed(2)}" fill="#000"/>`)
    .join('');
  return `<defs><mask id="punch" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">`
    + `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>${rects}</mask></defs>`
    + `<g mask="url(#punch)">${body}</g>`;
}

/**
 * Draw a rectangular frame as four solid bars.
 *
 * With `solid` fills active, a rect+inner-rect reads as one opaque slab and
 * hides whatever sits behind it (an upstream frame texture is ~13% opaque — it
 * is a hollow outline). Four bars keep the interior transparent.
 */
export function frameBars(rng, x, y, w, h, t, o = {}) {
  return (
    rect(rng, x, y, w, t, o) +
    rect(rng, x, y + h - t, w, t, o) +
    rect(rng, x, y + t, t, h - t * 2, o) +
    rect(rng, x + w - t, y + t, t, h - t * 2, o)
  );
}

export function grille(rng, W, H) {
  const t = Math.max(6, W * 0.035);
  let b = frameBars(rng, 0, 0, W, H, t, { stroke: 3 });
  const gap = Math.max(8, W / 22);
  for (let x = t + gap; x < W - t; x += gap) {
    b += line(rng, x, t, x, H - t, { stroke: 1.8, color: INK_SOFT, opacity: 0.7, amp: 0.7, segs: 3 });
  }
  for (let y = t + gap * 1.5; y < H - t; y += gap * 2.2) {
    b += line(rng, t, y, W - t, y, { stroke: 2.2, color: INK_SOFT, opacity: 0.8 });
  }
  return scene(W, H, b);
}

export function blankPlate(rng, W, H) {
  let b = '';
  b += rect(rng, W * 0.02, H * 0.04, W * 0.96, H * 0.92, { stroke: 3.4, radius: 5 });
  b += line(rng, W * 0.08, H * 0.26, W * 0.92, H * 0.26, { stroke: 1.8, color: INK_FAINT, opacity: 0.6 });
  b += line(rng, W * 0.08, H * 0.74, W * 0.92, H * 0.74, { stroke: 1.8, color: INK_FAINT, opacity: 0.6 });
  for (let i = 0; i < 16; i++) {
    b += ellipse(rng, W * (0.06 + rng() * 0.88), H * (0.08 + rng() * 0.84), 2.2, 2.2, { fill: INK_FAINT, stroke: 1 });
  }
  return scene(W, H, b);
}

/** A person avatar frame (used for the corridor avatar and its 9 anim frames). */
export function avatarFrame(rng, W, H, { frame = 0, total = 9 } = {}) {
  const cx = W / 2;
  const cy = H * 0.42;
  const r = Math.min(W, H) * 0.17;
  let b = '';
  // head
  b += ellipse(rng, cx, cy, r, r * 1.12, { stroke: 3.6 });
  // hair — varies per frame so the sequence reads as animation
  const swing = Math.sin((frame / total) * Math.PI * 2);
  b += arc(rng, cx - r * 1.02, cy - r * 0.2, cx + r * 1.02, cy - r * 0.2, -r * 0.9 + swing * r * 0.14, { stroke: 3.4, color: INK });
  b += line(rng, cx - r * 0.98, cy - r * 0.35, cx - r * 1.25, cy + r * 0.35 + swing * r * 0.2, { stroke: 3 });
  b += line(rng, cx + r * 0.98, cy - r * 0.35, cx + r * 1.25, cy + r * 0.35 - swing * r * 0.2, { stroke: 3 });
  // eyes: blink on one frame
  const open = frame === Math.floor(total / 2) ? 1.6 : r * 0.1;
  b += ellipse(rng, cx - r * 0.36, cy - r * 0.06, r * 0.11, open, { stroke: 2.6, fill: frame === Math.floor(total / 2) ? 'none' : INK });
  b += ellipse(rng, cx + r * 0.36, cy - r * 0.06, r * 0.11, open, { stroke: 2.6, fill: frame === Math.floor(total / 2) ? 'none' : INK });
  // mouth
  b += arc(rng, cx - r * 0.22, cy + r * 0.5, cx + r * 0.22, cy + r * 0.5, r * 0.16, { stroke: 2.4, color: INK });
  // shoulders
  b += arc(rng, cx - r * 1.7, cy + r * 3.0, cx + r * 1.7, cy + r * 3.0, -r * 1.0, { stroke: 3.6, color: INK });
  b += arc(rng, cx - r * 0.5, cy + r * 1.05, cx + r * 0.5, cy + r * 1.05, r * 0.3, { stroke: 3, color: INK });
  return scene(W, H, b);
}

export function deskTop(rng, W, H) {
  let b = '';
  b += rect(rng, 0, H * 0.1, W, H * 0.8, { stroke: 3.4 });
  for (let i = 1; i < 8; i++) {
    const x = (i / 8) * W;
    b += line(rng, x, H * 0.12, x, H * 0.88, { stroke: 1.4, color: INK_FAINT, opacity: 0.5 });
  }
  b += rect(rng, W * 0.3, H * 0.3, W * 0.18, H * 0.4, { stroke: 2.4, color: INK_SOFT });
  return scene(W, H, b);
}
