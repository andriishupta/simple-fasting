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

## Automated verification

GitHub Actions runs on pull requests and pushes to `main`:

- app TypeScript, lint, Jest coverage, and shared-content drift checks;
- the Astro production build plus a static verifier that compares all rendered legal/FAQ content with the generated source and checks internal routes;
- independent Expo bundle exports for iOS and Android.

Native Maestro flows live in `app/.maestro`. The validated EAS workflow in `app/.eas/workflows/e2e.yml` builds credential-free simulator/APK binaries and runs the same fasting, history, goals, settings, legal, and cancellation flows on both iOS and Android for app-related pull requests.
