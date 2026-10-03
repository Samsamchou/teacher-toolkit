# Basketball delivery variants

Original source PNGs remain unchanged. Derived assets are WebP at quality 82, compression level 6, encoded with local FFmpeg/libwebp at original dimensions. No AI generation or original source project changes.

| Asset | PNG bytes | WebP bytes |
|---|---:|---:|
| court | 3183724 | 383724 |
| cat-dog | 2475954 | 327048 |
| rabbit-panda | 2451808 | 304970 |
| fox-penguin | 2404380 | 305270 |

CSS and sprite renderer now request WebP. The selected basketball classroom warms these four assets in the background after 1.5 seconds; data-saving mode skips this prefetch. A CSS court color fallback and SVG hoop remain usable without the background. No scoring or reward logic was changed.

Controlled local Chrome test, cache disabled, 200000 bytes/s and 150 ms latency: original background 16356 ms; WebP 2123 ms. These are simulated transfer measurements, not school-network or full game-ready timings. Real device acceptance and cache-revisit timing remain separate checks.
