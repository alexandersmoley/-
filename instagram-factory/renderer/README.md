# Production renderer

Deterministic pipeline:

`structured post → HTML/CSS/SVG family → Chromium screenshot → automated QA → PNG 1080×1440 → output`

## One command

```bash
pnpm install
pnpm exec playwright install chromium
pnpm run pipeline
```

The command renders every `posts/*.json` file whose status is exactly `approved-for-render`.

## Source model

- `posts/*.json` — content, asset identity, limited art-directed layout parameters and render status.
- `schemas/post.schema.json` — machine-enforced structured-post contract.
- `renderer/families/` — reusable layout families. Post-specific copy does not live here.
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

## HTTPS output

The GitHub Action publishes the successful `output/` bundle through GitHub Pages. Stable production URL pattern:

It runs automatically after relevant pushes to the default branch and can also be started manually with `workflow_dispatch`.

```text
https://alexandersmoley.github.io/-/<post-id>.png
```

For this benchmark:

```text
https://alexandersmoley.github.io/-/pinned-intro.png
```

GitHub Pages must be enabled once in repository settings with **Source: GitHub Actions**. Until Pages is enabled, a committed PNG also has the repository-native raw URL:

```text
https://raw.githubusercontent.com/alexandersmoley/-/claude/tilde-skills-connectors-wkqjmo/instagram-factory/output/pinned-intro.png
```

The workflow renders and hosts files only. It contains no Instagram or Metricool publishing step.
