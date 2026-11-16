This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Package manager

This project uses **pnpm** (pinned via `packageManager` in `package.json`; Node via `.tool-versions`). Never use npm, npx, or yarn here, and never create `package-lock.json` or `yarn.lock`. `pnpm-workspace.yaml` holds supply-chain settings (build-script allowlist, release-age cooldown); keep it.

When skills or docs show `npx emdash ...`, run `pnpm exec emdash ...` instead. Add dependencies with `pnpm add <pkg>` (`-D` for dev).

## Commands

```bash
pnpm install                          # Install dependencies
pnpm dev                              # Start the Astro dev server
pnpm exec emdash types                # Regenerate TypeScript types from a running site
pnpm typecheck                        # astro check
pnpm fix                              # Format everything with Prettier (.prettierrc.mjs, .prettierignore)
pnpm format:check                     # Check formatting without writing
pnpm run deploy                       # Build and deploy to Cloudflare (wrangler login first)
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Hosting (Cloudflare Workers)

The site runs on Cloudflare Workers via `@astrojs/cloudflare` + `@emdash-cms/cloudflare`: content in D1 (`DB`), media in R2 (`MEDIA`), live-editing rooms in a Durable Object, and a one-minute cron for scheduled publishing. Bindings live in `wrangler.jsonc`; `src/worker.ts` is the Worker entry (re-exports EmDash's Durable Objects and adds the `scheduled()` handler). The first `wrangler deploy` provisions D1/R2/KV by name.

- `pnpm dev` runs on the Workers runtime with local D1/R2 under `.wrangler/state` (gitignored); there is no `data.db`. To start fresh locally, stop the dev server, delete `.wrangler/state`, restart, and run setup again (the bundled seed applies on setup). `emdash seed`/`emdash doctor` without `--url` operate on `./data.db`, not local D1.
- Content moves between sites with Site Transfer (admin → Settings → Transfer, or `emdash site export|import --url`). Users, plugin storage (lead submissions), and plugin settings are not transferred.
- Sandboxed/registry plugins need Workers Paid (`worker_loaders` binding `LOADER`). On the free plan remove `sandboxRunner` and `worker_loaders`.
- Run `pnpm exec wrangler types` to inspect binding types after changing `wrangler.jsonc` (the output isn't included in `tsconfig.json` because it conflicts with DOM types).

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `wrangler.jsonc`         | Cloudflare Worker name, bindings (D1, R2, Durable Object, loader), cron            |
| `src/worker.ts`          | Worker entry: EmDash handler, Durable Object exports, `scheduled()` handler        |
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

| Page            | Path                          | What it shows                                                           |
| --------------- | ----------------------------- | ----------------------------------------------------------------------- |
| Home            | `/`                           | `homepage` singleton, articles, testimonials, FAQs, lead forms          |
| Learning Center | `/learn` (`?topic=`, `?tag=`) | Posts, filterable by category (parents include subcategories) or tag    |
| Article         | `/learn/[slug]`               | Post content, guide + home-value forms                                  |
| Page            | `/[slug]`                     | Published `pages` entries (About, Pricing, tools, Sellers/Buyers, etc.) |

## Schema

- `posts` (Articles): imported from WordPress. Taxonomies `category` (hierarchical: Sellers, Buyers, Local Living, Right-Sizing Your Life parents) and `tag`.
- `pages`: imported from WordPress, rendered by `src/pages/[slug].astro`; SEO panel enabled (pages are in the sitemap).
- `homepage` singleton, `testimonials` (real Google reviews), `faqs`, `team` (`/about` team grid), `workshops` (currently empty; banner falls back to a tagline).
- Menus: `primary` (supports one level of dropdown children), `footer_learn`, `footer_services`.
- Site settings: `title`, `tagline`, `logo` (header), `social` (footer links).

## Site content model

- Learning Center articles are the `posts` collection (labelled "Articles"; imported from WordPress with the emdash-exporter plugin), served at `/learn/{slug}`. A pattern redirect sends old `/blog/[slug]` URLs there.
- Learning Center "topics" are the `category` taxonomy (`?topic=<category-slug>`); `TopicNav` hides empty categories. `tag` is also on posts.
- Topic chips update the article list in place: links with `data-swap="<element id>"` are handled by the swap script in `Base.astro` (fetches the page or `data-swap-src`, replaces that element; `data-swap-history` updates the URL for back/forward). `/learn` swaps `#learn-results`; the homepage swaps `#home-articles` from the `/partials/home-articles?topic=` fragment without changing the URL. Plain links still work without JS.
- Animations use the browser View Transitions API (no `<ClientRouter />`): `@view-transition { navigation: auto }` in `global.css` crossfades page navigations with the sticky nav (`site-nav`) held still, and the swap script wraps updates in `document.startViewTransition()`, temporarily naming the region's `[data-swap-animate]` element `swap-content` so the results grid fades up. Both are skipped for `prefers-reduced-motion` and in unsupported browsers.
- Homepage topic chips come from `homepage.featured_topics` (category labels; empty = the 4 busiest parents). Its options are fixed in the schema, so add new top-level categories there too.
- `/#<topic-slug>` (e.g. `/#sellers`, `/#buyers`, used by the Sellers/Buyers menu items and homepage path cards) scrolls to the homepage Learning Center and selects that featured topic (script at the end of `index.astro`, matching chips by `data-topic`). The old `/sellers-start-here` and `/buyers-start-here` link pages are unpublished and redirect there.
- `posts.featured` ("Feature on homepage") picks the homepage lead article; otherwise the newest is used.
- Imported bodies contain WordPress `htmlBlock`s. `src/components/ArticleHtmlBlock.astro` rebuilds Kadence buttons (`kadence/singlebtn`, stored as empty comments) from `originalAttrs`; other blocks use EmDash's `HtmlBlock`.
- If an article's first block is a landscape YouTube embed, `learn/[slug].astro` shows it in place of the featured image (the image is still used for cards and share previews). `src/components/ArticleEmbed.astro` plays YouTube Shorts links (`youtube.com/shorts/ID`, which EmDash's `Embed` doesn't recognise) in a vertical frame; Shorts never replace the featured image.
- Page shortcodes: a paragraph containing only `[name args]` in a page body is replaced by a component (`splitShortcodes` in `src/lib/site.ts`, mapped in `src/pages/[slug].astro`): `[team]`, `[closing-cost-calculator]`, `[equity-calculator]`, `[mortgage-calculator]`, `[mortgage-rates]`, `[market-chart median-price|days-on-market]`. Components live in `src/components/tools/` and `TeamGrid.astro`; equity data is in `src/lib/median-prices.ts`.
- WordPress URLs are preserved with 301 redirects (admin → Redirects, group "WordPress"): root post slugs → `/learn/<slug>`, `/category/...` → `/learn?topic=`, `/tag/...` → `/learn?tag=`, `/contact-us` → `/#contact`, retired pages → `/`.
- Tracking: GA4 (`G-4RZRQK05GB`) and Meta Pixel (`458970391416189`) load from `Base.astro` in production builds only, and not while the site is in staging (Settings → `staging`, which also adds `noindex`); successful lead forms fire `generate_lead` / `Lead` events. The privacy policy describes both.

## Plugins

`plugins/lead-forms` is a native plugin registered in `astro.config.mjs`. Every `form[data-lead="contact|guide|home-value"]` is posted by the script in `Base.astro` to `/_emdash/api/plugins/lead-forms/submit`; submissions are validated, rate-limited per IP, saved to plugin storage, and emailed to `LEAD_FORMS_TO` (default `lafaverandwalters@gmail.com`) with Reply-To set to the visitor. In dev, emails are captured at `/_emdash/api/dev/emails`; production needs an email provider configured in EmDash (SMTP secrets, or Cloudflare Email once the domain is on Cloudflare) or messages are only stored.

Sandboxed plugins are enabled via `sandboxRunner: sandbox()` from `@emdash-cms/cloudflare` in `astro.config.mjs` (uses the `LOADER` Worker Loader binding). Admins can install registry plugins from **Registry** in the admin; plugin code runs in isolated Worker isolates. Config-managed plugins go in `emdash({ plugins: [] })` (native, in-process) or `sandboxed: []` -- follow each package's instructions. Never set `sandbox: false` outside local debugging. Docs: https://docs.emdashcms.com/plugins/installing/

## Styling

Styling is **Tailwind CSS v4** (via `@tailwindcss/vite` in `astro.config.mjs`). Write utility classes in markup; don't add `<style>` blocks or new CSS files.

- `src/styles/global.css` is the single stylesheet: `@theme` tokens (colours like `brand`, `ink`, `ivory`; fonts `font-serif`/`font-sans`; breakpoints `sm` 721px, `md` 1001px, `lg` 1101px, `xl` 1280px), base styles, and shared `@utility` classes (`wrap`, `eyebrow`, `section-title`, `lead`, `btn` + `btn-red`/`btn-line`/`btn-black`/`btn-white`, `field-label`, `field-input`, `cover`). Use tokens instead of raw hex values; add a token or `@utility` when a value or pattern repeats.
- The `--text-*` scale is redefined **without line-heights** (Tailwind's defaults set them); text inherits body line-height 1.7 unless a `leading-*` class is set.
- `.article-body` (in `@layer components`) styles CMS Portable Text, which can't carry utility classes. Keep rich-text styling there.
- Breakpoints are mobile-first (`md:` = 1001px and up).
- PA advertising rules: wherever Randyl's cell number appears in the header/footer, the brokerage office number (`homepage.office_phone`) must appear at the same font size. Don't shrink or remove it.
