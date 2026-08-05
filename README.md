# DuoSky 

> **Two skies. One you.** — Your birth moment, read by the world's two great astrologies: Chinese BaZi and the Western zodiac, side by side.

**Live demo:** https://jeffge911.github.io/DuoSky/ *(after enabling GitHub Pages, see below)*

![status](https://img.shields.io/badge/status-prototype%20v0.7-d9b96c) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features

- **One birth moment, two charts** — BaZi Four Pillars (年·月·日·时) and the Western sun sign, computed together and read side by side ("Both agree / Where they clash").
- **Real astronomical engine, fully client-side, zero runtime dependencies**
  - Solar-term table 1930–2030 precomputed with Swiss Ephemeris (minute precision, stored in UTC)
  - Year pillar switches at 立春 Lichun; month pillars at the twelve *jie* terms; Western sign cusps derive from the *same* table (solar longitudes at multiples of 30°) — two astrologies, one ephemeris
  - Day pillar via JDN arithmetic; late 子时 (23:00+) rolls to the next day; timezone-aware for births anywhere
  - Cross-validated on 443 test cases against `sxtwl` and `cnlunar`; every divergence is a documented school/granularity difference, not an engine error
- **Ten Gods in a tarot-register English naming system** — 伤官 → *The Maverick*, 七杀 → *The General*, 偏印 → *The Mystic* …
- **Heavenly-stem color system** — hue from classical element imagery, depth encodes yin/yang (甲 deep forest → 乙 tender willow; 壬 deep river → 癸 light mist)
- **Hidden stems (藏干)** displayed under each branch, element-colored
- **EN / 中文 one-click toggle** — each mode is language-pure; only ganzhi glyphs remain as chart data
- **Unknown birth time degrades gracefully** to a 3-pillar chart
- **Animated xianxia scene** — drifting cloud seas, gliding cranes, a falling waterfall, swaying wind chimes, breathing moon halo; all gated by `prefers-reduced-motion`
- **Photo background slot** — add `class="photo"` to `<body>` and set `#bgimg`'s `background-image` to use a painted/generated backdrop (Ken Burns drift included). Use art you generated or licensed yourself; don't ship other people's watermarked work.

## Develop

```bash
python3 build.py        # src/ + data/ -> index.html (self-contained, ~100 KB)
```

| Path | What it is |
|---|---|
| `src/template.html` | UI, styles, bilingual content packs, render logic |
| `src/engine.js` | Four-pillar + sun-sign engine (pure functions) |
| `data/terms.json` | Solar terms 1930–2030; regenerate with `tools/gen_terms.py` (needs `pyswisseph`) |
| `tests/` | Cross-validation harness vs `sxtwl` / `cnlunar` — see `tests/README.md` |

## Deploy (GitHub Pages)

Repo **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
The site appears at `https://jeffge911.github.io/DuoSky/` within a minute or two.

## Roadmap

Share-card PNG export · Moon & Rising · 大运 luck cycles · true solar time · 144 combined-archetype pages · custom domain

## 中文速览

一次输入,双盘同解:八字四柱 × 西方星座,同屏合参("两盘同断 / 两盘相争")。引擎口径:立春换年、十二节定月、节气分钟级、晚子时归次日、全球时区;瑞士星历预计算 1930–2030 节气表,八字与星座共用同一张天文表;443 例与 sxtwl / cnlunar 对拍,全部差异均为流派/粒度口径而非计算错误。十神采用塔罗语域英译体系;十干配色"色相取象、深浅定阴阳";藏干上牌;中英一键切换、语言互不混杂。

## Disclaimer

For reflection & entertainment — not fate, just weather.
仅供自省与娱乐——非宿命,是天气。

MIT © 2026 Jeff Ge
