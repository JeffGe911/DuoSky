# DuoSky red-and-gold animated hero

Copy these assets to the project's `public/images` directory:

- `duosky-celestial-palace-red-gold-bg.webp` — primary animated background
- (GIF fallback intentionally kept out of the repo — 16 MB, and animated WebP is universally supported; ask Jeff for the file if a legacy fallback is ever needed)
- `duosky-celestial-palace-red-gold-source.png` — reduced-motion/static fallback

Paste this into Claude Code:

```text
Integrate the supplied red-and-gold DuoSky celestial-palace assets into the landing-page hero. Use the animated WebP as the primary background, the GIF only as a compatibility fallback, and the PNG when prefers-reduced-motion: reduce is enabled. Keep it behind all content with cover sizing and pointer-events: none. Preserve the jade columns as left/right framing elements on desktop; on mobile prioritize the central cloudscape and right-side red-and-gold palace. Add only a restrained blue-gray readability overlay and subtle bottom gradient. Keep the title and birth-data form in the calm center area. Preload the WebP, avoid base64 embedding, prevent layout shift, mark the background decorative/aria-hidden, run project checks, and report every changed file.
```
