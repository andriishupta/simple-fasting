# Simple Fasting — Product & Implementation Specification

Final consolidated product, architecture, UX, privacy and implementation document.

## Product Vision

Privacy-first fasting tracker.

**Open App → Start Fast → Live Life → Check Widget → Complete Fast.**

No accounts, no cloud sync, no ads, no subscriptions.

## Core Principles

- **Local First** — Data stays on the device
- **Offline First** — Works without internet
- **Privacy First** — No personal data collection
- **Fast Setup** — Start fasting in seconds
- **Minimal UI** — Calm, clean, native feel
- **User Owns Data** — Export and control at all times

## Platforms

- iOS
- Android

## Technical Stack

- Expo
- React Native
- TypeScript
- MMKV
- Expo Notifications
- Native Widgets
- Live Activities

## Main Features

- Fasting Timer
- History
- Statistics
- Goals
- Heatmaps & Charts
- Widgets
- Local Notifications
- Export JSON/CSV

## Data Model

MMKV storage keys:

| Key          | Description                        |
| ------------ | ---------------------------------- |
| `settings`   | User preferences and configuration |
| `activeFast` | Currently active fasting session   |
| `history`    | Completed fasting sessions         |
| `graphCache` | Cached derived data for graphs     |

**History is the source of truth.** Statistics and graphs are derived.

## Widgets

| Size   | Content                            |
| ------ | ---------------------------------- |
| Small  | Active Fast                        |
| Medium | Recent Fasts + Active Fast         |
| Large  | Heatmaps, Goal Achievement, Charts |

### iOS Features

- Home Screen Widgets
- Lock Screen Widgets
- Live Activities
- Dynamic Island
- All configurable

### Android Features

- Home Screen Widgets
- Ongoing Notification
- All configurable

## Graphs

- Weekly Heatmap
- Monthly Heatmap
- Yearly Git-style Heatmap
- Monthly Hours
- Duration Distribution
- Completion Rate
- Goal Achievement

## Settings

- Theme
- Accent Color
- Goals
- Notifications
- Widget Settings
- Live Activities
- Dynamic Island
- Android Notification
- Export Data
- Privacy Policy
- Support Creator (future optional donation/tip feature)

## Notifications

Local notifications only. No backend, APNS server, FCM server or user accounts required.

## Privacy & Security

- No personal information required
- No authentication
- No backend
- Local-only storage
- Optional future anonymous analytics remains undecided

## App Store Metadata

- **Working names:** Simple Fasting, Fasting Timer, Just Fasting
- **Category:** Health & Fitness

## Release Plan

| Phase | Scope                              |
| ----- | ---------------------------------- |
| 1     | Core Fasting                       |
| 2     | History & Export                   |
| 3     | Widgets & Notifications            |
| 4     | Statistics & Goals                 |
| 5     | Live Activities & Advanced Widgets |
