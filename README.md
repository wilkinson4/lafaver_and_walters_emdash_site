# Randyl Homes Group

EmDash + Astro site (Node.js, SQLite, local uploads). Requires Node ≥ 22.23.4 (pinned to 24.13.0 in `.tool-versions`).

## Pages

| Page | Route |
|---|---|
| Homepage | `/` |
| Learning Center (filter with `?topic=`) | `/learn` |
| Article | `/learn/:slug` |
| 404 | fallback |

## Editable content (EmDash admin)

- **Homepage** (singleton): hero, journey paths, guide, stats, quiz, about, FAQ/contact headings, contact details, footer
- **Articles** with **Topics** taxonomy
- **Workshops** (the next upcoming one drives the top banner and workshop section)
- **Testimonials**, **FAQs**
- **Menus**: `primary`, `footer_learn`, `footer_services`

Schema and sample content live in `seed/seed.json`.

## Getting started

Uses pnpm (see `packageManager` in `package.json`).

```bash
pnpm install
pnpm exec emdash seed seed/seed.json   # schema + sample content (downloads images)
pnpm dev
```

Open http://localhost:4321/_emdash/admin to complete setup. The site runs at http://localhost:4321.

## Styling

Tailwind CSS v4. Design tokens (colours, fonts, breakpoints) and shared utilities live in `src/styles/global.css`; article rich text is styled by `.article-body` there.

## Not yet wired up

Lead forms (guide, consultation, home value) show a preview notice and don't submit anywhere. The quiz section is static.
