# Production renderer

Deterministic pipeline:

`structured content → HTML/CSS/SVG family → Chromium frames → automated QA → production PNG/MP4 → output`

## One command

```bash
pnpm install
pnpm exec playwright install chromium
pnpm run pipeline
```

The command renders every `posts/*.json`, `stories/*.json`, `carousels/*.json` and `reels/*.json` file whose status is exactly `approved-for-render`.

## Source model

- `posts/*.json` — content, asset identity, limited art-directed layout parameters and render status.
- `schemas/post.schema.json` — machine-enforced structured-post contract.
- `stories/*.json` — structured 1080×1920 story series, safe zones, exact text and approved assets.
- `schemas/story-series.schema.json` — machine-enforced story-series contract.
- `carousels/*.json` — structured 1080×1440 carousel series with exact slide copy, caption checksum and render status.
- `schemas/carousel-series.schema.json` — machine-enforced carousel contract.
- `reels/*.json` — structured 1080×1920 motion timelines with exact scene/cover copy, caption checksum and audio policy.
- `schemas/reel.schema.json` — machine-enforced Reel contract, including 30 fps, duration, safe zones and publishing lock.
- `renderer/families/` — reusable layout families. Post-specific copy does not live here.
- `renderer/story-families/` — registry of compositionally distinct story layout families.
- `renderer/carousel-families/` — reusable carousel families with art-directed composition modes.
- `renderer/reel-families/` — deterministic motion-editorial families rendered at exact timeline positions.
- `assets/` — approved source photography. Each post pins a SHA-256 checksum.
- `content/*.md` — caption source. Renderer records its checksum and never writes to it.
- `output/` — PNG, per-post QA report, pipeline summary and Pages index.
- `output/<reel-id>/` — MP4 preview, cover PNG, storyboard and machine-readable Reel QA.

## `human-to-system`

The first reusable family implements the approved semantic sequence:

`human photograph → profession as bridge → editorial system`

Controlled inputs include photo height/crop, intro position, bridge size/position, grid start and the proof/future blocks. JSON Schema keeps each parameter inside art-directed ranges. The family owns the six-column grid, typography roles, figure shield and layer semantics.

To create another post in this family:

1. Add its approved source image under `assets/photos/`.
2. Copy `posts/pinned-intro.json` to a new ID.
3. Replace content and asset metadata, including SHA-256.
4. Adjust only schema-approved layout parameters.
5. Set `status` to `approved-for-render`.
6. Run `pnpm run pipeline`.

## QA gates

The build fails on schema errors, missing assets/fonts, incorrect photo checksum, altered caption source, wrong canvas/PNG dimensions, overflow, substituted fonts, undersized type, unapproved visible text/effects, protected-zone overlap, a non-dominant bridge word, a bridge that does not cross the photo/system boundary, or a grid outside the system zone.

## Instagram Stories

Story series use a fixed 1080×1920 canvas and an explicit Instagram UI safe zone. The first series, `about-me-stories`, implements eight registered families:

- `story-type-intro`
- `story-type-list`
- `story-proof-list`
- `story-statement`
- `story-process-diagram`
- `story-manifesto`
- `story-photo-editorial`
- `story-closing-list`

Each family owns a distinct composition while sharing the canonical paper, ink, blue, grid and font tokens. The story build produces eight individual PNG files, one QA report per story, a series QA summary and a contact sheet under `output/about-me-stories/`.

Story QA fails the build for incorrect dimensions, overflow, text outside the safe zone, substituted or unapproved fonts, source-text mismatch, unapproved colors/effects/elements, incorrect source photography or an overlay intersecting the protected face/figure zones.

## Process diagram carousel

`process-diagram-carousel` is a reusable 1080×1440 family for editorial process case studies. It supports five controlled modes — `statement`, `pipeline`, `breakpoint`, `criteria-list` and `closing` — while keeping one visual grammar across the sequence.

The first benchmark is `automation-day-carousel`: nine slides, no photography, functional arrows only on pipeline slides, exact copy and caption verified directly against `content/automation-day-carousel.md`. The build produces nine PNGs, individual QA reports, a carousel summary and a contact sheet under `output/automation-day-carousel/`.

Editorial typography is enforced in the renderer: headline roles cannot end in a period, 1080×1440 carousel text stays inside a 120 px safe zone, display/body leading uses the shared `0.94`/`1.24` tokens, and Russian short words receive non-breaking spaces without changing canonical copy comparison.

## Pinned intro editorial carousel

`pinned-intro-editorial` is a reusable 1080×1440 family for a human-led introduction that moves from a person and evidence toward a working system. Its benchmark, `pinned-intro-carousel-v2`, has three compositionally distinct cover directions and nine production slides. Cover B is the selected first slide.

The renderer reads `carousels/pinned-intro-carousel-v2/source.json`, checks every visible text node and the caption against the final copy freeze in `content/pinned-intro-carousel-v2.md`, pins the approved Canva photo asset `MAHTX_B6J9k` by checksum, and renders HTML/CSS/SVG without generative imagery. It produces all slide PNGs, all cover variants, a contact sheet, a profile-scale cover sheet and machine-readable QA under `output/pinned-intro-carousel-v2/`.

Run only this benchmark with:

```bash
pnpm run render:pinned-intro-v2
```

The QA gates enforce exact 1080×1440 output, the 120 px safe zone, Inter/Cormorant Garamond Regular/Italic only, exact copy, approved colors, correct source photography, non-breaking spaces, no terminal headline periods, no overflow, no invented interface elements and no publishing controls.

## Calm human-to-system carousel

`human-to-system-calm` is the writing-contract version of the same semantic family. Its benchmark, `pinned-intro-carousel-v3`, renders seven 1080×1440 slides from exact approved copy.

The original Canva photo `MAHTZduqLyI` appears exactly once, full-frame on slide 02 with `object-fit: contain`. The 3:4 composition, hands and figures are preserved. The remaining slides use typography, an evidence table and functional process diagrams. No generative imagery is used.

Run only this benchmark with:

```bash
pnpm run render:pinned-intro-v3
```

QA checks exact copy and caption, the writing contract, fonts, colors, safe zones, non-breaking spaces, source-photo checksum and dimensions, single-use full-frame photo composition, contact sheet and cover preview.

## Motion editorial Reel

`motion-editorial-system` is the reusable 1080×1920 family for motion-first Reels without talking head or voice-over. It renders every frame deterministically in Chromium, pipes the PNG frame stream to FFmpeg at 30 fps and adds a deterministic original stereo instrumental bed. The first benchmark, `chatgpt-not-a-content-factory-reel`, uses six scene families inside one narrative system and remains locked to `publish: false`.

Reel QA verifies schema/status, exact scene and cover copy, unchanged caption/source checksums, fonts, brand colors, safe zones, overflow/effects, continuous timeline, distinct motion frames, MP4 dimensions/frame rate/duration, stereo audio, cover size and storyboard creation. Run only the Reel renderer with:

```bash
pnpm run render:reels
```

## HTTPS output

After successful render and QA, the GitHub Action commits generated PNG files and the output index back to `output/` on the default branch. This keeps the repository-native raw HTTPS URL current without requiring GitHub Pages.

When Pages is enabled, the same Action also publishes the successful `output/` bundle through GitHub Pages. Stable Pages URL pattern:

It runs automatically after relevant pushes to the default branch and can also be started manually with `workflow_dispatch`.

```text
https://alexandersmoley.github.io/-/<post-id>.png
```

Story series use:

```text
https://alexandersmoley.github.io/-/<series-id>/<story-id>.png
```

Carousel slides use the same nested URL pattern:

```text
https://alexandersmoley.github.io/-/<carousel-id>/<slide-id>.png
```

Reel media uses:

```text
https://alexandersmoley.github.io/-/<reel-id>/preview.mp4
https://alexandersmoley.github.io/-/<reel-id>/cover.png
https://alexandersmoley.github.io/-/<reel-id>/storyboard.png
```

For this benchmark:

```text
https://alexandersmoley.github.io/-/pinned-intro.png
```

GitHub Pages must be enabled once in repository settings with **Source: GitHub Actions**. Until Pages is enabled, the automatically committed PNG has the repository-native raw URL:

```text
https://raw.githubusercontent.com/alexandersmoley/-/claude/tilde-skills-connectors-wkqjmo/instagram-factory/output/pinned-intro.png
```

The workflow renders and hosts files only. It contains no Instagram or Metricool publishing step.
