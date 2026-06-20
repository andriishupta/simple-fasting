# Simple Fasting — Execution Plan

This plan reflects the current `/app` implementation. Checked items exist in code; unchecked items remain work and must not be described as shipped.

## 1. Foundation

- [x] Expo React Native application with TypeScript strict mode
- [x] Expo Router native tabs and stack navigation
- [x] MMKV local storage and startup repair flow
- [x] Theme and accent-color system
- [x] Shared spacing, radius, surface, button, and feedback primitives
- [x] ESLint configuration
- [x] EAS project linkage in Expo config
- [ ] Add and review `eas.json` build profiles
- [ ] Add formatting command/configuration if the project needs automated formatting

Separate repository and selector layers are intentionally not planned while direct typed storage functions remain simpler.

## 2. Core Fasting

- [x] Standard presets (`12:12` through `20:4`)
- [x] Persist last selected duration; fresh install starts at `16:8`
- [x] Inline This-time duration wheel with seven-day maximum
- [x] Open-ended fast
- [x] Optional note toggle
- [x] Start, active, end, and cancel flows
- [x] Progress ring and elapsed/remaining timer
- [x] Fast-end reminder
- [x] Idle Fast screen fits a normal viewport without scrolling
- [x] Destructive Cancel and accent End actions in one active-fast action row
- [x] Immediate end-and-save flow with a five-second saved card and View fast action

## 3. Goals

- [x] Standard and custom goal types
- [x] Enable/disable standard and custom goals
- [x] Create, edit, and delete custom goals from a floating add action
- [x] Prevent disabling the final enabled goal
- [x] Remove redundant default-goal state and UI

## 4. Data and History

- [x] Data tab with Stats, Graphs, and History segments
- [x] Current/longest streak, longest/average fast, completion, goal achievement, totals
- [x] Two-column statistics metric grid
- [x] Weekly, monthly, and yearly heatmaps
- [x] Monthly hours and duration distribution
- [x] History empty state
- [x] Edit Fast native stack screen
- [x] Shared Fast/Edit Fast goal and note controls; required themed End time editor
- [x] Single-entry delete
- [x] Counted History segment, labeled rows, goal pills, and cross-platform swipe-to-delete action
- [ ] Multi-select and bulk delete

## 5. Settings and Offline Information

- [x] System/Light/Dark theme selector
- [x] Settled-scroll accent selector
- [x] Goal management
- [x] Fast-end and daily local reminders
- [x] Minimal, theme-aware reminder time wheel without nested chrome
- [x] JSON and CSV export with share sheet
- [x] Clear local data
- [x] Website, support, and dedicated bug-report email actions
- [x] Offline FAQ, Privacy Policy, and Terms of Use routes
- [ ] Network-aware muted state for external-link actions
- [ ] Final copy review for FAQ and legal documents before release

## 6. Widgets and Platform Features

- [x] iOS small home-screen widget
- [x] Android small home-screen widget
- [x] Widget refresh from active-fast state changes
- [x] Deep link from widget to app
- [ ] Medium widget
- [ ] Large widget
- [ ] iOS lock-screen widgets
- [ ] iOS Live Activities and Dynamic Island
- [ ] Android ongoing notification
- [ ] User-facing widget/platform settings when the corresponding features exist

## 7. Quality and Release

- [x] Statistics unit tests for local date boundaries and rates
- [x] TypeScript, lint, test, and static Expo export workflow
- [x] Simulator screenshot-based UI review on iPhone 17 Pro
- [ ] Add targeted storage and fasting-flow tests
- [ ] Test small/large phones, dark mode, and accessibility text sizes
- [ ] Test current Android device/emulator UI and widget behavior
- [ ] Test long-running sessions and notification restoration
- [ ] Final app icon and splash review
- [ ] Store screenshots and metadata
- [ ] TestFlight release
- [ ] Google Play internal test
- [ ] Production submissions

## Recommended Next Order

1. Run a focused iOS and Android regression pass for Fast, Data, Settings, exports, notifications, and widgets.
2. Add release build profiles and validate signing/configuration.
3. Finish store assets and metadata.
4. Decide whether bulk history actions are required for v1.
5. Decide whether medium widgets and advanced platform surfaces ship in v1 or a later release.
