/**
 * smoke-test.mjs — eyeball the art engine before generating all ~220 assets.
 * Focus: hatch clipping, cloud silhouette, arcs, and a couple of real props.
 */
import { join } from 'node:path';
import {
  makeRng, line, rect, ellipse, cloud, poly, hatch, crossHatch, arc,
  svgDoc, render, INK, INK_SOFT, PAPER, PAPER_DIM,
} from './doodle.mjs';

const OUT = join(process.cwd(), '.research', 'art-smoke');
const r = makeRng(20260922);

let s = '';

// 1. hatch must stay inside the box now
s += rect(r, 40, 40, 200, 130, { radius: 10, stroke: 3.5 });
s += hatch(r, 40, 40, 200, 130, { gap: 12, opacity: 0.55, inset: 6 });

s += ellipse(r, 340, 105, 78, 62, { stroke: 3.5 });
s += crossHatch(r, 262, 43, 156, 124, { gap: 15, opacity: 0.4 });

// 2. real clouds
s += cloud(r, 600, 100, 220, 120, { bumps: 4, stroke: 3.5 });
s += cloud(r, 870, 110, 190, 100, { bumps: 5, stroke: 3.5 });

// 3. waves
for (let i = 0; i < 9; i++) {
  const y = 260 + i * 22;
  s += arc(r, 40 + (i % 2) * 30, y, 300 + (i % 3) * 40, y, (i % 2 ? -1 : 1) * (6 + (i % 3) * 3), { stroke: 2.2, opacity: 0.6 });
}

// 4. prop: lighthouse (built from primitives)
let lh = '';
lh += poly(r, [[60, 40], [110, 40], [124, 250], [46, 250]], { stroke: 3.5 });
lh += rect(r, 52, 16, 66, 26, { stroke: 3.5 });
lh += poly(r, [[58, 16], [112, 16], [85, -6]], { stroke: 3.5 });
lh += line(r, 46, 250, 124, 250, { stroke: 4 });
lh += hatch(r, 52, 60, 62, 40, { gap: 11, opacity: 0.5 });
lh += hatch(r, 52, 150, 62, 40, { gap: 11, opacity: 0.5 });
s += lh;

// 5. prop: paper boat
let bt = '';
bt += poly(r, [[520, 330], [760, 330], [690, 420], [590, 420]], { stroke: 3.5 });
bt += poly(r, [[640, 330], [640, 200], [760, 330]], { stroke: 3.5 });
bt += poly(r, [[640, 330], [640, 215], [560, 330]], { stroke: 3.5 });
s += bt;

// 6. prop: a simple cat
let cat = '';
cat += ellipse(r, 900, 250, 46, 40, { stroke: 3.5 });
cat += poly(r, [[862, 222], [852, 180], [886, 208]], { stroke: 3.5 });
cat += poly(r, [[938, 222], [948, 180], [914, 208]], { stroke: 3.5 });
cat += ellipse(r, 884, 246, 5, 6, { stroke: 2.5, fill: INK });
cat += ellipse(r, 916, 246, 5, 6, { stroke: 2.5, fill: INK });
cat += poly(r, [[866, 300], [866, 400], [934, 400], [934, 300]], { stroke: 3.5 });
cat += arc(r, 934, 350, 986, 314, -16, { stroke: 3.5, color: INK });
cat += line(r, 892, 400, 892, 420, { stroke: 3.5 });
cat += line(r, 908, 400, 908, 420, { stroke: 3.5 });
s += cat;

await render(svgDoc(1024, 460, s, { bg: PAPER }), join(OUT, 'sheet.webp'), { width: 1024 });
console.log('wrote', join(OUT, 'sheet.webp'));
