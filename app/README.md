# Simple Fasting App

Expo React Native application for a private, offline-first fasting tracker. The app runs on iOS and Android, stores all user data locally in MMKV, and does not require an account or backend.

The code in this directory is the source of truth for current application behavior. Product intent, remaining work, release steps, and future ideas are documented in `../docs`.

## Product Flow

1. Open the app.
2. Choose a standard, custom, or open-ended fasting goal.
3. Optionally add a note.
4. Start the fast.
5. Follow progress in the app or small home-screen widget.
6. End the fast and optionally edit its details.
7. Review statistics, graphs, and history in Data.

Everything in this flow works locally. Internet is only needed for optional external website/help links.

## Navigation and Screens

The app uses native Expo Router tabs in this order:

### Data

Data has a native segmented control:

- **Stats** — streaks, longest/average fast, completion, goal achievement, total hours, and total fasts.
- **Graphs** — weekly/monthly/yearly heatmaps, monthly hours, duration distribution, completion, and goal achievement.
- **History** — active summary plus completed sessions, with edit and single-entry delete actions.

Tapping a history entry pushes **Edit Fast**, a native stack screen for dates, duration/goal, and note editing.

### Fast

The ready state includes:

- standard presets `12:12`, `14:10`, `16:8`, `18:6`, and `20:4`;
- Custom duration with separate select and edit actions;
- Open-ended fast;
- optional Note;
- Start fast fixed above the native tab bar.

A fresh install starts on `16:8`. Every goal selection is persisted immediately and restored later. There is no separate default-goal property.

Custom duration uses native Days/Hours wheels and is capped at seven days. The normal idle screen does not scroll when its content fits; responsive scroll remains available for small screens and expanded/error states.

The active state shows the timer, progress, start/end times, local reminder, optional note, End fast, and Cancel fast.

### Settings

- **Appearance** — System/Light/Dark and settled-scroll accent selection.
- **Goals** — opens Fasting Goals.
- **Notifications** — fast-end reminder and daily reminder with Hours/Minutes wheel.
- **Data** — JSON export, CSV export, and Clear data.
- **About** — website, FAQ, bug-report email, support email, and build version.
- **Legal** — external and offline Privacy Policy and Terms.

### Supporting Stack Screens

- **Fasting Goals** — standard goals can be shown/hidden; custom goals can be added, edited, or deleted. At least one remains enabled.
- **Edit Fast** — edits a saved history session.
- **FAQ** — offline local help.
- **Privacy Policy** — offline local copy.
- **Terms of Use** — offline local copy.

These are standard native stack pushes with system headers and back buttons. The Custom duration editor is a form-sheet modal.

## Widgets

Small home-screen widgets are implemented on both platforms.

- Inactive: “Ready to fast?” and an action to open the app.
- Active: elapsed time and the planned goal or open-ended state.
- Tap: opens `simple-fasting://`.
- Refresh: requested whenever active fasting state changes.

iOS uses `expo-widgets`; Android uses `react-native-android-widget`. Medium/large widgets, lock-screen widgets, Live Activities, Dynamic Island, and Android ongoing notifications are not implemented.

## Notifications

Notifications are local only through `expo-notifications`.

- fast-end notification for a planned fast;
- optional daily reminder;
- permission handling;
- cancellation and startup reconciliation.

There is no push-notification server.

## Local Data

MMKV stores:

- `metadata`;
- `settings`;
- `activeFast`;
- `history`;
- `graphCache`.

History is the source of truth for statistics and graphs. Users can export JSON or CSV through the native share sheet and can clear all local data with confirmation.

Before the first public release, breaking local schema changes are acceptable. After release, persisted changes require explicit migrations and backward compatibility.

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
├── components/          # Shared surfaces, buttons, text, feedback, graphs
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

Common commands:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm exec expo export --platform web --output-dir /tmp/simple-fasting-web
pnpm exec expo export --platform ios --output-dir /tmp/simple-fasting-ios
pnpm exec expo export --platform android --output-dir /tmp/simple-fasting-android
```

Static exports verify bundling but do not replace simulator/device testing for notifications, MMKV, gestures, and widgets.

## Current Remaining Work

- native Android visual/regression pass;
- release build profiles and signing validation;
- store assets, screenshots, and metadata;
- broader automated tests;
- decide whether bulk history actions or medium widgets belong in v1.

See `../docs/02-execution-plan.md` and `../docs/03-release-deployment-guide.md` for the authoritative remaining-work lists.
