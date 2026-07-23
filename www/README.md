# Simple Fasting website

Static marketing and legal website for Simple Fasting, built with Astro and
plain CSS. It ships no client-side application JavaScript.

Production: <https://simplefasting.app>

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

## Cloudflare Pages

Production is a static Cloudflare Pages project. `wrangler.toml` defines the
`simple-fasting` Pages project and uses `pages_build_output_dir = "./dist"`.

The Wrangler configuration intentionally has no `main` entry. `main` is a
Workers entry point and does not apply to Pages. The website release workflow
builds the selected ref and can deploy the verified `dist/` artifact from this
directory.

## Pages

- `/` — marketing homepage with FAQ summary
- `/faq` — full FAQ
- `/privacy` — privacy policy
- `/terms` — terms of use
- `/whats-new` — version history and release notes
- `/legal` — legal overview

The canonical production origin is configured in `astro.config.mjs`.

## Shared legal and FAQ content

Privacy Policy, Terms of Use, FAQ, and What's New copy is authored in `../docs/content`. `pnpm content:sync` regenerates `src/content/generated/shared-documents.json` for both the website and app. Never edit generated JSON directly.

The website itself does not install analytics. The shared Privacy Policy and FAQ disclose that the mobile app has no analytics SDK, no installation identifier, user-shared local diagnostics, and native Apple/Google platform crash reporting where available; changing that reporting model requires updating the canonical documents before release.

`dev`, `build`, and `preview` synchronize automatically. The `prebuild` lifecycle hook is mandatory and must remain attached to `pnpm build`. CI runs `content:sync` and `content:check` before build so Astro uses current generated JSON. `postbuild` verifies rendered content and routes. Commit canonical Markdown only; generated app and website JSON files are ignored.

`pnpm test` regenerates shared content, checks it, then performs a production build. The post-build verifier requires all public routes, compares the full rendered Privacy Policy, Terms, FAQ, and What's New with the generated shared source, checks homepage FAQ headings, and rejects broken internal page links.
