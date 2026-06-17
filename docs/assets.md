# Asset Licensing

All visual assets for Celestial Break in this repository are original files created for this project.
No third-party copyrighted anime or franchise assets are included.
No remote image hotlinking is used.

---

## Asset Manifest

### client/src/assets/celestial-orb.svg
- **Purpose:** Hero orb graphic on the Landing screen and general decorative use
- **Format:** SVG (vector, scalable)
- **Source:** Original, hand-authored for this project
- **License:** MIT (same as repository)
- **Author:** Project contributors
- **Date created:** 2024
- **Notes:** 512×512 viewBox; radial gradient core on dark background

---

### client/src/assets/rank-badges.svg
- **Purpose:** Rank badge sprite sheet — four ranks (Comet, Lumen, Nova, Astral) laid out
  horizontally at 192×192 px each; referenced via CSS background-position sprite technique
- **Format:** SVG sprite sheet (768×192 viewBox)
- **Source:** Original, hand-authored for this project
- **License:** MIT (same as repository)
- **Author:** Project contributors
- **Date created:** 2024 (updated 2025 with distinct iconography per rank)
- **Notes:** Rank icons: Comet (comet tail), Lumen (star polygon), Nova (orbital rings + dots),
  Astral (gold star polygon). Must keep 4-cell 192px-wide layout for CSS sprite offsets.

---

### client/src/assets/lobby-banner.svg
- **Purpose:** Decorative banner background element (lobby and general scenes)
- **Format:** SVG (vector)
- **Source:** Original, hand-authored for this project
- **License:** MIT (same as repository)
- **Author:** Project contributors
- **Date created:** 2024
- **Notes:** 1280×420 viewBox; dark gradient with abstract orb shapes

---

### client/public/favicon.svg
- **Purpose:** SVG favicon and browser tab icon
- **Format:** SVG (vector, scalable)
- **Source:** Original, hand-authored for this project
- **License:** MIT (same as repository)
- **Author:** Project contributors
- **Date created:** 2025
- **Notes:** 128×128 viewBox; orbital rings + radial gradient orb on dark rounded square.
  Referenced in public/index.html via `<link rel="icon" type="image/svg+xml">`.

---

### marketing/assets/icon.svg
- **Purpose:** App icon for marketing materials and store listings
- **Format:** SVG (vector, scalable to any resolution)
- **Source:** Original, hand-authored for this project
- **License:** MIT (same as repository)
- **Author:** Project contributors
- **Date created:** 2024
- **Notes:** 128×128 viewBox; identical visual language to favicon.svg

---

### marketing/assets/og-card.svg
- **Purpose:** Open Graph / social-media preview card (1200×630)
- **Format:** SVG (1200×630 viewBox)
- **Source:** Original, hand-authored for this project
- **License:** MIT (same as repository)
- **Author:** Project contributors
- **Date created:** 2024
- **Notes:** Contains game title text "Celestial Break" and tagline in a font-stack that
  resolves to system fonts (Inter, Segoe UI, Arial). No web-font dependency.

---

## Visual Design System

Color palette defined in `client/src/App.css` `:root`:

| Token            | Value                        | Usage                        |
|------------------|------------------------------|------------------------------|
| `--bg-1`         | `#090b1d`                    | Deepest background           |
| `--bg-2`         | `#1a1440`                    | Mid background               |
| `--bg-3`         | `#32215d`                    | Highlight background         |
| `--glass`        | `rgba(140,160,255,0.11)`     | Panel surface                |
| `--line`         | `rgba(165,176,255,0.30)`     | Borders                      |
| `--text`         | `#e7ecff`                    | Primary text                 |
| `--muted`        | `#a8b4d8`                    | Secondary text               |
| `--primary`      | `#4dddff`                    | Electric cyan — primary CTA  |
| `--secondary`    | `#9b6dff`                    | Violet — secondary accent    |
| `--accent`       | `#ffd166`                    | Gold — score, achievement    |
| `--success`      | `#4fffb0`                    | Valid move, winner           |
| `--danger`       | `#ff4d88`                    | Error, urgency               |
| `--warning`      | `#ffbc42`                    | Caution, low turns           |

Animations defined in `client/src/App.css`:
- `twinkle` — star background opacity breath
- `pulse-core` — core orb glow expansion
- `float` — hero orb vertical float
- `token-select-pop` — token selection micro-bounce
- `valid-flash` — valid-break label fade-in
- `urgency-pulse` — timer urgent blink
- `countdown-glow` — countdown text glow pulse

All animations respect `prefers-reduced-motion: reduce` (global rule in App.css).

---

## Free Asset Source Notes

No external free-asset libraries were used in this project.
All assets are original SVG files authored for this project.

If future raster assets are needed, recommended legally-safe sources:
- **Kenney.nl** — CC0, no attribution required
- **OpenGameArt.org** — filter by CC0 only
- **game-icons.net** — CC BY 3.0 (attribution required if used; document in this file)
- **itch.io** — filter by CC0 or clearly permissive license; verify per-asset

For every external asset added in future, record: source URL, license, author, attribution text.

---

## AI-Generated Asset Notes

No AI-generated raster images are currently used.

If AI assets are generated in future:
- Use only tools/models with permissive output licenses (e.g., local Stable Diffusion models,
  ComfyUI with open-weight models, or services with explicit commercial-use terms).
- Record generation prompt, tool/model, date, and any license notes in this file.
- Do not commit model weights or generation caches.
- Store prompts in this file under a "Generation Prompts" section.
- Do not generate images that resemble known copyrighted franchises or characters.
