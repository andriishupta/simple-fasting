# Simple Fasting

Privacy-first, offline-first fasting tracker with no account, backend, ads, subscription, analytics SDK, or installation identifier.

V1 uses only local app diagnostics that the user explicitly shares and native platform crash reporting available through Apple App Store Connect and Google Play Console. The app does not send fasting history, dates, durations, goals, notes, reminder schedules, export contents, contact details, advertising identifiers, or precise location to an analytics backend.

- `app/` — Expo React Native application for iOS and Android.
- `www/` — static Astro website.
- `docs/dev/how-to.md` — developer onboarding and repository manual.
- `docs/dev/plan/` — product specification, execution plan, release guide, and roadmap.
- `docs/content/legal/`, `docs/content/faq.md`, and `docs/content/whats-new.md` — versioned shared content for the app and website.

Current development is focused on the mobile application. Start with [`app/README.md`](app/README.md) for setup and commands, and [`docs/dev/plan/01-product-specification.md`](docs/dev/plan/01-product-specification.md) for product behavior.

Edit legal, FAQ, and What's New copy only in `docs/content`, then run `node scripts/sync-shared-content.mjs` when you need local generated JSON. Generated `shared-documents.json` files are ignored; source Markdown is the committed source of truth.

## Shared content workflow

The canonical files are:

- `docs/content/legal/privacy-policy.md`
- `docs/content/legal/terms-of-use.md`
- `docs/content/faq.md`
- `docs/content/whats-new.md`

From the repository root, synchronize both consumers with:

```bash
node scripts/sync-shared-content.mjs
```

Use `node scripts/sync-shared-content.mjs --check` after synchronization to fail when generated content is stale. Do not edit either generated `shared-documents.json` file directly.

Synchronization is mandatory before builds. `www` runs it through `prebuild`; CI also runs `content:sync` and `content:check` before the website build, then verifies rendered output in `postbuild`. `app` runs synchronization through its Expo `prebuild` command and the EAS `eas-build-pre-install` hook. App start, native run, web, lint, and tests also synchronize local generated files as appropriate.

## Automated verification

GitHub Actions runs on pull requests and pushes to `main`:

- parallel app TypeScript, lint, unit tests, integration tests, and Jest coverage;
- a shared-content integration job that regenerates ignored JSON, checks it before build, builds Astro, and runs the post-build verifier;
- independent Expo bundle exports for iOS and Android.

Native Maestro flows live in `app/.maestro`. The validated EAS workflow in `app/.eas/workflows/e2e.yml` builds credential-free simulator/APK binaries and runs the same fasting, history, goals, settings, legal, and cancellation flows on both iOS and Android for app-related pull requests.
