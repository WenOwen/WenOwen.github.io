# Credits & Licensing

This project is a **derivative work**. It matters which part is which, because the
upstream repository is only *partly* free to reuse.

## Upstream code — MIT

The application code (the 3D corridor, the rooms, the shaders, the React/Three.js
architecture) is based on **[ITomPoland/portfolio-itom](https://github.com/ITomPoland/portfolio-itom)**
by **Tomasz "ITom" Szmajda**, used under the MIT License. The original copyright
notice is preserved in [`LICENSE`](./LICENSE), as MIT requires.

## Upstream assets — NOT reused

The upstream README states:

> **Note:** All personal assets, 3D textures, images, and copywriting are copyright
> of Tomasz Szmajda and may not be reused or reproduced without explicit permission.

**None of those assets are present in this repository.** Everything visual and
audible here was regenerated from scratch:

| Category | How it was produced |
| --- | --- |
| Textures (~223 files) | `scripts/art/generate.mjs` — original line art from the primitives in `scripts/art/doodle.mjs` and `scripts/art/props.mjs` |
| Icons, floor map, OG card, cursors | `scripts/art/extras.mjs` |
| Sound effects & ambience (10 files) | `scripts/art/audio.mjs` — procedural synthesis (noise, filters, envelopes). No samples. |
| Copywriting | Written for this site; personal facts come from `src/content/site.config.js` |

The art engine produces a hand-drawn "architect's sketch" look by wobbling path
geometry with a seeded PRNG, double-stroking outlines, and hatching analytically
clipped to each shape. It renders at each asset's original aspect ratio so textures
still map correctly onto the fixed 3D planes.

## Third-party assets that ARE reused

These are open-licensed and independent of the upstream author:

| Asset | License |
| --- | --- |
| `public/fonts/CabinSketch-*.ttf`, `FrederickatheGreat-Regular.ttf`, `RubikScribble-Regular.ttf`, `SatisfySL.json` | SIL Open Font License 1.1 (Google Fonts) |
| `public/start/fonts/barlow-condensed-700-latin.woff2` (+ `OFL.txt`) | SIL Open Font License 1.1 |
| Runtime dependencies (`react`, `three`, `@react-three/fiber`, `gsap`, …) | See `package.json` / each package's license |

## Content

Personal details, project list, links and copy live in **`src/content/site.config.js`**.
Change them there — no other file should need editing for a content update.
