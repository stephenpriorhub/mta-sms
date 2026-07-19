# MTA T-Letter Sites (`mta-sms`)

A lightweight, mobile-first CMS for Monument Traders Alliance T-Letters. One app,
two surfaces:

- **PUBLIC** — path-per-list T-Letter pages. Each list lives at `/<slug>` where
  the slug is **exactly 5 lowercase-alphanumeric characters**. Every list is
  **fully isolated**: its own branding, no shared nav, no links to sibling lists.
- **ADMIN** — `/admin`, gated by OxfordHub SSO. CRUD for lists and posts, in-app
  image upload, and an analytics dashboard.

> Live public domain (planned): **mtasms.com** (bought after the temp deploy is
> approved). Deploys first to the Railway-generated temp URL. Admin SSO is served
> from a `*.oxfordhub.app` subdomain — see "Domains" below.

## Stack
Next.js 16 (App Router, `output: standalone`) · Prisma · PostgreSQL · `sharp`
for image resize · Railway (nixpacks) · Node 22.

## Domains (important)
The OxfordHub session cookie is scoped to `.oxfordhub.app` and the hub `/api/me`
CORS only allows `*.oxfordhub.app`. Therefore:
- **Public, auth-free pages** work on any domain — the temp `*.up.railway.app`
  URL and later the apex `mtasms.com`.
- **Admin SSO** must be reached via a `*.oxfordhub.app` subdomain attached to the
  same Railway service (e.g. `mtasms.oxfordhub.app/admin`). Admin will appear
  locked/blank on non-oxfordhub.app domains — that is expected.

## Environment
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Railway Postgres (variable reference) |
| `NEXT_PUBLIC_HUB_PROJECT_ID` | Hub Project.id — **`mta-sms`** (must match the hub row) |
| `HUB_URL` | Hub base URL, default `https://oxfordhub.app` |
| `HUB_API_TOKEN` | Shared service token for `x-hub-token` maintenance calls |

## Deploy
Push to `main` → Railway autodeploys. `preDeployCommand` runs
`prisma db push --accept-data-loss` to sync the schema (greenfield — no
migrations folder yet; switch to `prisma migrate deploy` once one is adopted).

Seed demo content (idempotent, upserts on slug `trade`):
```
npm run db:seed
```

## Data model
`List` (name, 5-char unique slug, logoUrl?, topAd*, archivesEnabled) ·
`Post` (listId, title?, publishDate, content HTML, actionToTake?, actionSecondary?,
button*) · `PageView` · `LinkClick` · `Asset` (webp bytes, served via `/api/img/[id]`).

## Tracking (first-party only — no third-party analytics)
- Page views: 1x1 pixel at `/api/px?l=<listId>&p=<postId>`.
- Link clicks: first-party redirect `/r/<postId>?u=<url>&label=<label>` — content
  links are auto-rewritten through it; the action button and top ad use it too.
- Surfaced in the admin analytics dashboard (per-list, per-post, per-link).

## Performance
SSR/ISR (`revalidate = 60`), near-zero client JS on public pages (native
`<details>` archives, `<img>` pixel, redirect links), inlined critical CSS,
images auto-resized to webp (max edge 1000px) with immutable caching. Fast is a
feature — traffic is strictly mobile.
