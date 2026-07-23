# Website Agent Guide

Read the root `AGENTS.md` and `docs/dev/PRODUCT.md` before changing `www/`.
This file contains only website-specific additions.

## Purpose

The website supports the mobile app with accurate marketing, support, FAQ,
legal, and release-note pages. It is not a SaaS product or dashboard.

Current public routes:

- `/`
- `/faq`
- `/privacy`
- `/terms`
- `/whats-new`
- `/legal`

Do not add pages or advertise features that are not in the current app.

## Implementation

- Use Astro, semantic HTML, and plain CSS.
- Keep output static and client-side JavaScript at zero unless a real
  interaction requires it.
- Prefer existing components and styles over dependencies.
- Preserve title, description, canonical URL, Open Graph metadata, heading
  order, keyboard access, alt text, contrast, and responsive layouts.
- Keep visuals calm, lightweight, and consistent with the app.
- Avoid popups, cookie banners without a legal need, heavy animation, large
  decorative assets, trackers, ads, or analytics.

## Shared documents

Privacy, Terms, FAQ, and What's New are authored in `../docs/content`.

```bash
pnpm content:sync
pnpm content:check
```

Never edit or commit `src/content/generated/shared-documents.json`.
Keep synchronization in `prebuild`; the post-build verifier must compare
rendered pages with canonical content and reject missing routes or broken
internal links.

## Cloudflare Pages

Production is <https://simplefasting.app> on Cloudflare Pages.

- `wrangler.toml` defines the Pages project and `pages_build_output_dir`.
- Do not add a Workers `main` entry.
- `.github/workflows/www-release.yml` builds a reviewed ref and can deploy the
  verified `dist/` artifact.
- Do not enable Cloudflare Web Analytics or other tracking without explicit
  approval and updated privacy documentation.

## Verification

Run from `www/`:

```bash
pnpm test
```

This must synchronize shared content, check drift, build all routes, and run the
post-build verifier. Also inspect responsive rendering when layout or imagery
changes.
