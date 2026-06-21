# Simple Fasting website

Static marketing and legal website for Simple Fasting, built with Astro components and plain CSS.
It ships no client-side framework or application JavaScript.

## Commands

Run these commands from this directory:

```sh
pnpm install
pnpm dev
pnpm build
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

Privacy Policy, Terms of Use, and FAQ copy is authored in `../docs`. `pnpm content:sync` regenerates `src/content/generated/shared-documents.json` for both the website and app. Never edit generated JSON directly.

`dev`, `build`, and `preview` synchronize automatically. The `prebuild` lifecycle hook is mandatory and must remain attached to `pnpm build`. Use `pnpm content:check` in CI to fail when generated content is stale, and commit canonical Markdown plus both generated JSON files together.
