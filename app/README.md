# Simple Fasting App

Expo React Native application for a private, offline-first fasting tracker. The app runs on iOS and Android, stores all user data locally in MMKV, and does not require an account or backend.

The code in this directory is the source of truth for current application behavior. Product intent, remaining work, release steps, and future ideas are documented in `../docs/plan`.

## Product Flow

1. Open the app.
2. Choose a standard, custom, or open-ended fasting goal.
3. Optionally add a note.
4. Start the fast.
5. Follow progress in the app or small home-screen widget.
6. End the fast and optionally edit its details.
7. Review statistics, charts, and history in Data.

Everything in this flow works locally. Internet is only needed for optional external website/help links.

## Navigation and Screens

The app uses native Expo Router tabs in this order:

### Data

Data has a native segmented control:

- **Stats** — a neutral two-column metric grid for streaks, longest/average fast, completion, goal achievement, total hours, and total fasts.
- **Charts** — recent-duration and monthly-hours charts, goal completion, duration distribution, and weekly/monthly/yearly heatmaps.
- **History** — completed sessions only; its segment label includes the completed count (capped at `99+`). Rows use labeled duration/start/end information, goal pills, tap-to-edit, and a native-feeling left swipe that reveals Delete on iOS and Android.

Tapping a history entry pushes **Edit Fast**, a native stack screen for dates, duration/goal, and note editing.

### Fast

The ready state includes:

- standard presets `12:12`, `14:10`, `16:8`, `18:6`, and `20:4`;
- This time, for a one-off custom duration, with a shortcut explaining that reusable goals live in Settings;
- Open-ended fast;
- optional Note;
- Start fast fixed above the native tab bar.

A fresh install starts on `16:8`. Every goal selection is persisted immediately and restored later. There is no separate default-goal property.

The selected goal is presented directly as its name and duration without a redundant section label. **This time** expands an inline native Days/Hours wheel editor and is capped at seven days. Selecting another goal closes the editor. The normal idle and active states keep the same viewport and fixed native tab-bar footprint; responsive growth is reserved for expanded controls and small screens.

The active state shows a compact progress timer, start/end times, local reminder, optional note, a ghost-style Cancel fast action, and accent-colored End fast. Ending saves immediately and returns to the ready state with a **Fast saved** card below Start fast; its top-right countdown dismisses the card after five seconds and **View fast** opens the saved entry.

### Settings

- **Appearance** — System/Light/Dark and settled-scroll accent selection.
- **Goals** — opens Goals.
- **Notifications** — fast-end reminder and daily reminder with a minimal Hours/Minutes wheel that follows the active theme without a nested card or redundant label.
- **Data** — non-destructive JSON/CSV import, JSON export, CSV export, and Clear data.
- **About** — website, FAQ, bug reporting with an optional privacy-filtered local diagnostic file, support email, and build version.
- **Legal** — external and offline Privacy Policy and Terms.

### Supporting Stack Screens

- **Goals** — app-wide goal time display format, standard and custom goals that can be enabled/disabled and reordered with a persisted drag handle, and custom goal edit/swipe-to-delete. A floating plus opens the add-goal editor. At least one goal remains enabled.
- **Edit Fast** — reuses the Fast screen’s active goal selector, Custom/Open-ended actions, and Note control; Start and End use theme-aware native date/time controls. End time is required. Save and Delete are the only bottom actions.
- **FAQ** — offline local help.
- **Privacy Policy** — offline local copy.
- **Terms of Use** — offline local copy.

These are standard native stack pushes with system headers and back buttons. This-time duration remains inline on Fast rather than creating another navigation layer.

## Widgets

Small home-screen widgets are implemented on both platforms.

- Inactive: “Ready to fast?” and an action to open the app.
- Active: app identity, goal name/formatted duration, one elapsed-or-remaining timer, and planned-goal progress.
- Tap: opens `simple-fasting://`.
- Refresh: requested whenever active fasting state changes.

iOS uses `expo-widgets`; Android uses `react-native-android-widget`. Medium/large widgets, lock-screen widgets, Live Activities, Dynamic Island, and Android ongoing notifications are not implemented.
The local `with-widget-version` config plugin keeps the generated iOS extension version aligned with the containing app, working around the widget generator's fixed Xcode marketing version.

### Widget installation checks

Widgets are native extensions/providers and are not available from Expo Go or a JavaScript-only update. After changing widget code, plugins, bundle identifiers, or app groups, regenerate and reinstall a development/EAS build, launch the app once, then use the system widget picker. On Android, use a launcher/emulator image that supports home-screen widgets. If an old binary was installed before widget plugins were configured, uninstall it before installing the rebuilt binary.

The fallback `src/widgets/fasting-widget.tsx` must keep the same `.tsx` extension as the `.ios.tsx` and `.android.tsx` implementations. A `.ts` fallback takes precedence during Metro resolution and silently prevents the native widget layout/task handler from registering.

`expo config --type prebuild` should show the iOS `ExpoWidgetsTarget`, `app.simplefasting.ExpoWidgetsTarget`, and `group.app.simplefasting`. A generated Android prebuild should contain the `FastingWidget` receiver and `widgetprovider_fastingwidget.xml`.

## Notifications

Notifications are local only through `expo-notifications`.

On first launch, onboarding starts with a welcome screen that explains the privacy-first, offline-first app behavior and requires explicit agreement to the Terms of Use and Privacy Policy. It then shows the reminder screen with **Allow Notifications** or **Not Now**. Granting notification permission enables fast-end reminders while daily reminders remain opt-in. Skipping or denying notifications keeps reminders off and shows an **Enable Notifications** action in Settings.

- fast-end notification for a planned fast;
- optional daily reminder;
- permission handling derived from the operating system on app launch, foreground, and Settings open;
- cancellation and startup reconciliation.

There is no push-notification server.

## Local Data

MMKV stores:

- `metadata`;
- `settings` — preferences, goal duration display format, goals, reminder preferences, `legalConsentAccepted`, `onboardingCompleted`, and `notificationPromptShown`;
- `activeFast`;
- `history`.
- `diagnostics` — at most 50 recent privacy-filtered local app errors.

The app does not store a `notificationsEnabled` value. Notification availability is always derived from `expo-notifications` permission state because users can change it in iOS or Android settings outside the app.

History is the source of truth for statistics and charts, which are derived in memory rather than persisted in a separate cache. Users can import JSON or CSV exports without overwriting existing or time-overlapping sessions; the result reports saved and skipped counts. Users can also export through the native share sheet, bulk-delete selected history entries, and clear all local data with confirmation.

The active timer derives elapsed time from the saved `startedAt` timestamp and the device clock. The Fast screen avoids JS interval ticks for the active counter/progress ring and resynchronizes on foreground; widgets use their platform timer APIs where available.

Core fasting writes complete before optional notification cleanup or rescheduling. If the platform notification service fails, local fasting state remains usable and startup does not enter a blocking recovery screen.

Storage initialization, reminder restoration, and render errors can be recorded locally. The optional diagnostic JSON excludes fasting history, notes, goals, settings, and device identifiers, redacts common email/URL/path text, and leaves the app only when the user chooses the diagnostic option in **Report bug** and selects a share destination. Clear data clears these local diagnostics.

## Startup and onboarding

Startup prioritizes reaching the timer quickly. Native splash is hidden as soon as synchronous local storage initialization succeeds or fails. The app does not run an additional branded splash animation; it shows either onboarding or the home tabs immediately after startup is ready.

The onboarding state stores `legalConsentAccepted`, `onboardingCompleted`, and `notificationPromptShown` in MMKV. The notification permission itself is never stored.

## Reporting and diagnostics

The app has no analytics SDK, event tracking, telemetry backend, installation UUID, advertising identifier usage, or anonymous profile. V1 relies on Apple App Store Connect and Google Play Console Android Vitals for native platform crash and release-health reporting where the user, platform, and store settings allow it.

Local diagnostics are stored only on-device and leave the app only when the user chooses **Report bug → Share diagnostics** and selects a destination from the native share sheet. Do not add PostHog, Sentry, or another reporting SDK in V1 without an explicit product/privacy decision and updated legal documentation.

Until the project is explicitly declared production/public, app work is V1 pre-release work. Breaking local schema changes and local data resets are acceptable when approved and useful for correctness or simplicity. Think about future migrations, but do not build migration or compatibility layers now unless explicitly requested.

## Technical Stack

- Expo SDK 56
- React Native 0.85
- React 19
- TypeScript
- Expo Router native tabs and stack
- MMKV
- Expo Notifications, File System, Sharing, and Widgets
- Expo UI native controls
- Lucide React Native icons
- React Native Reanimated and Gesture Handler

## Project Structure

```text
src/
├── app/                 # Expo Router routes
│   ├── (tabs)/          # Data, Fast, Settings
│   ├── history/[id].tsx # Edit Fast
│   ├── goals.tsx
│   ├── faq.tsx
│   ├── privacy.tsx
│   └── terms.tsx
├── components/          # Shared surfaces, buttons, text, feedback, charts
├── constants/           # Theme and layout tokens
├── hooks/               # Theme hooks
├── storage/             # MMKV models, validation, notifications, exports
├── utils/               # Derived statistics helpers and tests
└── widgets/             # Platform widget implementations
```

## Development

Install dependencies:

```bash
pnpm install
```

Start Metro:

```bash
pnpm start
```

The complete app uses native dependencies and widgets, so use a development build for full native verification. Expo Go is not sufficient for every feature.
After changing `app.json` plugins or native dependencies, regenerate the native project before building so the widget extension and app-group entitlements are current.

Common commands:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm test:coverage
pnpm exec expo export --platform web --output-dir /tmp/simple-fasting-web
pnpm exec expo export --platform ios --output-dir /tmp/simple-fasting-ios
pnpm exec expo export --platform android --output-dir /tmp/simple-fasting-android
```

Static exports verify bundling but do not replace simulator/device testing for notifications, MMKV, gestures, and widgets.

## Testing and CI

- Jest unit tests cover calculations, statistics/charts, goal selection, reminders, validation, exports, and widget view models.
- Storage integration tests exercise start/end/cancel/edit/delete/reconcile flows against the MMKV adapter and verify notification/widget coordination.
- React Native Testing Library checks shared-document rendering and interaction semantics.
- Maestro flows in `.maestro` cover the primary user paths. `.eas/workflows/e2e.yml` runs them against both iOS simulator and Android APK builds.
- `.github/workflows/ci.yml` runs deterministic checks and both platform bundle gates; EAS owns native emulator E2E.

Coverage output is generated under `coverage/` and is not committed. Appium is intentionally not part of the current stack.

## Shared legal and FAQ content

Privacy Policy, Terms of Use, and FAQ are authored in `../docs`, not in app route files. `pnpm content:sync` regenerates `src/content/generated/shared-documents.json` for both the app and website. Never edit generated JSON directly.

Content synchronization is required before native generation and builds:

- `pnpm prebuild` runs content sync, then `expo prebuild`;
- EAS runs content sync through `eas-build-pre-install`;
- `start`, `ios`, `android`, and `web` synchronize automatically;
- `lint` and `test` fail if generated content is stale;
- `pnpm content:check` performs the drift check directly.

Commit canonical Markdown and both generated JSON files together.

## Current Remaining Work

- native Android visual/regression pass;
- release build profiles and signing validation;
- store assets, screenshots, and metadata;
- decide whether bulk history actions or medium widgets belong in v1.

See `../docs/plan/02-execution-plan.md` and `../docs/plan/03-release-deployment-guide.md` for the authoritative remaining-work lists.
