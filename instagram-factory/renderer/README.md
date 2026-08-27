# Production renderer

Deterministic pipeline:

`structured content → HTML/CSS/SVG family → Chromium screenshot → automated QA → production PNG → output`

## One command

```bash
pnpm install
pnpm exec playwright install chromium
pnpm run pipeline
```

The command renders every `posts/*.json` and `stories/*.json` file whose status is exactly `approved-for-render`.

## Source model

- `posts/*.json` — content, asset identity, limited art-directed layout parameters and render status.
- `schemas/post.schema.json` — machine-enforced structured-post contract.
- `stories/*.json` — structured 1080×1920 story series, safe zones, exact text and approved assets.
- `schemas/story-series.schema.json` — machine-enforced story-series contract.
- `renderer/families/` — reusable layout families. Post-specific copy does not live here.
- `renderer/story-families/` — registry of compositionally distinct story layout families.
- `assets/` — approved source photography. Each post pins a SHA-256 checksum.
- `content/*.md` — caption source. Renderer records its checksum and never writes to it.
- `output/` — PNG, per-post QA report, pipeline summary and Pages index.

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

For this benchmark:

```text
https://alexandersmoley.github.io/-/pinned-intro.png
```

GitHub Pages must be enabled once in repository settings with **Source: GitHub Actions**. Until Pages is enabled, the automatically committed PNG has the repository-native raw URL:

```text
https://raw.githubusercontent.com/alexandersmoley/-/claude/tilde-skills-connectors-wkqjmo/instagram-factory/output/pinned-intro.png
```

The workflow renders and hosts files only. It contains no Instagram or Metricool publishing step.
