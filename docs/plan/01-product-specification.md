# Simple Fasting — Product and Implementation Specification

This document describes the current application in `/app`. The running application is the source of truth for implemented behavior; this document records that behavior and the intended product boundaries.

## Product

Simple Fasting is a privacy-first, local-first fasting tracker for iOS and Android.

Core loop:

**Open app → choose a goal → start a fast → check progress → end the fast → review local data.**

The product intentionally has:

- no account;
- no backend or cloud dependency;
- no analytics, tracking, ads, or subscription;
- no required internet connection for fasting, history, statistics, goals, or local help;
- local ownership through JSON and CSV export.

## Current Navigation

The native bottom tab order is:

1. **Data**
2. **Fast**
3. **Settings**

Fast is the center tab. Supporting pages use native Expo Router stack navigation with a system header and back button.

## Fast Screen

### Ready state

The ready screen is designed to fit in one normal phone viewport. Scrolling and bounce are disabled when all content fits and enabled only for smaller screens or expanded/error states.

The screen provides:

- standard presets: `12:12`, `14:10`, `16:8`, `18:6`, and `20:4`;
- a one-off **This time** duration, with reusable custom goals managed in Settings;
- an open-ended fast;
- an optional note;
- a Start fast action positioned above the native tab bar.

The first fresh-install selection is `16:8`. Selecting a goal immediately persists its duration as `lastUsedGoalDurationHours`; the next visit restores that choice. There is no separate default-goal state.

The selected goal is shown directly as its name and duration without a redundant “Your fasting goal” label. Enabled goals, **This time**, and **Open-ended fast** share one neutral selection surface; the current choice uses a checkmark instead of an accent-filled button. Tapping **This time** selects it, while tapping its displayed duration or chevron toggles the native Days/Hours wheel editor inline. Selecting another goal closes it. This-time duration is limited to seven days; selecting seven days forces hours to zero.

### Active state

An active fast shows:

- elapsed time and progress;
- persisted elapsed/remaining toggle for planned fasts, retained in MMKV between fasts and shared with widgets;
- start and planned end times;
- optional note;
- local end reminder control that schedules a notification when the planned goal is reached;
- a compact action row with destructive Cancel fast on the left and accent-colored End fast on the right.

Ending a fast saves it to History immediately and returns to the ready state with a five-second **Fast saved** notice below Start fast. The notice links to the saved entry and displays its remaining time. Edit Fast otherwise opens from History. Cancel is a ghost-style destructive text action and does not add a completed history entry.

## Data Screen

Data contains a native segmented control with three views:

### Stats

Stats are presented as separate neutral two-column metric tiles without accent-only emphasis.

- current streak;
- longest streak;
- longest fast;
- average duration;
- completion rate;
- total fasting hours;
- total completed fasts.

### Charts

- recent completed-fast duration trend;
- monthly fasting hours;
- average planned-fast completion;
- duration distribution;
- weekly, monthly, and yearly heatmaps.

### History

- completed fasting sessions;
- entry details including duration, dates, goal, and note; the redundant completed status is omitted;
- the History segment uses a stable label without a dynamic count;
- labeled duration with its nearby goal pill, start/end values, and a horizontal planned-fast progress bar;
- tap-to-edit and a native-feeling left swipe that reveals destructive Delete on iOS and Android;
- selection mode with confirmation for bulk deletion;
- native stack Edit Fast screen for changing dates, goal duration, and note.

Edit Fast reuses the Fast screen’s goal selector, inline This-time editor, Open-ended action, and Note control. Only enabled goals are offered. Duration and Schedule are presented as grouped sections. Start and required End values use theme-aware native date/time controls without duplicate formatted timestamps. The screen has Save and ghost-style Delete actions; there is no redundant Cancel or Clear End action.

History is the source of truth for statistics and chart calculations. Bulk deletion is an explicit selection mode and always requires confirmation.

## Settings Screen

Settings uses consistent grouped native-style surfaces.

### Appearance

- System, Light, and Dark themes;
- horizontally scrolling accent-color selector;
- accent changes only after scrolling settles.

### Goals

Goals is a native stack screen with a transparent large-title header.

- standard goals can be enabled or disabled but not deleted;
- custom goals can be enabled/disabled, created, edited, and deleted;
- goals can be reordered with a visible drag handle and the order persists in MMKV;
- custom goals expose edit navigation and swipe-to-delete; standard goals never expose deletion;
- add goal is a floating plus action;
- at least one goal must remain enabled;
- the selected Fast-screen goal is persisted directly;
- there is no Default badge or Make default action.

### Notifications

- local fast-end reminder;
- local daily fasting reminder;
- minimal grouped native Hours/Minutes wheel for reminder time with theme-aware item colors and no nested card or redundant label;
- notification state is reconciled at startup.

No push-notification backend is used.

### Data

- JSON import/export of app data and metadata;
- CSV import/export of fasting history;
- import preserves existing history, skips duplicate IDs and sessions whose time ranges overlap existing or already accepted imported sessions, and reports saved/skipped counts;
- native share sheet;
- Clear data with destructive confirmation.

### About and Legal

- Website opens the external website;
- FAQ has an external action and an offline local copy;
- Report bug opens the device email flow for `bugs@simplefasting.app`;
- Support email opens the device email flow for `support@simplefasting.app`;
- Privacy Policy and Terms of Use have external actions and offline local copies;
- app version/build is displayed locally.

## Widgets

Small home-screen widgets are implemented for iOS and Android.

When inactive, the widget invites the user to open the app and start a fast. When active, it shows the app identity, goal name and hours, the persisted elapsed/remaining label, one timer, and planned-goal progress without redundant timer or goal labels. Tapping opens the app through `simple-fasting://`.

- iOS uses `expo-widgets` and SwiftUI-backed Expo UI.
- Android uses `react-native-android-widget`.
- fasting-state writes request widget refreshes but widget failures never block local data updates.

Medium, large, lock-screen, Live Activity, Dynamic Island, and Android ongoing-notification experiences are not implemented.

## Storage and State

MMKV keys:

| Key | Purpose |
| --- | --- |
| `metadata` | Schema, app version, Expo version, initialization timestamps |
| `settings` | Theme, accent, goals, last selected duration, Data view, and notifications |
| `activeFast` | Active session and reminder state |
| `history` | Completed fasting sessions; source of truth |
| `diagnostics` | Up to 50 recent privacy-filtered local error events; never uploaded automatically |

State management uses React state, small hooks, and MMKV subscriptions. No global state framework is used.
Statistics and charts are derived directly from History; no unused persisted cache or speculative widget settings are kept.

Storage initialization failures show retry and explicit reset controls. Optional notification restoration failures do not block access to fasting data or the core timer.

Storage initialization, reminder restoration, and render failures can add a limited local diagnostic event. Diagnostic exports exclude fasting history, notes, goals, settings, and device identifiers, redact common email/URL/file-path text, and are shared only through the diagnostic option inside Report bug. The app does not include remote crash reporting or analytics.

Before the first public release, storage changes may be breaking and development data may be reset when explicitly approved. After the first public release, persisted schema changes require migrations and backward compatibility.

## UI System

The application should feel calm, minimal, fast, and native.

- Native Expo Router tabs and stack navigation.
- Native switches, segmented controls, wheel pickers, alerts, and share sheets where available.
- Shared theme colors, spacing, surface radius, and control radius.
- Expo Router navigation, stack headers, native tab chrome, and picker items resolve from the same app theme and accent palette.
- Native tab bars use an opaque themed background during tab transitions; native segmented and date/time controls receive the resolved app appearance explicitly.
- Persisted MMKV settings are loaded before the first themed render, and explicit Light/Dark preferences are synchronized with native `Appearance` so UIKit/Android controls do not briefly use the wrong scheme.
- Neutral page background with consistent white/dark surfaces, thin borders, and grouped rows.
- Safe-area and native tab-bar spacing on both platforms.
- Minimal animation; platform-native transitions are preferred.
- Important values use tabular numerals and accessible labels.

## Privacy and Security

- Data remains on the device unless the user explicitly exports or shares it.
- No personal information is required.
- No secrets, tokens, or credentials belong in source control.
- External website and email actions are optional; core tracking and offline copies remain available without internet.

## Current Product Boundaries

The following are not part of the implemented app:

- accounts or sync;
- backend APIs;
- payment, premium, donation, or subscription flows;
- analytics or advertising;
- health-platform integrations;
- social features or complex meal tracking;
- advanced widgets and Live Activities.
