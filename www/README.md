# Simple Fasting website

Static marketing and legal website for Simple Fasting, built with Astro components and plain CSS.
It ships no client-side framework or application JavaScript.

## Commands

Run these commands from this directory:

```sh
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm preview
```

The production build is written to `dist/`.

## Pages

- `/` — marketing homepage with FAQ summary
- `/faq` — full FAQ
- `/privacy` — privacy policy
- `/terms` — terms of use
- `/legal` — legal overview

The canonical production origin is configured in `astro.config.mjs`.

## Shared legal and FAQ content

Privacy Policy, Terms of Use, and FAQ copy is authored in `../docs/content`. `pnpm content:sync` regenerates `src/content/generated/shared-documents.json` for both the website and app. Never edit generated JSON directly.

The website itself does not install analytics. The shared Privacy Policy and FAQ disclose that the mobile app has no analytics SDK, no installation identifier, user-shared local diagnostics, and native Apple/Google platform crash reporting where available; changing that reporting model requires updating the canonical documents before release.

`dev`, `build`, and `preview` synchronize automatically. The `prebuild` lifecycle hook is mandatory and must remain attached to `pnpm build`. CI runs `content:sync` and `content:check` before build so Astro uses current generated JSON. `postbuild` verifies rendered content and routes. Commit canonical Markdown only; generated app and website JSON files are ignored.

`pnpm test` regenerates shared content, checks it, then performs a production build. The post-build verifier requires all five routes, compares the full rendered Privacy Policy, Terms, and FAQ with the generated shared source, checks homepage FAQ headings, and rejects broken internal page links.
