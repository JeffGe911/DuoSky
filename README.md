# DuoSky · 双星

> **Two skies. One you.** — Your birth moment, read by the world's two great astrologies: Chinese BaZi (八字) and the Western zodiac, side by side.

**▶ Live demo: https://jeffge911.github.io/DuoSky/**

![status](https://img.shields.io/badge/status-v1.0-d9b96c) ![license](https://img.shields.io/badge/license-MIT-blue) ![deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen) ![build](https://img.shields.io/badge/build-single%20HTML-8a6d1f)

A single self-contained `index.html` — no server, no runtime dependencies, no tracking. Enter a birth moment and place; get a full BaZi Four-Pillar chart and a Western natal chart computed from the *same* ephemeris, then read together.

## What it does

**八字 · Four Pillars**
- Year / Month / Day / Hour pillars with hidden stems (藏干), 纳音 (sound-element), and Ten Gods (十神) — tap any glyph for a plain-language explanation
- Strength & useful element (旺衰 / 喜用神) from hidden-stem weighting, seasonal 调候, and whether combinations actually transform (合化) or merely bind (合绊)
- Pattern (格局) with success/failure (成败) and its own useful-god logic
- Relationships across the chart: 六合 / 三合 / 冲 / 刑 / 害, with fortune-weighted meaning
- 大运 luck pillars and 流年 / 流月 / 流日 — each graded 大吉→大凶 with the reasons behind the grade; open a decade to see its ten yearly cycles, each tappable for a per-year reading
- A life **fortune curve** with its peaks and troughs

**星盘 · Western natal chart**
- Full wheel: planets, signs, houses (when birth time is known), aspects, essential dignities, chart ruler, North Node, moon phase, element/modality balance
- Tap any symbol for its reading; degrades gracefully to a no-angles chart when the time is unknown

**东西合参 · East × West synthesis**
- One synthesis line up top — where BaZi and the natal chart *agree*, and where they *clash*
- **合盘 · Compatibility**: useful-element complementarity + synastry + a dual fortune curve (shared good years) + a verdict; save up to 4 people and compare

**综合解读 · Life Reading**
- Eight areas argued from the chart itself — Overview, Career, Wealth, Love, Family, Children, Direction, Health — each built from your day master, pattern, useful element, hidden-stem roots and 合冲刑害 relations, not one-size-fits-all blurbs
- Wealth alone walks the full 看财 checklist: is it your useful element, can the self carry it (身强能任 vs 财多身弱), is there an Officer guarding it, Output feeding it, is it 天透地藏 (revealed in a stem *and* rooted in a branch), and is there a Wealth-vault (财库)
- Every area closes with a **now** line: from your current 大运 pillar and this solar year it names the year stem's Ten God and how it triggers that area's star — rising, turbulent, or quiet

**Craft**
- **EN / 中文** one-click toggle — each mode is language-pure; the English side adds pinyin to any Chinese ganzhi
- Type sets the contrast: classical serif (EB Garamond) for the BaZi side, a rounded face (Nunito / SF Pro Rounded) for the Western side
- Free-text city with geolocation + true-solar-time correction; share by link / text / print
- Cosmic backdrop (starfield, drifting constellations, meteors) fades in as you scroll into the chart — all gated by `prefers-reduced-motion`

## Engine

Pure client-side JavaScript, cross-validated, no runtime dependencies.

- Solar-term table **1900–2150** precomputed with Swiss Ephemeris (minute precision, stored in UTC)
- Year pillar switches at 立春 Lichun; month pillars at the twelve *jie* terms; **Western sign cusps derive from the same table** (solar longitude at multiples of 30°) — two astrologies, one ephemeris
- Day pillar via JDN arithmetic; late 子时 (23:00+) rolls to the next day; timezone-aware for births anywhere
- Cross-validated on **443 cases** against `sxtwl` and `cnlunar`; every divergence is a documented school/granularity difference, not an engine error (see `tests/README.md`)

## Develop

```bash
python3 build.py       # src/ + data/ -> index.html (self-contained, single file)
node tests/golden.js   # 18 engine assertions (must all pass)
node tests/reading.js  # interpretive-layer invariants (favor/用神/grades across 600+ charts)
```

`build.py` inlines `src/engine.js`, `src/astronomy.min.js`, and `src/fonts.css` into `src/template.html`. It **validates before writing**: every inlined `<script>` is run through `node --check` and the output is scanned for leftover placeholders — a broken build never overwrites `index.html`.

| Path | What it is |
|---|---|
| `src/template.html` | UI, styles, bilingual content packs, render + drawer logic |
| `src/engine.js` | Four-pillar + natal engine (pure functions, `module.exports`-guarded) |
| `src/astronomy.min.js` | Astronomy Engine (planetary positions, houses, aspects) |
| `src/fonts.css` | Embedded fonts (EB Garamond + Nunito subsets, as data URIs) |
| `data/terms.json` | Solar terms 1900–2150; regenerate with `tools/gen_terms.py` (needs `pyswisseph`) |
| `tests/` | Golden assertions + `sxtwl` / `cnlunar` cross-validation harness |
| `docs/` | Spec and art handoff |

## Deploy (GitHub Pages)

Already live at the link above — it serves the committed `index.html` from `main` at repo root and re-deploys within a minute or two of each push. To host your own fork: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.

## Roadmap

Share-card PNG export · 144 combined-archetype write-ups · a beginner/expert toggle that hides the jargon by default · custom domain

## 中文速览

一次输入,双盘同解。**八字**:四柱 + 藏干 + 纳音 + 十神(点字有大白话解释)、旺衰喜用(含调候与合化/合绊判定)、格局成败、六合三合冲刑害、大运与流年流月流日(逐项定吉凶大吉→大凶)、运势曲线。**星盘**:行星 / 星座 / 宫位 / 相位 / 尊贵 / 命主星 / 北交点 / 月相 / 元素配比的完整命盘,点符号看解读,无时辰自动降级。**东西合参**:顶部一句合参(两盘同断 / 两盘相争);**合盘**含用神互补 + 星座合盘 + 双人运势曲线 + 评分,可存 4 人互测。**综合解读**分总览·事业·财运·感情·家庭·子女·发展方向·健康八面,全部依日主·格局·用神·藏干通根·合冲刑害推断(如看财走「喜用 / 身能任 / 官护 / 食伤生 / 天透地藏 / 财库」全套),每面末尾再给一句依当前大运+流年的时间落点(点名流年天干的十神如何生克引动该区域之星)。中英一键切换、英文侧自带拼音;八字侧古典宋体、星座侧圆体,做出中西对比。引擎:瑞士星历预算 1900–2150 节气表,八字与星座共用同一张天文表;443 例与 sxtwl / cnlunar 对拍,差异皆为流派/粒度口径而非计算错误。

## Disclaimer

For reflection & entertainment — not fate, just weather.
仅供自省与娱乐——非宿命,是天气。

MIT © 2026 Jeff Ge
