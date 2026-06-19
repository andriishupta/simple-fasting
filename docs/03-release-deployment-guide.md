# Simple Fasting — Release, Deployment & Platform Guide

Release process, platform requirements, development order, store preparation, testing strategy, widgets and deployment workflow.

## Project Goal

Offline-first fasting application with no backend, no accounts, no cloud dependency and local data ownership.

## Final Technical Decisions

- Expo
- React Native
- TypeScript
- MMKV
- Local Notifications
- No Backend
- No Authentication
- Optional Analytics

## Platform Support

### iOS

- Widgets
- Lock Screen Widgets
- Live Activities
- Dynamic Island

### Android

- Widgets
- Ongoing Notifications

## Development Order

1. Setup
2. Core Fasting
3. History
4. Settings
5. Export
6. Graphs
7. Widgets
8. Platform Features

## Widgets

| Size   | Content                                    |
| ------ | ------------------------------------------ |
| Small  | Active Fast                                |
| Medium | Active Fast + Recent Fasts                 |
| Large  | Heatmaps, Goal Progress, Charts            |

## Data Architecture

**History is the source of truth.** Statistics, graphs and heatmaps are derived data.

## Store Preparation

- App Icon
- Screenshots
- Privacy Policy
- Description
- Keywords
- Support Page

### Apple Developer

- **Cost:** $99/year
- **Review time:** Typically 1–7 days

### Google Play

- **Cost:** $25 one-time
- **Review time:** Typically hours to several days

## Testing

iPhone and Android testing for:

- Fasting
- Export
- Widgets
- Notifications
- Long-running sessions

## Future Optional Features

- Alternate App Icons
- Support Creator
- Anonymous Analytics
- Apple Health
- Health Connect

## Success Criteria

- Offline operation
- No backend
- Widget-first experience
- Local data ownership
- Reliable export
