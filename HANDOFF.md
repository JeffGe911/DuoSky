# DuoSky — Art & Visual Handoff

How to change how DuoSky **looks** without breaking it. (For product/engine notes see `README.md` and `docs/SPEC-v1.md`.)

## The one rule

**Never edit `index.html` by hand.** It is generated. Edit the sources, then rebuild:

```bash
python3 build.py       # src/ + data/  ->  index.html  (validates each <script>; won't overwrite on error)
node tests/golden.js   # 18 engine assertions — must pass
node tests/reading.js  # interpretive-layer invariants — must pass
```

Everything visual lives in **`src/template.html`** (the `<style>` block near the top + the markup) and **`src/fonts.css`** (embedded fonts). Images live in **`public/images/`**. Commit the regenerated `index.html` together with your source change.

---

## 1. Palette

Two layers, both in `src/template.html`:

**CSS variables** — `:root { … }` (top of the `<style>`, ~line 10):

| var | value | use |
|---|---|---|
| `--gold` | `#D9B96C` | primary accent, headings, links |
| `--gold-dim` | `rgba(217,185,108,.40)` | borders / hairlines |
| `--hairline` | `rgba(217,185,108,.24)` | faint dividers |
| `--ink` | `#ECEEF8` | main text |
| `--soft` / `--muted` | `#C3C9DB` / `#96A0B8` | secondary / tertiary text |
| `--seal` | `#C64B33` | seal red |

**Five-element colors** (JS maps, search the file):
- `ELEM_COLOR` — one hue per phase: wood `#6FC08F`, fire `#F2895F`, earth `#CDA268`, metal `#C9D3E0`, water `#7DAEDD`.
- `STEM_COLOR` — one per heavenly stem; **hue = element, lightness = yin/yang** (e.g. 甲 deep forest `#4BA872` → 乙 tender willow `#ABDCA8`). Branch color is `STEM_COLOR[ZHI_MAIN[branch]]` (the branch's main hidden stem).

Change a phase color in **both** `ELEM_COLOR` and the matching pair in `STEM_COLOR` so pillars and legends stay in sync.

## 2. Backgrounds — the two scenes

The card cross-fades between a **warm palace** (BaZi) and a **cosmic** sky (Western) as you scroll into `#west-scene`; the switch is the `west` class on `<body>` (toggled by an IntersectionObserver in `setupWestBg`).

- **Warm palace image** — `#bgimg`, shown when `<body class="photo">`. File: `public/images/duosky-bg.jpg` (referenced in the CSS `url(...)` around lines 64/68 **and** the `<link rel="preload">` at line 7). To swap: drop in a new image, keep the filename `duosky-bg.jpg` (or update all three references). Keep it compressed (~300 KB). The two `*-celestial-palace-*` files are the full-res source/master.
- **Cosmic sky** — `#bgwest` (a stack of radial + linear gradients, ~line 340) plus `#constels` (JS-generated starfield + drifting constellations + meteors, built in `makeConstels()`; star count is the `340` loop). Tune gradients for mood; tune the loop count for density.

> The palace art is the owner's own work. If you replace it, use art you generated or licensed.

## 3. Fonts — the East/West type contrast

Embedded as data-URIs in `src/fonts.css` (keeps the app single-file, offline):
- **EB Garamond** (400/600) — classical serif, the default for the whole app / BaZi side.
- **Nunito** (400/700, Latin subset) — rounded; the Western side uses it via the `--round` stack (`#west-scene` text). This is the deliberate serif ↔ rounded, East ↔ West contrast.

To swap a face: regenerate the `@font-face` data-URI (subset first to keep size down — see how the Nunito Latin subset was built), replace the block in `fonts.css`, rebuild. Chinese always falls back to the system serif/rounded (Songti / Hiragino Maru).

## 4. Key components (all styled in the `<style>` block)

| selector | what |
|---|---|
| `.panel` | the input form **and** the result card container (500px, responsive) |
| `.cardnavbar` / `.navtab` | sticky in-card nav; blends with the background (warm → indigo in the star section) |
| `.pillar` / `.tile` (`tile()` in JS) | the four BaZi pillars; corner 生肖 = `.pill-animal` |
| `.opening` / `.op-cross` | the top "hook" box (human line + 东西合参) |
| `.deeper` / `#west-scene` | the Western wheel section; wheel SVG is `buildWheel()` |
| `.drawer` | the bottom-sheet all readings open in; `drawerShell()` renders rows |
| `.fo-dot` (`good/neutral/bad/great/terrible`) | the fortune dots |
| `.lk-strip` / `.lkc` | horizontal luck / 流年 / 流月 / 流日 strips |
| `.tg-link` / `.term-link` | the dotted, tappable term links |
| logo | the **命 ✕ starmark** SVG — input hero `.glyphs` (line ~651) and the reveal splash `.rv-mark` (`#reveal-fx`, line ~715). Both use the same 8-point star path. |

## 5. Share card (the PNG people send)

Drawn on a `<canvas>` in **`shareCardImage()`** (search the file). Colors are **hard-coded there** (`#3a1d16`/`#241110` bg, `#D9B96C` gold, etc.) — if you change the palette, update them here too. It's 1080×1440 portrait; Chinese renders in the system serif on canvas. Test on a real device (native share sheet vs. download fallback).

## 6. Motion, mobile, lite

- All animation is gated by `@media (prefers-reduced-motion: reduce)`.
- Phone tuning: `@media (max-width:430px)` (dense layout) and `@media (pointer:coarse)` (tap targets).
- **Lite mode**: `body.lite` hides the dense secondary detail (search `body.lite` in the CSS). Toggled by the ◐ button.

## 7. Checklist before you ship a visual change

1. Edited `src/template.html` / `src/fonts.css` / `public/images/` — **not** `index.html`.
2. `python3 build.py` printed `2 scripts OK`.
3. `node tests/golden.js` → 18 passed · `node tests/reading.js` → 0 failed.
4. Eyeballed both scenes (scroll into the star chart), a phone width, EN + 中文, and the 🎴 share card.
5. Committed source **and** the rebuilt `index.html`; pushed to `main` (GitHub Pages redeploys in ~1 min).
