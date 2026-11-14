This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Package manager

This project uses **pnpm** (pinned via `packageManager` in `package.json`; Node via `.tool-versions`). Never use npm, npx, or yarn here, and never create `package-lock.json` or `yarn.lock`. `pnpm-workspace.yaml` holds supply-chain settings (build-script allowlist, release-age cooldown); keep it.

When skills or docs show `npx emdash ...`, run `pnpm exec emdash ...` instead. Add dependencies with `pnpm add <pkg>` (`-D` for dev).

## Commands

```bash
pnpm install                          # Install dependencies
pnpm dev                              # Start the Astro dev server
pnpm exec emdash types                # Regenerate TypeScript types from a running site
pnpm exec emdash seed seed/seed.json  # Apply schema + sample content to ./data.db
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/Base.astro` | Base layout with EmDash wiring (menus, search, page contributions)                 |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp`. When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall. The docs reflect current behaviour; assumptions may not.

This template ships with `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json` so Claude Code, Cursor, and VS Code auto-discover the docs server. Other tools (OpenCode, Windsurf, etc.) need a manual one-time setup -- see [docs.emdashcms.com/docs-mcp](https://docs.emdashcms.com/docs-mcp).

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- When Astro's cache is enabled, pass content-query hints to `Astro.cache.set(cacheHint)`. Use the `WithCacheHint` variants for site settings, menus, taxonomies, and widget areas rendered by cached routes.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## This Template

A general-purpose starting point with posts, pages, categories, and tags. Less opinionated than the themed templates -- a base for sites that want to define their own design.

There is intentionally no `theme.css`, no custom font configuration, no styled layouts beyond browser defaults. The home, posts index, post detail, page, category, and tag pages all render with minimal styling. Start here if you want full control over the visual language; start with `blog`, `portfolio`, or `marketing` if you want a designed template to customise.

## Pages

| Page        | Path               | What it shows                                  |
| ----------- | ------------------ | ---------------------------------------------- |
| Home        | `/`                | Site title + tagline, links into Posts / About |
| All posts   | `/posts`           | Post list                                      |
| Post detail | `/posts/[slug]`    | Post content                                   |
| Page        | `/[slug]`          | Static page content (e.g. `/about`)            |
| Category    | `/category/[slug]` | Posts filtered by category                     |
| Tag         | `/tag/[slug]`      | Posts filtered by tag                          |

## Schema

- `posts` collection: `title`, `featured_image`, `content` (Portable Text), `excerpt` (text).
- `pages` collection: `title`, `content` (Portable Text).
- Taxonomies: `category`, `tag`.
- Single `primary` menu.

Site settings have `title` and `tagline`.

## Styling

Styling is **Tailwind CSS v4** (via `@tailwindcss/vite` in `astro.config.mjs`). Write utility classes in markup; don't add `<style>` blocks or new CSS files.

- `src/styles/global.css` is the single stylesheet: `@theme` tokens (colours like `brand`, `ink`, `ivory`; fonts `font-serif`/`font-sans`; breakpoints `sm` 721px, `md` 1001px, `lg` 1101px), base styles, and shared `@utility` classes (`wrap`, `eyebrow`, `section-title`, `lead`, `btn` + `btn-red`/`btn-line`/`btn-black`/`btn-white`, `field-label`, `field-input`, `cover`). Use tokens instead of raw hex values; add a token or `@utility` when a value or pattern repeats.
- The `--text-*` scale is redefined **without line-heights** (Tailwind's defaults set them); text inherits body line-height 1.7 unless a `leading-*` class is set.
- `.article-body` (in `@layer components`) styles CMS Portable Text, which can't carry utility classes. Keep rich-text styling there.
- Breakpoints are mobile-first (`md:` = 1001px and up).

