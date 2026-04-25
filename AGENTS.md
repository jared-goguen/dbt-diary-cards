# DBT Diary Cards — Agent Instructions

## Runtime

- `bun run serve.ts` — local dev server (uses FileStorage)
- `npm run deploy` — deploy via wrangler

CI uses Node 20. Local dev uses Bun.

## Architecture

Cloudflare Pages Functions app for DBT diary cards. Uses [gutenberg-jg](https://github.com/jared-goguen/gutenberg) for rendering YAML page specs to HTML. Template-driven: a YAML template defines the diary card structure, entries are stored in R2, pages are rendered dynamically at request time.

**Stack:** CF Pages Functions (handlers) → gutenberg-jg (rendering) → R2 (storage)

## File Structure

```
functions/                     # CF Pages Functions (active handlers)
  index.ts                     # Landing page — renders calendar from R2 entries
  diary/[date].ts              # Diary CRUD — GET view/edit, POST save/delete
  debug.ts                     # R2 diagnostic dump at /debug

lib/                           # Shared library code
  storage.ts                   # Storage interface + FileStorage + R2Storage + createStorage()
  render.ts                    # renderView() / renderEdit() using gutenberg pipeline
  save.ts                      # formDataToYaml() — converts form POST data to YAML
  listing.ts                   # buildCalendarBlock() — generates calendar from R2 entries

template.yaml                  # Diary card template (1-5 scale trackers, _editable markers)
_site.yaml                     # Project config: project name, mono theme, cloudflare-pages target
serve.ts                       # Local Bun dev server (uses FileStorage)
wrangler.toml                  # CF config: R2 binding DIARY_BUCKET → dbt-diary-entries
.github/workflows/deploy.yml   # CI/CD: npm install → upload template to R2 → wrangler deploy
public/                        # Static assets (pages_build_output_dir)
docs/
  SCHEMA.md                    # Template format and entry storage documentation
```

## CRUD Flow

1. **Calendar** (`GET /`) — Lists months with filled/today/future day indicators from R2 entry scan
2. **View** (`GET /diary/2026-04-17`) — Renders saved entry in view mode with Edit + Delete action bar
3. **Edit** (`GET /diary/2026-04-17?mode=edit`) — Renders entry as editable form, or new blank entry from template
4. **Save** (`POST /diary/2026-04-17`) — Saves form data to R2 as YAML via `formDataToYaml()`
5. **Delete** (`POST /diary/2026-04-17` with `_method=delete`) — Deletes entry from R2, redirects to calendar

## Storage

Storage interface with two implementations:

- **FileStorage** — Local filesystem for development. Reads `STORAGE_DIR` env var.
- **R2Storage** — Cloudflare R2 for production. Receives bucket binding from CF Pages.
- **createStorage()** factory — `createStorage({bucket})` for CF Pages Functions, `createStorage()` reads `STORAGE_BACKEND` / `STORAGE_DIR` env vars for local dev.

Storage keys:
- `template.yaml` — diary card template
- `diary/YYYY-MM-DD` — individual entries

## Template

`template.yaml` defines the diary card structure using gutenberg page spec format with `_editable` markers:

```yaml
title: "Diary Card — {{DATE}}"
theme: mono
hero:
  title: "Daily Diary Card"
  subtitle: "{{DATE}}"
blocks:
  - section_label:
      text: EMOTIONS
  - tracker:
      _editable: true
      caption: "1 = absent · 3 = neutral · 5 = intense"
      cols: 4
      items:
        - {label: Depression, value: "3", type: rating, max: 5}
        - {label: Anxiety, value: "3", type: rating, max: 5}
```

Rating scale is 1-5, where 3 = neutral. Edit mode uses pure CSS with hidden radio buttons + `:has()` selectors. The `{{DATE}}` placeholder is substituted with the actual date when creating new entries.

## Deployment

- Push to `main` triggers GitHub Actions
- CI: checkout → Node 20 → `npm install` → upload `template.yaml` to R2 → `wrangler pages deploy`
- **Production:** https://dbt-diary-cards.pages.dev/
- **Debug:** https://dbt-diary-cards.pages.dev/debug

## Version Dependency

This project depends on `@jared-goguen/gutenberg` via `github:jared-goguen/gutenberg`. npm caches git dependencies by the `version` field in gutenberg's package.json. **When gutenberg changes need to reach production, you MUST bump gutenberg's version** to force a fresh `npm install`.

## Key Rules

1. **Active handlers are in `functions/`** — not `src/` (that directory is dead code from an earlier architecture).
2. **Template is uploaded to R2** by deploy.yml — it's not served from the filesystem in production.
3. **Gutenberg version must be bumped** to get rendering changes into production.
4. **All rendering goes through the gutenberg-jg pipeline** — no custom HTML generation.
5. **Edit mode is pure CSS** — no JavaScript for form interactions.
