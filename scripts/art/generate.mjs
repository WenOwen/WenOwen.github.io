/**
 * generate.mjs — regenerate every texture in the portfolio as original line art.
 *
 * The upstream project's art (a hand-drawn illustration set) is the author's
 * personal copyright even though the code is MIT, so none of it ships here.
 * This script draws a fresh set from primitives in doodle.mjs / props.mjs.
 *
 * Each asset is rendered at its ORIGINAL aspect ratio (see .research/asset-dims.json)
 * because the textures are mapped onto fixed 3D planes — a wrong ratio stretches.
 *
 *   node scripts/art/generate.mjs            # everything
 *   node scripts/art/generate.mjs entrance   # only paths containing "entrance"
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import * as P from './props.mjs';
import { makeRng, seedFrom, svgDoc, render, renderRaw, valueNoise, line, rect, ellipse, arc, poly, cloud, hatch, INK, INK_SOFT, INK_FAINT, PAPER, PAPER_DIM } from './props.mjs';
import { projects, techLogos, balloons, awards, studioContent } from '../../src/content/site.config.js';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const DIMS = existsSync(join(ROOT, '.research', 'asset-dims.json'))
  ? JSON.parse(readFileSync(join(ROOT, '.research', 'asset-dims.json'), 'utf8'))
  : {};

const only = process.argv.slice(2);
const jobs = [];

/** Register an asset. `from` = original path, used to inherit the aspect ratio. */
function add(path, from, build, { w, h, max = 1024 } = {}) {
  jobs.push({ path, from, build, w, h, max });
}

/** Register a base + `_painted` pair. */
function pair(path, from, build, o = {}) {
  add(path, from, (W, H, rng) => build(W, H, rng, false), o);
  const painted = path.replace(/\.webp$/, '_painted.webp');
  add(painted, from, (W, H, rng) => build(W, H, rng, true), o);
}

const fit = (w, h, max) => {
  const s = Math.min(1, max / Math.max(w, h));
  return [Math.max(8, Math.round(w * s)), Math.max(8, Math.round(h * s))];
};

/* ================================================================== *
 * Root
 * ================================================================== */
add('/textures/paper-texture.webp', '/textures/paper-texture.webp', (W, H, rng) => P.paperFloor(rng, W, H, { creases: 10 }));

/* ================================================================== *
 * entrance/
 * ================================================================== */
const E = '/textures/entrance';
add(`${E}/wall_bricks_2.webp`, `${E}/wall_bricks_2.webp`, (W, H, r) => {
  // The doorway is a real opening in the entrance wall — the door meshes sit at
  // z≈22.1, just BEHIND the wall plane at z≈22.15. A solid wall occludes them,
  // so the opening has to be punched out (the upstream wall does the same).
  const bricks = unwrap(P.bricksWall(r, W, H));
  const body = P.punch(bricks, W, H, [
    { x: W * 0.432, y: H * 0.675, w: W * 0.136, h: H * 0.325 },
  ]);
  // No background: the punched opening must stay transparent so the doors show.
  return svgDoc(W, H, body, { bg: null });
});
add(`${E}/floor_paper.webp`, `${E}/floor_paper.webp`, (W, H, r) => P.paperFloor(r, W, H));
add(`${E}/stone-path.webp`, `${E}/stone-path.webp`, (W, H, r) => P.stonePath(r, W, H, { cols: 2, rows: 6 }));
add(`${E}/tree_sketch.webp`, `${E}/tree_sketch.webp`, (W, H, r) => P.treeSketch(r, W, H));
add(`${E}/cat_sketch.webp`, `${E}/cat_sketch.webp`, (W, H, r) => P.catSketch(r, W, H, { pose: 'sit' }));
add(`${E}/cat_front_body.webp`, `${E}/cat_front_body.webp`, (W, H, r) => P.catSketch(r, W, H, { pose: 'meow' }));
add(`${E}/mouse_hanging.webp`, `${E}/mouse_hanging.webp`, (W, H, r) => P.mouseHanging(r, W, H));
add(`${E}/pot_with_duck.webp`, `${E}/pot_with_duck.webp`, (W, H, r) => P.potWithDuck(r, W, H));
add(`${E}/sign.webp`, `${E}/sign.webp`, (W, H, r) => P.signBoard(r, W, H, { text: 'PORTFOLIO' }));
add(`${E}/speech_bubble.webp`, `${E}/speech_bubble.webp`, (W, H, r) => P.speechBubble(r, W, H));
add(`${E}/belka.webp`, `${E}/belka.webp`, (W, H, r) => P.woodPlanks(r, W, H, { planks: 4 }));
add(`${E}/avatar_window.webp`, `${E}/avatar_window.webp`, (W, H, r) => P.wallFrame(r, W, H, { inner: 'avatar' }));
add(`${E}/window_sketch.webp`, `${E}/window_sketch.webp`, (W, H, r) => {
  // Drawn as bars: the upstream window is a hollow sash with see-through panes.
  let b = P.frameBars(r, W * 0.08, H * 0.04, W * 0.84, H * 0.92, W * 0.07, { stroke: 3.4 });
  b += P.frameBars(r, W * 0.12, H * 0.08, W * 0.76, H * 0.84, W * 0.035, { stroke: 3 });
  b += P.line(r, W * 0.5, H * 0.08, W * 0.5, H * 0.92, { stroke: 2.4, color: INK_SOFT });
  b += P.line(r, W * 0.12, H * 0.5, W * 0.88, H * 0.5, { stroke: 2.4, color: INK_SOFT });
  return svgDoc(W, H, b, { bg: null });
});
add(`${E}/bug_sketch.webp`, `${E}/bug_sketch.webp`, (W, H, r) => {
  const cx = W / 2; const cy = H / 2; const s = Math.min(W, H) * 0.18;
  let b = P.ellipse(r, cx, cy, s, s * 0.8, { stroke: 3.4 });
  b += P.ellipse(r, cx, cy - s * 1.0, s * 0.6, s * 0.55, { stroke: 3.2 });
  for (const d of [-1, 1]) {
    b += P.line(r, cx - s * 0.5, cy - s * 1.3, cx - s * 1.2, cy - s * 2.0, { stroke: 2.6 });
    b += P.line(r, cx + s * 0.5, cy - s * 1.3, cx + s * 1.2, cy - s * 2.0, { stroke: 2.6 });
    for (let i = 0; i < 3; i++) {
      b += P.line(r, cx + d * s * 0.9, cy - s * 0.3 + i * s * 0.5, cx + d * s * 2.2, cy - s * 0.8 + i * s * 0.7, { stroke: 2.6 });
    }
  }
  b += P.line(r, cx, cy - s * 0.5, cx, cy + s * 0.7, { stroke: 2, color: INK_SOFT });
  return svgDoc(W, H, b, { bg: PAPER });
});

/* ================================================================== *
 * corridor/ + corridor/doors/ + corridor/avatar_anim/ + decorations/
 * ================================================================== */
const C = '/textures/corridor';
add(`${C}/wall_texture.webp`, `${C}/wall_texture.webp`, (W, H, r) => P.wallTexture(r, W, H));
add(`${C}/ceiling_texture.webp`, `${C}/ceiling_texture.webp`, (W, H, r) => P.ceilingTexture(r, W, H));
add(`${C}/kawalekpodlogi.webp`, `${C}/kawalekpodlogi.webp`, (W, H, r) => P.paperFloor(r, W, H, { creases: 8 }));
add(`${C}/bokilampy.webp`, `${C}/bokilampy.webp`, (W, H, r) => svgDoc(W, H, P.woodPlanks(r, W, H, { planks: 3 }), { bg: PAPER }));
add(`${C}/texturadoprogow.webp`, `${C}/texturadoprogow.webp`, (W, H, r) => P.woodPlanks(r, W, H, { planks: 4 }));
add(`${C}/texturadrewnadonozekbiurka.webp`, `${C}/texturadrewnadonozekbiurka.webp`, (W, H, r) => P.woodPlanks(r, W, H, { planks: 8, vertical: true }));
add(`${C}/kratanalampy.webp`, `${C}/kratanalampy.webp`, (W, H, r) => P.grille(r, W, H));
add(`${C}/kratkawentylacyjna.webp`, `${C}/kratkawentylacyjna.webp`, (W, H, r) => P.grille(r, W, H));
add(`${C}/pustatabliczka.webp`, `${C}/pustatabliczka.webp`, (W, H, r) => P.blankPlate(r, W, H));
add(`${C}/strzalka.webp`, `${C}/strzalka.webp`, (W, H, r) => P.arrowProp(r, W, H));
add(`${C}/szafkaprzod.webp`, `${C}/szafkaprzod.webp`, (W, H, r) => P.cabinetProp(r, W, H));
add(`${C}/szafkaprzodgora.webp`, `${C}/szafkaprzodgora.webp`, (W, H, r) => P.cabinetProp(r, W, H));
add(`${C}/drzewkowdoniczce.webp`, `${C}/drzewkowdoniczce.webp`, (W, H, r) => P.plantPot(r, W, H));
add(`${C}/kwiatekwdoniczce.webp`, `${C}/kwiatekwdoniczce.webp`, (W, H, r) => P.plantPot(r, W, H));
add(`${C}/gorastolika.webp`, `${C}/gorastolika.webp`, (W, H, r) => P.deskTop(r, W, H));
add(`${C}/ramkanazdjeciemala.webp`, `${C}/ramkanazdjeciemala.webp`, (W, H, r) => P.wallFrame(r, W, H, { inner: 'avatar' }));
add(`${C}/rysuneknaobraz1.webp`, `${C}/rysuneknaobraz1.webp`, (W, H, r) => P.wallFrame(r, W, H, { inner: 'sketch' }));
add(`${C}/rysuneknaobrazek3.webp`, `${C}/rysuneknaobrazek3.webp`, (W, H, r) => P.wallFrame(r, W, H, { inner: 'sketch' }));
pair(`${C}/ramkanazdjecieduza.webp`, `${C}/ramkanazdjecieduza.webp`, (W, H, r, painted) => P.wallFrame(r, W, H, { painted, inner: 'sketch' }));

// avatar animation frames
for (let i = 1; i <= 9; i++) {
  add(`${C}/avatar_anim/${i}.webp`, `${C}/avatar_anim/1.webp`, (W, H, r) => P.avatarFrame(r, W, H, { frame: i - 1, total: 9 }));
}
add(`${C}/avatar_sketch.webp`, null, (W, H, r) => P.avatarFrame(r, W, H, { frame: 0, total: 9 }), { w: 512, h: 1024 });

// decorations
const DEC = `${C}/decorations`;
add(`${DEC}/coffee_cup.webp`, `${DEC}/coffee_cup.webp`, (W, H, r) => P.coffeeCup(r, W, H));
add(`${DEC}/paper_airplane.webp`, `${DEC}/paper_airplane.webp`, (W, H, r) => P.paperAirplane(r, W, H));
add(`${DEC}/paper_ball.webp`, `${DEC}/paper_ball.webp`, (W, H, r) => P.paperBall(r, W, H));
add(`${DEC}/pencil.webp`, `${DEC}/pencil.webp`, (W, H, r) => P.pencilProp(r, W, H));
add(`${DEC}/coffee_debug.webp`, `${DEC}/coffee_debug.webp`, (W, H, r) => P.boxFace(r, W, H, { face: 'front', kind: 'monitor' }));
add(`${DEC}/idea_process.webp`, `${DEC}/idea_process.webp`, (W, H, r) => {
  const cx = W / 2;
  let b = P.ellipse(r, cx, H * 0.24, W * 0.3, H * 0.13, { stroke: 3.2 });
  b += P.rect(r, cx - W * 0.1, H * 0.35, W * 0.2, H * 0.05, { stroke: 2.6 });
  b += P.line(r, cx, H * 0.42, cx, H * 0.56, { stroke: 3 });
  b += P.poly(r, [[cx - W * 0.09, H * 0.56], [cx + W * 0.09, H * 0.56], [cx, H * 0.66]], { stroke: 3 });
  for (let i = 0; i < 4; i++) {
    b += P.arc(r, cx - W * 0.28 + i * W * 0.18, H * 0.78, cx - W * 0.28 + i * W * 0.18, H * 0.94, 10, { stroke: 2, color: INK_FAINT });
  }
  return svgDoc(W, H, b, { bg: PAPER });
});
add(`${DEC}/while_true_loop.webp`, `${DEC}/while_true_loop.webp`, (W, H, r) => {
  let b = P.rect(r, W * 0.04, H * 0.14, W * 0.92, H * 0.72, { stroke: 3.4, radius: 10 });
  b += P.label('while (true) {', W * 0.1, H * 0.44, { size: H * 0.2, anchor: 'start', weight: '700' });
  b += P.label('code();', W * 0.16, H * 0.68, { size: H * 0.2, anchor: 'start', weight: '700', color: INK_SOFT });
  b += P.label('}', W * 0.1, H * 0.86, { size: H * 0.2, anchor: 'start', weight: '700' });
  return svgDoc(W, H, b, { bg: PAPER });
});

// corridor/doors — the room doors
for (const kind of ['about', 'kontakt', 'projekty', 'social']) {
  const src = `/textures/corridor/doors/drzwiabout.webp`;
  pair(`${C}/doors/drzwi${kind}.webp`, src, (W, H, r, painted) => P.doorFace(r, W, H, { painted, kind }));
}
// remaining door parts
add(`${C}/doors/backsingledoors.webp`, `${C}/doors/backsingledoors.webp`, (W, H, r) => P.doorFace(r, W, H, {}));
add(`${C}/doors/door_back.webp`, `${C}/doors/door_back.webp`, (W, H, r) => P.doorFace(r, W, H, {}));
add(`${C}/doors/doorrleft.webp`, `${C}/doors/doorrleft.webp`, (W, H, r) => P.doorFace(r, W, H, {}));
add(`${C}/doors/dorright.webp`, `${C}/doors/dorright.webp`, (W, H, r) => P.doorFace(r, W, H, {}));
add(`${C}/doors/frame_sketch.webp`, `${C}/doors/frame_sketch.webp`, (W, H, r) => {
  // Hollow: the upstream frame is ~13% opaque, so the doorway must stay clear.
  const b = P.frameBars(r, W * 0.06, H * 0.03, W * 0.88, H * 0.94, W * 0.09, { stroke: 4 })
    + P.frameBars(r, W * 0.17, H * 0.1, W * 0.66, H * 0.8, W * 0.035, { stroke: 2.4, color: INK_SOFT });
  return svgDoc(W, H, b, { bg: null });
});
add(`${C}/doors/ramkasingledoors.webp`, `${C}/doors/ramkasingledoors.webp`, (W, H, r) => {
  const b = P.frameBars(r, W * 0.02, H * 0.01, W * 0.96, H * 0.98, W * 0.11, { stroke: 4.5 })
    + P.frameBars(r, W * 0.15, H * 0.06, W * 0.7, H * 0.88, W * 0.04, { stroke: 2.6, color: INK_SOFT });
  return svgDoc(W, H, b, { bg: null });
});
pair(`${C}/doors/klamkadodrzwi.webp`, `${C}/doors/klamkadodrzwi.webp`, (W, H, r, painted) => {
  let b = P.ellipse(r, W * 0.5, H * 0.16, W * 0.3, W * 0.3, { stroke: 4 });
  b += P.rect(r, W * 0.42, H * 0.16, W * 0.16, H * 0.62, { stroke: 4, radius: W * 0.06 });
  b += P.ellipse(r, W * 0.5, H * 0.3, W * 0.16, W * 0.16, { stroke: 3, color: INK_SOFT });
  if (painted) b += P.hatch(r, W * 0.44, H * 0.2, W * 0.14, H * 0.5, { gap: 14, opacity: 0.3, stroke: 1.6 });
  return svgDoc(W, H, b, { bg: PAPER });
});
add(`${C}/doors/handle_left_sketch.webp`, `${C}/doors/handle_left_sketch.webp`, (W, H, r) => {
  let b = P.ellipse(r, W * 0.5, H * 0.28, W * 0.22, W * 0.22, { stroke: 3.6 });
  b += P.rect(r, W * 0.36, H * 0.32, W * 0.28, H * 0.18, { stroke: 3.4, radius: W * 0.1 });
  return svgDoc(W, H, b, { bg: PAPER });
});
add(`${C}/doors/handle_right_sketch.webp`, `${C}/doors/handle_right_sketch.webp`, (W, H, r) => {
  let b = P.ellipse(r, W * 0.5, H * 0.72, W * 0.22, W * 0.22, { stroke: 3.6 });
  b += P.rect(r, W * 0.36, H * 0.5, W * 0.28, H * 0.18, { stroke: 3.4, radius: W * 0.1 });
  return svgDoc(W, H, b, { bg: PAPER });
});
add(`${C}/doors/pien.webp`, `${C}/doors/pien.webp`, (W, H, r) => {
  let b = '';
  for (let i = 0; i < 10; i++) {
    b += P.line(r, W * 0.1, (i / 10) * H, W * 0.9, (i / 10) * H + (r() - 0.5) * 6, { stroke: 1.8, color: INK_SOFT, opacity: 0.7 });
  }
  b += P.line(r, W * 0.12, 0, W * 0.12, H, { stroke: 2.4 });
  b += P.line(r, W * 0.88, 0, W * 0.88, H, { stroke: 2.4 });
  return svgDoc(W, H, b, { bg: PAPER_DIM });
});

/* ================================================================== *
 * doors/  (legacy second set kept by the scene)
 * ================================================================== */
const D = '/textures/doors';
add(`${D}/door_back.webp`, `${D}/door_back.webp`, (W, H, r) => P.doorFace(r, W, H, {}));
add(`${D}/door_back_left_sketch.webp`, `${D}/door_back_left_sketch.webp`, (W, H, r) => P.doorFace(r, W, H, {}));
add(`${D}/door_left_sketch.webp`, `${D}/door_left_sketch.webp`, (W, H, r) => P.doorFace(r, W, H, {}));
add(`${D}/door_right_sketch.webp`, `${D}/door_right_sketch.webp`, (W, H, r) => P.doorFace(r, W, H, {}));
pair(`${D}/door_left_painted.webp`, `${D}/door_left_sketch.webp`, (W, H, r, painted) => P.doorFace(r, W, H, { painted }));
pair(`${D}/door_right_painted.webp`, `${D}/door_right_sketch.webp`, (W, H, r, painted) => P.doorFace(r, W, H, { painted }));
add(`${D}/frame_sketch.webp`, `${D}/frame_sketch.webp`, (W, H, r) => {
  const b = P.frameBars(r, W * 0.05, H * 0.04, W * 0.9, H * 0.92, W * 0.09, { stroke: 4 })
    + P.frameBars(r, W * 0.16, H * 0.11, W * 0.68, H * 0.78, W * 0.035, { stroke: 2.6, color: INK_SOFT });
  return svgDoc(W, H, b, { bg: null });
});
add(`${D}/pien_sketch.webp`, `${D}/pien_sketch.webp`, (W, H, r) => {
  let b = P.line(r, W * 0.3, 0, W * 0.3, H, { stroke: 2.4 });
  b += P.line(r, W * 0.7, 0, W * 0.7, H, { stroke: 2.4 });
  for (let i = 0; i < 12; i++) b += P.line(r, W * 0.32, (i / 12) * H, W * 0.68, (i / 12) * H, { stroke: 1.6, color: INK_SOFT, opacity: 0.6 });
  return svgDoc(W, H, b, { bg: PAPER_DIM });
});
add(`${D}/pien.webp`, `${D}/pien.webp`, (W, H, r) => {
  let b = P.line(r, W * 0.3, 0, W * 0.3, H, { stroke: 3 });
  b += P.line(r, W * 0.7, 0, W * 0.7, H, { stroke: 3 });
  return svgDoc(W, H, b, { bg: PAPER_DIM });
});
pair(`${D}/handle_left_sketch.webp`, `${D}/handle_left_sketch.webp`, (W, H, r, painted) => {
  let b = P.ellipse(r, W * 0.5, H * 0.3, W * 0.2, W * 0.2, { stroke: 3.6 });
  b += P.rect(r, W * 0.38, H * 0.34, W * 0.24, H * 0.14, { stroke: 3.4, radius: W * 0.08 });
  if (painted) b += P.hatch(r, W * 0.4, H * 0.26, W * 0.2, H * 0.2, { gap: 12, opacity: 0.3, stroke: 1.5, ellipse: { cx: W * 0.5, cy: H * 0.3, rx: W * 0.19, ry: W * 0.19 } });
  return svgDoc(W, H, b, { bg: PAPER });
});
pair(`${D}/handle_right_sketch.webp`, `${D}/handle_right_sketch.webp`, (W, H, r, painted) => {
  let b = P.ellipse(r, W * 0.5, H * 0.7, W * 0.2, W * 0.2, { stroke: 3.6 });
  b += P.rect(r, W * 0.38, H * 0.52, W * 0.24, H * 0.14, { stroke: 3.4, radius: W * 0.08 });
  if (painted) b += P.hatch(r, W * 0.4, H * 0.66, W * 0.2, H * 0.2, { gap: 12, opacity: 0.3, stroke: 1.5, ellipse: { cx: W * 0.5, cy: H * 0.7, rx: W * 0.19, ry: W * 0.19 } });
  return svgDoc(W, H, b, { bg: PAPER });
});

/* ================================================================== *
 * gallery/
 * ================================================================== */
const G = '/textures/gallery';
add(`${G}/floor.webp`, `${G}/floor.webp`, (W, H, r) => P.paperFloor(r, W, H, { creases: 9 }));
add(`${G}/miastotlo.webp`, `${G}/miastotlo.webp`, (W, H, r) => P.citySkyline(r, W, H));
add(`${G}/domki.webp`, `${G}/domki.webp`, (W, H, r) => P.housesRow(r, W, H));
add(`${G}/bird_gray.webp`, `${G}/bird_gray.webp`, (W, H, r) => P.birdProp(r, W, H));
add(`${G}/klamerka.webp`, `${G}/klamerka.webp`, (W, H, r) => {
  let b = P.rect(r, W * 0.14, H * 0.2, W * 0.72, H * 0.6, { stroke: 3.2, radius: 6 });
  b += P.line(r, W * 0.5, H * 0.2, W * 0.5, H * 0.8, { stroke: 2, color: INK_SOFT });
  return svgDoc(W, H, b, { bg: PAPER });
});
add(`${G}/railing.webp`, `${G}/railing.webp`, (W, H, r) => {
  const topRail = H * 0.1;
  const botRail = H * 0.88;
  const balTop = H * 0.2;
  const balBot = H * 0.78;
  let b = '';
  // handrail (two lines = thickness) + bottom rail
  b += line(r, 0, topRail, W, topRail, { stroke: 4.5 });
  b += line(r, 0, topRail + H * 0.035, W, topRail + H * 0.035, { stroke: 3 });
  b += line(r, 0, botRail, W, botRail, { stroke: 4.5 });
  b += line(r, 0, botRail - H * 0.03, W, botRail - H * 0.03, { stroke: 2.4, color: INK_SOFT });
  // balusters: chunky turned posts, not thin combs
  const n = 13;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n * W;
    const bw = (W / n) * 0.3;
    const my = (balTop + balBot) / 2;
    b += line(r, x, balTop, x, balBot, { stroke: 3.2 });
    b += ellipse(r, x, my, bw, (balBot - balTop) * 0.26, { stroke: 3 });
    b += ellipse(r, x, balTop + (balBot - balTop) * 0.1, bw * 0.8, (balBot - balTop) * 0.06, { stroke: 2.4, color: INK_SOFT });
    b += ellipse(r, x, balBot - (balBot - balTop) * 0.1, bw * 0.8, (balBot - balTop) * 0.06, { stroke: 2.4, color: INK_SOFT });
  }
  // posts at both ends
  for (const x of [W * 0.015, W * 0.985]) {
    b += rect(r, x - W * 0.012, H * 0.02, W * 0.024, H * 0.96, { stroke: 3.4 });
  }
  return svgDoc(W, H, b, { bg: PAPER });
});
// generic card parts
pair(`${G}/tylkartki.webp`, `${G}/tylkartki.webp`, (W, H, r, painted) => {
  let b = P.rect(r, W * 0.06, H * 0.02, W * 0.88, H * 0.96, { stroke: 4, radius: 4 });
  b += P.hatch(r, W * 0.1, H * 0.05, W * 0.8, H * 0.9, { gap: W * 0.05, opacity: painted ? 0.32 : 0.18, stroke: 1.8, angle: Math.PI / 4 });
  return svgDoc(W, H, b, { bg: PAPER_DIM });
});
pair(`${G}/przyciskdotylukartki.webp`, `${G}/przyciskdotylukartki.webp`, (W, H, r, painted) => {
  // Hollow: the upstream button is ~23% opaque (an outline, not a slab).
  let b = P.frameBars(r, W * 0.08, H * 0.16, W * 0.84, H * 0.68, H * 0.07, { stroke: 3.2 });
  b += P.label('<- BACK', W * 0.5, H * 0.62, { size: H * 0.34, weight: '800' });
  if (painted) b += P.hatch(r, W * 0.1, H * 0.2, W * 0.8, H * 0.6, { gap: 18, opacity: 0.25, stroke: 1.6 });
  return svgDoc(W, H, b, { bg: null });
});
add(`${G}/openliveproject.webp`, `${G}/openliveproject.webp`, (W, H, r) => {
  let b = P.rect(r, W * 0.08, H * 0.3, W * 0.84, H * 0.4, { stroke: 4, radius: 10 });
  b += P.label('OPEN PROJECT', W * 0.5, H * 0.55, { size: W * 0.1, weight: '800' });
  b += P.arc(r, W * 0.62, H * 0.72, W * 0.88, H * 0.6, -14, { stroke: 3, color: INK });
  b += P.poly(r, [[W * 0.82, H * 0.55], [W * 0.92, H * 0.58], [W * 0.86, H * 0.67]], { stroke: 3, closed: false });
  return svgDoc(W, H, b, { bg: PAPER });
});
// project cards — one per configured project, front + painted
for (const p of projects) {
  pair(`${G}/${p.art}przod.webp`, null, (W, H, r, painted) =>
    P.projectCard(r, W, H, { title: p.title, blurb: p.description, tech: p.tech.map((t) => t.slice(0, 4).toUpperCase()), painted }),
  { w: 1024, h: 2048 });
}
// tech logos
for (const t of techLogos) {
  add(`${G}/${t.file}.webp`, null, (W, H, r) => P.logoBadge(r, W, H, { name: t.label }), { w: 128, h: 128 });
  add(`${G}/${t.file}_painted.webp`, null, (W, H, r) => P.logoBadge(r, W, H, { name: t.label, painted: true }), { w: 128, h: 128 });
}

/* ================================================================== *
 * about/
 * ================================================================== */
const A = '/textures/about';
add(`${A}/awatarnachmurce.webp`, `${A}/awatarnachmurce.webp`, (W, H, r) => P.characterOnCloud(r, W, H));
for (const b of balloons) {
  const src = `${A}/reactduzybalon.webp`;
  pair(`${A}/${b.file}.webp`, src, (W, H, r, painted) => P.balloon(r, W, H, { name: b.label, painted, big: b.size === 'big' }));
}
for (const [i, a] of awards.entries()) {
  const src = `${A}/plaque-open-source.webp`;
  add(`${A}/${a.file}.webp`, src, (W, H, r) => P.certificate(r, W, H, { title: a.title, sub: a.sub }));
  // Only the first three are the large in-scene cards, and those need a painted twin.
  if (i < 3) {
    add(`${A}/${a.file}_painted.webp`, src, (W, H, r) => P.certificate(r, W, H, { title: a.title, sub: a.sub }));
  }
}
pair(`${A}/button.webp`, `${A}/button.webp`, (W, H, r, painted) => {
  let b = P.rect(r, W * 0.05, H * 0.16, W * 0.9, H * 0.68, { stroke: 3.6, radius: 10 });
  b += P.label('VIEW', W * 0.5, H * 0.62, { size: H * 0.36, weight: '800' });
  if (painted) b += P.hatch(r, W * 0.08, H * 0.2, W * 0.84, H * 0.6, { gap: 20, opacity: 0.25, stroke: 1.6 });
  return svgDoc(W, H, b, { bg: PAPER });
});
// floating islands
for (const [file, src, label] of [
  ['freelancewyspa', `${A}/freelancewyspa.webp`, 'FREELANCE'],
  ['uowyspa', `${A}/uowyspa.webp`, 'RESEARCH'],
]) {
  add(`${A}/${file}.webp`, src, (W, H, r) => {
    let b = P.poly(r, [[W * 0.2, H * 0.46], [W * 0.8, H * 0.46], [W * 0.66, H * 0.82], [W * 0.34, H * 0.82]], { stroke: 3.6 });
    b += P.line(r, W * 0.2, H * 0.46, W * 0.8, H * 0.46, { stroke: 3.4 });
    b += P.hatch(r, W * 0.24, H * 0.5, W * 0.52, H * 0.3, { gap: 16, opacity: 0.3, stroke: 1.6 });
    b += P.cloud(r, W * 0.5, H * 0.4, W * 0.4, H * 0.12, { bumps: 3, stroke: 2.6, fill: PAPER });
    b += P.label(label, W * 0.5, H * 0.68, { size: H * 0.12, weight: '800' });
    return svgDoc(W, H, b, { bg: PAPER });
  });
}
add(`${A}/FEATURED.webp`, null, (W, H, r) => {
  let b = P.rect(r, W * 0.06, H * 0.18, W * 0.88, H * 0.64, { stroke: 4, radius: 12 });
  b += P.label('FEATURED', W * 0.5, H * 0.6, { size: H * 0.26, weight: '800' });
  return svgDoc(W, H, b, { bg: PAPER });
}, { w: 512, h: 512 });

/* ================================================================== *
 * contact/
 * ================================================================== */
const K = '/textures/contact';
pair(`${K}/beczka.webp`, `${K}/beczka.webp`, (W, H, r, painted) => P.barrelProp(r, W, H, { painted }));
add(`${K}/faletopdown.webp`, `${K}/faletopdown.webp`, (W, H, r) => P.waterSurface(r, W, H));
add(`${K}/latarnia.webp`, `${K}/latarnia.webp`, (W, H, r) => P.lighthouse(r, W, H));
add(`${K}/molo.webp`, `${K}/molo.webp`, (W, H, r) => P.dockProp(r, W, H));
add(`${K}/statek.webp`, `${K}/statek.webp`, (W, H, r) => P.boatProp(r, W, H));
add(`${K}/send_button.webp`, `${K}/send_button.webp`, (W, H, r) => {
  let b = P.rect(r, W * 0.06, H * 0.14, W * 0.88, H * 0.72, { stroke: 3.4, radius: 8 });
  b += P.label('SEND', W * 0.5, H * 0.64, { size: H * 0.4, weight: '800' });
  return svgDoc(W, H, b, { bg: PAPER });
});
add(`${K}/paper_form.webp`, `${K}/paper_form.webp`, (W, H, r) => {
  let b = P.rect(r, W * 0.07, H * 0.03, W * 0.86, H * 0.94, { stroke: 3.6, radius: 4 });
  for (let i = 0; i < 5; i++) {
    const y = H * (0.14 + i * 0.15);
    b += P.line(r, W * 0.14, y, W * 0.86, y, { stroke: 1.8, color: INK_SOFT, opacity: 0.7 });
  }
  b += P.label('WRITE ME', W * 0.5, H * 0.1, { size: H * 0.05, weight: '800', color: INK_SOFT });
  return svgDoc(W, H, b, { bg: PAPER });
});

/* ================================================================== *
 * studio/  — box faces + content screens
 * ================================================================== */
const S = '/textures/studio';
const FACE_SRC = {
  monitor: `${S}/monitor_front.webp`,
  tv: `${S}/tv_front.webp`,
  phone: `${S}/phone_front.webp`,
};
for (const [kind, src] of Object.entries(FACE_SRC)) {
  const faces = kind === 'phone' ? ['front', 'back', 'side'] : ['front', 'back', 'left', 'right', 'top', 'bottom'];
  for (const face of faces) {
    pair(`${S}/${kind}_${face}.webp`, null, (W, H, r, painted) => P.boxFace(r, W, H, { face, kind, painted }), { w: 1024, h: 1024 });
  }
}
// content screens
for (const c of studioContent) {
  pair(`${S}/${c.art}.webp`, null, (W, H, r, painted) => {
    const kind = c.platform === 'youtube' ? 'tv' : c.platform === 'blog' ? 'monitor' : 'phone';
    // boxFace returns a complete SVG document; unwrap its body so we can draw on top.
    const doc = P.boxFace(r, W, H, { face: 'front', kind });
    const body = doc.slice(doc.indexOf('>') + 1, doc.lastIndexOf('</svg>'));
    let extra = '';
    const words = c.title.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const wd of words) {
      if ((cur + ' ' + wd).trim().length > 26) { lines.push(cur.trim()); cur = wd; }
      else cur += ' ' + wd;
    }
    if (cur.trim()) lines.push(cur.trim());
    lines.slice(0, 4).forEach((ln, i) => {
      extra += P.label(ln, W * 0.5, H * (0.3 + i * 0.08), { size: H * 0.055, weight: '700', spacing: 0 });
    });
    extra += P.label(
      c.platform === 'youtube' ? 'REPO' : c.platform === 'blog' ? 'NOTE' : 'TOOL',
      W * 0.5, H * 0.78, { size: H * 0.05, weight: '800', color: INK_SOFT },
    );
    if (painted) extra += P.hatch(r, W * 0.05, H * 0.05, W * 0.9, H * 0.9, { gap: 24, opacity: 0.18, stroke: 1.5 });
    return svgDoc(W, H, body + extra, { bg: PAPER });
  }, { w: 1024, h: 1024 });
}

/* ================================================================== *
 * clouds/
 * ================================================================== */
for (const [path, d] of Object.entries(DIMS)) {
  if (!path.includes('/textures/clouds/')) continue;
  add(path, path, (W, H, r) => {
    const bumps = W / H > 3 ? 5 : W / H > 1.8 ? 4 : 3;
    // cloud() returns bare path markup — it still needs wrapping in a document.
    return svgDoc(W, H, P.cloud(r, W / 2, H * 0.5, W * 0.94, H * 0.86, { bumps, stroke: 3, fill: PAPER }), { bg: PAPER });
  });
}

/* ================================================================== *
 * Alpha-box calibration
 *
 * The upstream props are cut-outs on transparent canvases and each drawing
 * occupies only part of its canvas (e.g. about/GSAPduzybalon draws into
 * x .21 w .55). That fraction is what makes the 3D scene compose correctly, so
 * we measure it from the originals and draw our art into the same sub-rectangle.
 * ================================================================== */
const BOXES = existsSync(join(ROOT, '.research', 'asset-boxes.json'))
  ? JSON.parse(readFileSync(join(ROOT, '.research', 'asset-boxes.json'), 'utf8'))
  : {};

/** Strip the outer <svg> wrapper so a built document can be re-parented. */
const unwrap = (doc) => doc.slice(doc.indexOf('>') + 1, doc.lastIndexOf('</svg>'));

/**
 * Resolve how a job should be drawn:
 *  - `box`   sub-rectangle of the canvas the art must occupy (or null)
 *  - `alpha` true when the texture must keep a transparent background
 */
function resolveBox(job) {
  const key = job.from || job.path;
  const b = BOXES[key];
  if (!b || b.error) return { box: null, alpha: false };
  // alpha < ~0.97 means the source had real transparency
  const alpha = b.alpha > 0 && b.alpha < 0.97;
  const isFullCanvas = b.x < 0.005 && b.y < 0.005 && b.w > 0.995 && b.h > 0.995;
  return { box: isFullCanvas ? null : b, alpha };
}

/* ================================================================== *
 * Run
 * ================================================================== */

function resolveSize(job) {
  if (job.w && job.h) return fit(job.w, job.h, job.max);
  const d = job.from ? DIMS[job.from] : null;
  if (d) return fit(d.w, d.h, job.max);
  return fit(512, 512, job.max);
}

const selected = only.length ? jobs.filter((j) => only.some((o) => j.path.includes(o))) : jobs;
let ok = 0;
const failed = [];
const started = Date.now();

for (const [i, job] of selected.entries()) {
  const [W, H] = resolveSize(job);
  const { box, alpha } = resolveBox(job);
  const rng = makeRng(seedFrom(job.path));
  try {
    // Draw the art at the size of its target sub-rectangle, then place it there.
    const iw = box ? Math.max(8, Math.round(W * box.w)) : W;
    const ih = box ? Math.max(8, Math.round(H * box.h)) : H;

    P.RENDER_OPTS.transparent = alpha;
    const inner = unwrap(job.build(iw, ih, rng));
    const body = box
      ? `<g transform="translate(${(W * box.x).toFixed(2)},${(H * box.y).toFixed(2)})">${inner}</g>`
      : inner;

    const svg = svgDoc(W, H, body, { bg: alpha ? null : PAPER });
    const out = join(PUBLIC, job.path.replace(/^\//, ''));
    mkdirSync(dirname(out), { recursive: true });
    await render(svg, out, { width: Math.max(W, H) });
    ok++;
    if (i % 25 === 0) console.log(`  [${i + 1}/${selected.length}] ${job.path} (${W}x${H}${alpha ? ' a' : ''})`);
  } catch (err) {
    failed.push({ path: job.path, error: err.message });
  }
}
P.RENDER_OPTS.transparent = false;

// report
const report = {
  generated: ok,
  failed,
  total: selected.length,
  ms: Date.now() - started,
};
mkdirSync(join(ROOT, '.research'), { recursive: true });
writeFileSync(join(ROOT, '.research', 'generate-report.json'), JSON.stringify(report, null, 2));

console.log(`\n=== generated ${ok}/${selected.length} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
if (failed.length) {
  console.log(`--- ${failed.length} FAILED ---`);
  for (const f of failed.slice(0, 20)) console.log(`  ${f.path}: ${f.error}`);
  process.exitCode = 1;
}
