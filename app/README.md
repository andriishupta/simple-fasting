# Simple Fasting App

Expo React Native application for a private, offline fasting tracker. It runs
on iOS and Android, stores user data locally in MMKV, and requires no account or
backend.

See [`../docs/dev/PRODUCT.md`](../docs/dev/PRODUCT.md) for the complete current
behavior and [`../docs/dev/RELEASE.md`](../docs/dev/RELEASE.md) for store-build
steps.

## Current product

The main tabs are:

1. **Data** — local statistics and editable fasting history.
2. **Fast** — planned, custom, or open-ended fasts with optional notes.
3. **Settings** — appearance, goals, local reminders, import/export, support,
   and legal documents.

The app includes:

- elapsed/remaining active-fast timer and planned-goal progress;
- standard and reusable custom goals;
- local fast-end and daily reminders;
- history editing, single deletion, and confirmed bulk deletion;
- JSON and CSV import/export;
- small iOS and Android home-screen widgets;
- optional iOS Live Activity/Dynamic Island support;
- offline FAQ, Privacy Policy, Terms, and What's New;
- privacy-filtered local diagnostics shared only after explicit user action.

History is the source of truth for statistics. Charts, accounts, cloud sync,
backend services, payments, analytics, advertising, and health-platform
integrations are not part of the product.

## Technology

- Expo SDK 56
- React Native 0.85 and React 19
- TypeScript
- Expo Router native tabs and stack
- MMKV
- Expo Notifications, File System, Sharing, UI, and Widgets
- React Native Android Widget
- React Native Reanimated and Gesture Handler

The app is not Expo Go-only. MMKV, native widgets, notifications, and iOS Live
Activities require a native development or release build.

## Structure

```text
src/
├── app/            Expo Router routes
│   ├── (tabs)/     Data, Fast, and Settings
│   ├── goals/      Goal management
│   ├── history/    Completed-fast editing
│   └── onboarding/ First-run legal and notification flow
├── components/     Shared UI
├── constants/      Theme and layout tokens
├── content/        Shared-document loader and ignored generated JSON
├── hooks/          Theme hooks
├── locales/        English runtime strings
├── storage/        MMKV, validation, notifications, diagnostics, import/export
├── utils/          Duration, goal, and statistics helpers
└── widgets/        Shared model and platform widget/Live Activity renderers
```

## Development

Run commands from `app/`.

```bash
pnpm install
pnpm start
```

Native development builds:

```bash
pnpm ios
pnpm android
```

Local Release build and install on a connected physical device:

```bash
./release.sh ios
./release.sh android
```

`release.sh` uses the existing native folders and does not run Expo prebuild.
Run `pnpm prebuild` only after intentional native configuration, plugin, or
dependency changes.

## Shared documents

Privacy, Terms, FAQ, and What's New are authored in `../docs/content`.

```bash
pnpm content:sync
pnpm content:check
```

Do not edit or commit `src/content/generated/shared-documents.json`.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm test:coverage
pnpm exec expo export --platform ios --output-dir /tmp/simple-fasting-ios
pnpm exec expo export --platform android --output-dir /tmp/simple-fasting-android
```

Tests are intentionally split by responsibility:

- unit/component tests for calculations, validation, UI semantics, and widget
  view models;
- storage integration tests for fasting, notifications, settings, diagnostics,
  import, and export;
- platform-neutral Maestro flows for the main iOS and Android user journeys.

Generated coverage belongs in `coverage/` and is not committed. Static exports
verify bundling but do not replace device testing for notifications, MMKV,
widgets, Live Activities, gestures, or store signing.

## Release

The app is already linked to its Expo/EAS project. Production store builds use:

```bash
eas build --platform all --profile production
```

Follow [`../docs/dev/RELEASE.md`](../docs/dev/RELEASE.md) for signing, TestFlight,
Google Play Internal Testing, and the final physical-device check.
