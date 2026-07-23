# App Agent Guide

Read the root `AGENTS.md` and `docs/dev/PRODUCT.md` before changing `app/`.
This file contains only app-specific additions.

## Stack and boundaries

- Expo, React Native, Expo Router, TypeScript, and MMKV.
- iOS and Android are equal targets.
- Native widgets, iOS Live Activities, local notifications, MMKV, and gestures
  require native builds; Expo Go is not a complete test environment.
- No accounts, backend, sync, analytics, advertising, push server, subscription,
  or remote fasting-data collection.

Prefer Expo APIs, existing dependencies, and direct local code in that order.
Avoid new native code or config plugins unless the platform feature requires
them.

## Structure

- `src/app/` — routes and route-level behavior.
- `src/components/` — genuinely shared UI.
- `src/storage/` — typed MMKV state, validation, import/export, notifications.
- `src/utils/` — reusable pure calculations and formatting.
- `src/widgets/` — shared widget model and platform renderers.

Do not introduce repository, service, selector, DTO, or feature-folder layers
without a concrete boundary that makes the current code simpler.

Use React state, context, small hooks, and immutable updates. Keep storage
versioned and validated. Optional notification/widget failures must never block
or roll back a successful local fasting-data write.

## UI

- Reuse existing theme, spacing, radius, surface, button, shell, and text
  components.
- Prefer native tabs, stack navigation, switches, segmented controls, pickers,
  alerts, share sheets, safe areas, and gestures.
- Keep the product calm, compact, accessible, and consistent across Fast, Data,
  Settings, onboarding, stack screens, and widgets.
- Avoid redundant labels, visual clutter, excessive animation, and idle
  scrolling when a normal phone viewport fits.
- Check light/dark, empty, active, error, expanded, and keyboard states where
  relevant.

## Storage, notifications, and widgets

- MMKV is the source of truth for settings, active fast, history, and local
  diagnostics.
- History is the source of truth for statistics.
- Notification permission comes from the operating system, not a persisted
  enabled flag.
- Notifications are local only.
- Changes to active fast, goals, history, or display settings must consider
  widget and Live Activity refresh behavior.
- After native plugin, capability, bundle ID, App Group, notification, or widget
  changes, regenerate and reinstall a fresh native build.

## Shared documents

Privacy, Terms, FAQ, and What's New are authored in `../docs/content`.

```bash
pnpm content:sync
pnpm content:check
```

Never edit or commit generated `src/content/generated/shared-documents.json`.
Keep content synchronization in Expo `prebuild` and EAS
`eas-build-pre-install`.

## Verification

Run from `app/`:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm test:coverage
pnpm exec expo export --platform ios --output-dir /tmp/simple-fasting-ios
pnpm exec expo export --platform android --output-dir /tmp/simple-fasting-android
```

Use the narrowest relevant unit or integration test while developing. Keep
Maestro flows platform-neutral and accessibility-label based. Verify native
notifications and widgets in fresh native builds before release.

Release steps and identifiers live in `../docs/dev/RELEASE.md`. Excluded future
scope lives in `../docs/dev/FUTURE.md`.
