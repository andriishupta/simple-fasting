# Simple Fasting

Privacy-first, offline-first fasting tracker for iOS and Android.

- No account, login, or cloud backend.
- No ads, subscriptions, analytics SDK, installation identifier, or tracking.
- Fasting history, goals, reminders, statistics, and settings stay on the
  device.
- JSON and CSV import/export remain under the user's control.
- Native Apple and Google crash/vitals reports may be available through their
  platforms; local diagnostics are shared only after explicit user action.

## Repository

```text
app/          Expo React Native application
www/          Static Astro website deployed to Cloudflare Pages
docs/content/ Canonical Privacy, Terms, FAQ, and What's New Markdown
docs/dev/     Product, release, and future-scope documentation
scripts/      Shared-content and website verification scripts
```

Read:

- [`docs/dev/PRODUCT.md`](docs/dev/PRODUCT.md) — current product behavior.
- [`docs/dev/RELEASE.md`](docs/dev/RELEASE.md) — short TestFlight and Google
  Internal Testing checklist.
- [`docs/dev/FUTURE.md`](docs/dev/FUTURE.md) — intentionally excluded scope.
- [`app/README.md`](app/README.md) and [`www/README.md`](www/README.md) —
  package commands.

## Shared content

Edit only the Markdown under `docs/content`, then run from the repository root:

```bash
node scripts/sync-shared-content.mjs
node scripts/sync-shared-content.mjs --check
```

Generated `shared-documents.json` files are ignored and must not be committed.
App and website lifecycle scripts synchronize them automatically before builds.

## Verification

```bash
cd app
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm test:coverage
```

```bash
cd www
pnpm test
```

CI also exports iOS and Android JavaScript bundles. Native notifications,
widgets, Live Activities, signing, TestFlight, and Google Play builds require
native or EAS verification.

## License

This project is licensed under the [Apache License 2.0](LICENSE). It is open
source and permits reuse, modification, and redistribution under its terms;
copyright and license notices must be preserved.
