# Simple Fasting — Future Evolution & Versioning Strategy

## Purpose

Describe realistic future evolution paths while preserving the project's core philosophy:

- **Local First**
- **Privacy First**
- **Offline First**
- **User Owns Data**

Future features should be introduced only when there is demonstrated user demand.

---

## Version 1.x — Local First Foundation

**Status:** Initial Release

### Principles

- No accounts
- No backend
- No cloud sync
- No subscriptions
- No personal data collection

### Features

- Fasting Timer
- History
- Statistics
- Goals
- Heatmaps
- Widgets
- Local Notifications
- Export JSON
- Export CSV

### Storage

```
MMKV
├── settings
├── activeFast
├── history
└── graphCache
```

History is the source of truth. Statistics and charts are derived locally.

### Business Model

Free. Potential future donation/support link.

---

## Version 2.x — Power User Experience

**Status:** Optional Future

### Goal

Improve daily usage without introducing accounts or cloud services.

### New Features

#### Apple Watch

- Start Fast
- End Fast
- View Active Fast
- View Progress
- View Goal Progress

#### Advanced Widgets

- Additional widget layouts
- Weekly widgets
- Monthly widgets
- Goal widgets

#### Advanced Statistics

- Weekly reports
- Monthly reports
- Goal completion trends
- Long-term fasting trends

#### Alternate Icons

- Light theme icon
- Dark theme icon
- Minimal icon
- Seasonal icons

### Architecture

Still: No backend, No accounts, No cloud sync.

### Business Model

Possible: **Simple Fasting Pro** — One-Time Purchase

Unlocks:

- Apple Watch
- Advanced Widgets
- Advanced Statistics
- Alternate Icons

---

## Version 3.x — Apple Ecosystem Sync

**Status:** Future

### Goal

Provide seamless Apple ecosystem experience while avoiding custom backend infrastructure.

### New Features

#### iCloud Backup

Automatic backup of:

- History
- Settings
- Goals

#### iCloud Sync

Synchronization between:

- iPhone
- iPad
- Apple Watch
- macOS

### Architecture

```
MMKV
  ↓
Sync Layer
  ↓
CloudKit
  ↓
User Apple ID
```

### Advantages

- No user account required
- No password management
- No backend maintenance
- No infrastructure costs
- Native Apple experience

### Limitations

- Apple devices only
- Android unsupported

### Business Model

One-Time Purchase or Pro Upgrade.

---

## Version 4.x — Cross Platform Sync

**Status:** Future

### Goal

Enable synchronization across Apple and Android devices.

### New Features

#### Optional Account System

Users may choose:

- **Local Mode** or **Sync Mode**

Accounts remain optional.

#### Cross Platform Sync

Synchronization between:

- iPhone
- Android
- iPad
- macOS
- Windows

#### Cloud Backup

Cross-platform backup and restore.

### Architecture

```
MMKV
  ↓
Sync Queue
  ↓
Cloudflare Worker
  ↓
Cloudflare D1
```

### Sync Strategy

Only sync:

- history
- settings
- goals

Do **NOT** sync:

- statistics
- heatmaps
- charts
- graphCache

Those are rebuilt locally.

### Offline Support

When offline:

```
Local Changes
  ↓
Pending Sync Queue
```

When online:

```
Pending Sync Queue
  ↓
Cloud Sync
```

### Conflict Resolution

Simple strategy: **Last Write Wins**

Should be sufficient for fasting data.

### Business Model

Pro Upgrade.

---

## Version 5.x — Ecosystem Expansion

**Status:** Long-Term Future

### Goal

Transform Simple Fasting into a broader fasting platform while preserving simplicity.

### New Features

#### Desktop Applications

- macOS
- Windows

#### Health Integrations

- Apple Health
- Health Connect
- Wearables

#### Advanced Analytics

- Long-term reports
- Habit trends
- Goal achievement analysis

#### Advanced Widgets

- Dashboard widgets
- Multi-device widgets

#### Data Portability

- Full export
- Full backup
- Migration tools

### Optional Features

Only if significant demand exists:

- Family Sharing
- Teams
- Challenges
- Community Features
- AI Insights

### Features Intentionally Avoided

Unless overwhelming demand exists:

- Social Feed
- Ads
- Aggressive Gamification
- Mandatory Accounts
- Complex Meal Tracking

---

## Sync Architecture Evolution

| Version | Architecture                                        |
| ------- | --------------------------------------------------- |
| V1      | MMKV Only                                           |
| V2      | MMKV → Apple Watch Communication                    |
| V3      | MMKV → Sync Layer → CloudKit                        |
| V4      | MMKV → Sync Queue → Cloudflare Worker → D1          |
| V5      | MMKV → Cross Platform Sync Layer → Cloudflare Infra |

---

## Business Model Evolution

| Version | Model                      |
| ------- | -------------------------- |
| V1      | Free                       |
| V2      | Optional One-Time Purchase |
| V3      | Pro Upgrade                |
| V4      | Pro Upgrade + Sync         |
| V5      | Optional Premium Features  |

No subscription should be introduced unless there is a recurring infrastructure cost that cannot be covered by one-time purchases.

---

## Decision Framework

Before implementing any future feature:

1. Is there demonstrated user demand?
2. Does it preserve simplicity?
3. Does it preserve privacy?
4. Can it remain optional?
5. Does it increase maintenance burden?

If the answer to multiple questions is negative, the feature should not be built.

The project should remain a simple fasting application rather than evolve into a complex health platform.
