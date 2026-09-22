# wu5 — Interactive 3D Portfolio

An immersive, hand-drawn 3D portfolio you walk through: a corridor of doors, each
opening onto a room built with React Three Fiber and GSAP — no 3D model files, just
procedural geometry, shaders and generated line-art textures.

Based on the architecture of [ITomPoland/portfolio-itom](https://github.com/ITomPoland/portfolio-itom)
(MIT). **All artwork, audio and copy in this repository were regenerated from scratch** —
see [`CREDITS.md`](./CREDITS.md) for the license boundary.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production bundle -> dist/
npm run preview    # serve dist/ at http://localhost:4173
npm run lint
```

> [!NOTE]
> Enable hardware acceleration in your browser — the corridor renders a real WebGL
> scene. Headless/software rendering (SwiftShader) works but is slow.

## Editing your content

**Everything personal lives in one file: [`src/content/site.config.js`](./src/content/site.config.js).**

It holds your name and handle, the hero title letters, tagline, social links, the
project list, tech badges, About-room skill balloons and awards, the Studio screens,
and the per-room SEO titles/descriptions. The 3D rooms, the `<head>` metadata, the
JSON-LD structured data and the screen-reader fallback all read from it.

```js
export const identity = {
  handle: 'WU5',              // the giant hand-drawn title in the corridor (3-5 chars)
  name: 'wu5',
  tagline: ['<', 'creative', 'developer', '/>'],
  siteUrl: 'https://wu5.dev', // used for canonical + OG URLs
  // ...
};
```

## Regenerating the artwork

The textures are **generated, not drawn by hand**. A small line-art engine
(`scripts/art/doodle.mjs`) draws everything from primitives — seeded jitter for the
wobble, double-stroking for pen pressure, and hatching clipped analytically to each
shape so shading never spills outside its outline.

```bash
npm run art          # all textures  (~223 files, ~12s)
npm run art:extras   # icons, floor map, cursors, favicon, OG card
npm run art:audio    # procedural ambience + SFX (WAV)
npm run art:all      # everything
```

Art is derived from `site.config.js`, so **change your projects or tech badges in the
config and re-run `npm run art`** — the gallery cards and logo badges follow.

Assets are rendered at each texture's original aspect ratio (recorded in
`.research/asset-dims.json`) because they are mapped onto fixed 3D planes; a wrong
ratio stretches the surface.

## Project structure

```
src/
  content/site.config.js     <- your content (single source of truth)
  components/canvas/         <- the 3D scene: corridor, rooms, shaders
    corridor/                <-   infinite corridor, doors, avatar, hero text
    rooms/{About,Gallery,Studio,Contact}/
    entrance/                <-   the door you click to enter
  components/ui/             <- HUD: nav, achievements, audio, preloader
  styles/                    <- SCSS design tokens
  hooks/                     <- meta/SEO + content hooks
scripts/art/                 <- the art engine and generators
public/textures/             <- generated art (safe to delete + regenerate)
```

## Routes

`/` corridor · `/about` · `/gallery` · `/studio` · `/contact` · `/start` (link-in-bio page)

Rooms are deep-linkable; the URL updates as you move and the back button works.

## Deployment

The build is a static SPA. `public/_headers` and `public/_redirects` target
Cloudflare Pages — adjust `identity.siteUrl` in the config first so canonical and OG
URLs point at your domain.

## License

Code: MIT (see [`LICENSE`](./LICENSE), original copyright preserved).
Art, audio and copy in this repository: original work — see [`CREDITS.md`](./CREDITS.md).
