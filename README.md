# Simple Fasting

Privacy-first, offline-first fasting tracker with no account, backend, analytics, ads, or subscription.

- `app/` — Expo React Native application for iOS and Android.
- `www/` — static Astro website.
- `docs/plan/` — product specification, execution plan, release guide, and roadmap.
- `docs/legal/` and `docs/faq.md` — versioned shared content for the app and website.

Current development is focused on the mobile application. Start with [`app/README.md`](app/README.md) for setup and commands, and [`docs/plan/01-product-specification.md`](docs/plan/01-product-specification.md) for product behavior.

Edit legal and FAQ copy only in `docs`, then run `node scripts/sync-shared-content.mjs`. The checked-in generated JSON keeps native builds offline and lets Astro render the same content without a runtime Markdown dependency.

## Shared content workflow

The canonical files are:

- `docs/legal/privacy-policy.md`
- `docs/legal/terms-of-use.md`
- `docs/faq.md`

From the repository root, synchronize both consumers with:

```bash
node scripts/sync-shared-content.mjs
```

Use `node scripts/sync-shared-content.mjs --check` in CI to fail when generated content is stale. Do not edit either generated `shared-documents.json` file directly.

Synchronization is mandatory before builds. `www` runs it through `prebuild`; `app` runs it through its Expo `prebuild` command and the EAS `eas-build-pre-install` hook. App start, native run, web, lint, and tests also synchronize or check content as appropriate.
