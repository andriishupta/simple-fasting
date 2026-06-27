# Simple Fasting Developer How-To

This document is the practical starting point for a new developer joining the Simple Fasting repository. It explains how the repository is organized, how the mobile app works, how the Astro website works, which commands to run, what CI checks, and where to make common changes.

For product intent and scope decisions, also read:

- `AGENTS.md`
- `docs/dev/plan/01-product-specification.md`
- `docs/dev/plan/02-execution-plan.md`
- `docs/dev/plan/03-release-deployment-guide.md`
- `docs/dev/plan/04-future-roadmap.md`

## Repository Shape

There is no root `package.json`. The repository is split into two package directories plus shared docs and scripts:

```text
/
├── app/       # Expo React Native mobile application
├── www/       # Astro static website
├── docs/
│   ├── content/ # Shared legal docs and FAQ
│   └── dev/     # Developer manual, plans, and release documentation
├── scripts/   # Shared content sync and website verification scripts
└── .github/   # GitHub CI workflows
```

Run package commands from the package directory:

```bash
cd app
pnpm install
pnpm start
```

```bash
cd www
pnpm install
pnpm dev
```

## Shared Content Model

Legal documents and FAQ are authored once in `docs`:

```text
docs/content/legal/privacy-policy.md
docs/content/legal/terms-of-use.md
docs/content/faq.md
```

Generated copies are ignored but must exist locally for app and website builds:

```text
app/src/content/generated/shared-documents.json
www/src/content/generated/shared-documents.json
```

Never edit generated JSON directly. Edit Markdown in `docs`, then run:

```bash
node scripts/sync-shared-content.mjs
```

Both packages also wire this into lifecycle scripts:

- `app`: `prebuild`, `prestart`, `preios`, `preandroid`, `preweb`, `lint`, `test`, `eas-build-pre-install`
- `www`: `predev`, `prebuild`, `prepreview`, `test`

Use this direct check after synchronization when debugging content drift:

```bash
node scripts/sync-shared-content.mjs --check
```

## Mobile App Overview

The mobile app lives in `app/`.

Stack:

- Expo SDK 56
- React Native 0.85
- React 19
- TypeScript
- Expo Router
- MMKV local storage
- Expo Notifications
- Expo Widgets on iOS
- `react-native-android-widget` on Android
- Reanimated and Gesture Handler
- Jest / React Native Testing Library

The app is privacy-first and offline-first:

- no account
- no backend
- no analytics SDK
- no installation identifier
- no advertising identifiers
- no push notification server
- local storage only

### App Folder Structure

```text
app/
├── app.json                         # Expo config and plugins
├── eas.json                         # EAS build profiles
├── package.json                     # app scripts and dependencies
├── plugins/                         # Expo config plugins
├── src/
│   ├── app/                         # Expo Router routes
│   │   ├── _layout.tsx              # root startup, theme, onboarding, stack
│   │   ├── (tabs)/                  # main tab routes
│   │   │   ├── _layout.tsx          # native tabs
│   │   │   ├── index.tsx            # Fast route
│   │   │   ├── history.tsx          # Data route
│   │   │   └── settings.tsx         # Settings route
│   │   ├── history/[id].tsx         # edit one fast
│   │   ├── goals.tsx                # manage goals
│   │   ├── goals/new.tsx            # create goal
│   │   ├── goals/[id].tsx           # edit goal
│   │   ├── faq.tsx                  # local FAQ document
│   │   ├── privacy.tsx              # local Privacy document
│   │   └── terms.tsx                # local Terms document
│   ├── components/                  # shared UI and screen pieces
│   ├── constants/                   # theme, spacing, radii
│   ├── content/                     # generated shared Markdown payload
│   ├── hooks/                       # theme hooks
│   ├── storage/                     # MMKV models and app state operations
│   ├── utils/                       # pure calculations and formatting
│   └── widgets/                     # iOS and Android widget implementations
└── test/                            # test fixtures and mocks
```

### Runtime Flow

The app starts in `src/app/_layout.tsx`.

Startup does the following:

1. Initializes local storage.
2. Repairs or supplies defaults where needed.
3. Refreshes settings and active fast snapshots.
4. Hides the native splash as soon as startup is ready or has failed.
5. Shows onboarding if needed.
6. Otherwise renders the main native stack and tab shell.

First-run onboarding has two steps:

1. Welcome/legal agreement screen. The user must check agreement to Terms and Privacy before continuing.
2. Notification explanation screen. The user can allow notifications or skip.

Onboarding state is stored in settings:

- `legalConsentAccepted`
- `onboardingCompleted`
- `notificationPromptShown`

Notification permission itself is not stored. It is derived from the operating system because users can change permissions outside the app.

## Main App Routes

### Fast Route

File:

```text
app/src/app/(tabs)/index.tsx
```

This is the main fasting experience.

Ready state includes:

- saved goal selector
- `This Time` custom duration
- open-ended fast
- optional note
- Start fast action
- recent “Fast saved” notice

Active state includes:

- elapsed/remaining timer
- linear progress
- goal name and duration
- started/end timestamps
- fast-end reminder toggle
- optional note
- cancel/end actions

Important implementation details:

- Active timer is derived from `startedAt` plus current device time.
- The active counter uses Reanimated timing rather than a JS `setInterval`.
- Timer view preference is persisted as elapsed or remaining.
- Widgets are refreshed when active fast state changes.

### Data Route

File:

```text
app/src/app/(tabs)/history.tsx
```

This route contains three segments:

- Stats
- Charts
- History

Stats and charts are derived from history, not stored separately as canonical data.

History rows support:

- tap to edit
- swipe to delete
- bulk select/delete
- goal progress
- started/ended timestamps

Chart data uses a lightweight cache keyed by history update time, latest session, local day, and locale. The Charts panel is lazy-mounted and kept alive after first open to avoid unnecessary tab-switch rebuilds.

### Settings Route

File:

```text
app/src/app/(tabs)/settings.tsx
```

Settings owns:

- theme preference
- accent color
- goal duration display format
- goals navigation
- notification controls
- import/export/clear data
- website/support/FAQ/legal links
- local diagnostics sharing

Notification controls should always read OS permission state, not trust a persisted `notificationsEnabled` flag.

### Goals

Files:

```text
app/src/app/goals.tsx
app/src/components/goal-editor-screen.tsx
```

Goals can be:

- standard or custom
- enabled or disabled
- reordered
- edited only if custom
- deleted only if custom

At least one enabled goal must remain.

New goals are appended to the bottom. Reorder operations are clamped and invalid moves silently no-op to avoid corrupting settings.

The drag behavior is encapsulated in:

```text
app/src/components/draggable-list-row.tsx
```

Reuse this component for future reorderable lists.

## Storage Model

Storage is local MMKV. Core types live in:

```text
app/src/storage/app-storage.ts
```

Main storage keys:

- `metadata`
- `settings`
- `activeFast`
- `history`
- `diagnostics`

Storage repair/validation lives in:

```text
app/src/storage/storage-validation.ts
app/src/storage/storage-migrations.ts
```

Current project status is pre-public V1. Breaking local schema changes are acceptable when explicitly approved. Do not add complex migrations for abandoned development-only shapes unless needed.

### Settings

Settings include:

- theme
- accent color
- goal duration format
- goals
- last used duration
- data view preference
- legal/onboarding flags
- notification preferences

### Active Fast

Active fast stores the current session and reminder metadata. It is the source of truth for:

- running timer
- active goal duration
- active note
- local reminder state
- widget state

### History

History stores completed sessions. Statistics, charts, and history cards derive from it.

Import behavior:

- accepts JSON or CSV exports
- skips duplicate or overlapping sessions
- reports saved and skipped counts
- does not overwrite existing local history

## Widgets

Files:

```text
app/src/widgets/fasting-widget-model.ts
app/src/widgets/fasting-widget.ios.tsx
app/src/widgets/fasting-widget.android.tsx
app/src/widgets/fasting-widget.tsx
app/src/widgets/fasting-live-activity.ios.tsx
app/src/widgets/fasting-live-activity.tsx
```

Widget model code is shared and tested. Platform files render native widgets and the optional iOS Live Activity.

iOS uses:

- `expo-widgets`
- SwiftUI-style widget and Live Activity views through Expo UI

Android uses:

- `react-native-android-widget`

Widget rules:

- no large structural divergence from the app timer model
- inactive widget opens the app
- active widget shows app identity, goal, elapsed/remaining timer, and progress
- no started/ended timestamps because small widgets have limited space
- widget and Live Activity updates must never block local fasting writes

Widgets and Live Activities require native builds. Expo Go cannot verify them.

After widget, plugin, bundle identifier, or app-group changes:

```bash
cd app
pnpm prebuild
pnpm ios
pnpm android
```

If widget registration seems stale, uninstall the app from the simulator/emulator and reinstall a fresh native build.

## Notifications

Files:

```text
app/src/storage/notification-storage.ts
app/src/storage/settings-storage.ts
app/src/app/_layout.tsx
app/src/app/(tabs)/settings.tsx
```

Notifications are local only.

Supported:

- fast-end reminder
- optional daily reminder
- startup reconciliation
- foreground permission refresh
- native settings link when permission is denied

Do not add push notifications or backend scheduling unless explicitly requested.

## Diagnostics

Files:

```text
app/src/storage/diagnostic-storage.ts
app/src/components/app-error-boundary.tsx
```

Diagnostics are local and privacy-filtered. They are shared only when the user chooses bug reporting with diagnostics.

Do not include:

- fasting history
- notes
- goals
- user identifiers
- device identifiers
- paths, URLs, or emails without redaction

## UI Principles

The app should feel:

- native
- calm
- fast
- minimal
- accessible

Prefer:

- shared components
- Expo-compatible native controls
- safe-area-aware shells
- platform gestures
- dynamic text support
- large enough touch targets

Avoid:

- custom UI that fights platform behavior
- unnecessary screens
- tiny hit targets
- disabling font scaling
- visual clutter

Shared UI components include:

```text
app/src/components/app-button.tsx
app/src/components/app-surface.tsx
app/src/components/centered-wheel-picker.tsx
app/src/components/draggable-list-row.tsx
app/src/components/fast-setup-controls.tsx
app/src/components/tab-screen-shell.tsx
app/src/components/themed-text.tsx
```

Use `ThemedText` for app text so theme and typography stay consistent. Do not disable dynamic type unless there is a platform-specific reason and a fallback.

## App Commands

Run from `app/`.

Install:

```bash
pnpm install
```

Start Metro:

```bash
pnpm start
```

Run native builds:

```bash
pnpm ios
pnpm android
```

Run web preview of the app:

```bash
pnpm web
```

Typecheck:

```bash
pnpm exec tsc --noEmit
```

Lint:

```bash
pnpm lint
```

Tests:

```bash
pnpm test
pnpm test:coverage
```

Bundle export checks:

```bash
pnpm exec expo export --platform ios --output-dir /tmp/simple-fasting-ios
pnpm exec expo export --platform android --output-dir /tmp/simple-fasting-android
```

Native project generation:

```bash
pnpm prebuild
```

Content sync:

```bash
pnpm content:sync
pnpm content:check
```

## App Testing Strategy

Jest is configured in `app/package.json`.

Current test types:

- pure utility tests
- storage integration tests
- notification scheduling/reconciliation tests
- import/export tests
- storage validation tests
- widget model tests
- React Native Testing Library component tests

Coverage focuses on:

```text
src/storage/**/*.ts
src/utils/**/*.ts
src/widgets/fasting-widget-model.ts
```

Coverage thresholds:

- branches: 70%
- functions: 80%
- lines: 85%
- statements: 85%

Typical change-to-test mapping:

| Change | Test area |
| --- | --- |
| Timer math | `src/utils/fasting-duration.test.ts` |
| Stats/charts | `src/utils/fasting-analytics.test.ts`, `fasting-statistics.test.ts` |
| Start/end/cancel/edit | `src/storage/fasting-storage.test.ts` |
| Settings/goals | `src/storage/settings-storage.test.ts` |
| Import/export | `src/storage/data-import.test.ts`, settings export tests |
| Notifications | `src/storage/notification-storage.test.ts`, settings storage tests |
| Widget model | `src/widgets/fasting-widget-model.test.ts` |
| Local docs UI | `src/components/local-document-screen.test.tsx` |
| Shared UI components | colocated component tests |

Before handing off app changes, run:

```bash
cd app
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

## CI/CD

GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

CI runs on pull requests and pushes to `main`.

Jobs:

### App quality, tests, and coverage

From `app/`:

```bash
pnpm install --frozen-lockfile
pnpm content:sync
pnpm exec tsc --noEmit
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm test:coverage
```

Coverage is uploaded as an artifact but should not be committed.

### Shared content integration

From `www/`:

```bash
pnpm install --frozen-lockfile
pnpm test
```

This regenerates ignored shared content, checks it before build, builds Astro, then runs post-build route/content verification.

### Platform bundle

From `app/`:

```bash
pnpm exec expo export --platform ios --output-dir /tmp/simple-fasting-ios
pnpm exec expo export --platform android --output-dir /tmp/simple-fasting-android
```

These are bundle gates, not full simulator tests.

### EAS

EAS config lives in:

```text
app/eas.json
```

Profiles:

- `development`
- `preview`
- `production`
- `e2e-test`

Use EAS/native builds when validating:

- widgets
- native notifications
- MMKV native behavior
- gestures
- platform-specific UI

## Website Overview

The website lives in `www/`.

Stack:

- Astro
- plain CSS
- no client-side application framework
- no analytics

Routes:

- `/`
- `/faq`
- `/privacy`
- `/terms`
- `/legal`

Files:

```text
www/src/pages/
www/src/components/DocumentPage.astro
www/src/layouts/Layout.astro
www/src/styles/global.css
www/src/content/generated/shared-documents.json
```

The website renders shared FAQ/legal content from generated JSON. The source remains `docs/content`.

## Website Commands

Run from `www/`.

Install:

```bash
pnpm install
```

Develop:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Preview:

```bash
pnpm preview
```

Test:

```bash
pnpm test
```

`pnpm test` regenerates and checks shared content before the production build. The build then runs post-build route/content verification through:

```text
scripts/verify-www-build.mjs
```

The verifier checks:

- expected routes exist
- generated legal/FAQ content matches rendered pages
- homepage FAQ headings exist
- internal links are not broken

## Common Development Tasks

### Change legal or FAQ text

1. Edit Markdown in `docs/content/legal` or `docs/content/faq.md`.
2. Run `node scripts/sync-shared-content.mjs`.
3. Run `node scripts/sync-shared-content.mjs --check`.
4. Run app and website checks if the change is meaningful.

### Change app behavior

1. Read the relevant route/component/storage file.
2. Prefer small local changes.
3. Update or add tests for storage/logic changes.
4. Run app typecheck, lint, and tests.
5. Update docs if behavior changed.

### Change storage shape

Before public V1 release, breaking local storage changes are allowed when explicitly approved. Still keep the shape typed and validation-aware.

Update:

- `app-storage.ts`
- `storage-validation.ts`
- relevant storage tests
- docs if user-facing behavior changed

### Change widgets

Update the shared model first when possible:

```text
app/src/widgets/fasting-widget-model.ts
```

Then update platform renderers:

```text
app/src/widgets/fasting-widget.ios.tsx
app/src/widgets/fasting-widget.android.tsx
app/src/widgets/fasting-live-activity.ios.tsx
```

Run tests, then verify in a native build.

### Change notifications

Keep permission source of truth in the OS. Do not store `notificationsEnabled`.

Update:

- notification storage
- settings storage
- settings UI
- startup reconciliation if needed
- tests

### Change UI patterns

Look for existing components first:

- `AppButton`
- `AppSurface`
- `TabScreenShell`
- `CenteredWheelPicker`
- `DraggableListRow`
- `FastGoalSelector`
- `FastNoteEditor`

Use existing spacing tokens:

```text
Spacing.half
Spacing.one
Spacing.two
Spacing.three
Spacing.four
Spacing.five
Spacing.six
```

Use existing radii:

```text
Radius.control
Radius.surface
Radius.pill
```

## Debugging Checklist

If the app does not behave as expected:

1. Regenerate and confirm shared content is current:

   ```bash
   cd app
   pnpm content:sync
   pnpm content:check
   ```

2. Typecheck:

   ```bash
   pnpm exec tsc --noEmit
   ```

3. Run focused tests:

   ```bash
   pnpm test -- settings-storage
   pnpm test -- fasting-storage
   pnpm test -- fasting-widget-model
   ```

4. For widgets, rebuild and reinstall the native app. Expo Go is not enough.
5. For notifications, check OS app notification permission.
6. For storage issues, inspect validation/default logic before adding migrations.
7. For UI lag, check repeated expensive render work, chart remounting, synchronous storage writes in interaction handlers, and unnecessary animations.

## Review Checklist Before Handoff

For app changes:

```bash
cd app
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

For website/shared content changes:

```bash
cd www
pnpm test
```

From repo root:

```bash
git diff --check
```

Also confirm:

- no secrets or credentials were added
- generated shared content was not edited manually
- docs match actual behavior
- widgets were considered for active fast/history/settings changes
- notification permission behavior still derives from the OS
- UI remains usable with larger text settings
