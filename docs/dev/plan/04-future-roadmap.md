# Simple Fasting — V1 Parking Lot

The current `/app` implementation is the baseline. Until the project is explicitly declared production/public, all app work is V1 pre-release work.

Parking-lot items are not commitments. Implement them only when explicitly requested or supported by clear user demand.

## Storage Policy Before Production

- Breaking storage/model changes are allowed when they improve correctness, simplicity, or performance.
- Development data may be reset when explicitly approved.
- Do not build migrations or compatibility layers for abandoned development-only shapes unless they solve a current problem.
- Keep the current schema typed and internally consistent.
- Think about future migrations when naming and shaping data, but do not spend implementation time on migrations now.

After the first public/production release is explicitly declared, persisted schema changes will require migrations, backward compatibility, and upgrade testing.

## Current V1 Baseline

Implemented today:

- native Data, Fast, and Settings tabs;
- planned, custom, and open-ended fasting;
- optional notes and local reminders;
- history, edit, statistics, heatmaps, and charts;
- standard/custom goals with last-selection persistence;
- themes, accent colors, and goal duration display format;
- JSON/CSV import/export and clear data;
- offline FAQ, Privacy Policy, and Terms;
- small iOS and Android home-screen widgets.

Release readiness work remains documented in `02-execution-plan.md` and `03-release-deployment-guide.md`.

## V1 Candidates

These retain the local-first architecture and can be considered when they become important enough:

- medium widget with active fast and recent summary;
- iOS lock-screen widgets;
- Android ongoing fasting notification;
- advanced Live Activity controls beyond the active-fast display;
- network-aware external-link state;
- accessibility polish;
- more native runtime verification on real devices;
- performance profiling for startup, chart rendering, and navigation transitions.

## Explicitly Deferred Until Product Direction Changes

These are not part of V1 and should not be designed as committed future versions:

- accounts or cross-platform sync;
- backend APIs or databases;
- iCloud/CloudKit sync;
- payment, premium, donation, or subscription flows;
- Apple Health or Health Connect integrations;
- Apple Watch, desktop, or other companion apps;
- social feeds and community mechanics;
- ads or tracking SDKs;
- aggressive gamification;
- complex meal/calorie tracking;
- AI-generated health advice.

## Decision Gate

Before adding a parking-lot feature, answer:

1. Is there demonstrated user demand?
2. Does it preserve the fast start/end loop?
3. Can it remain local and offline where practical?
4. Does it preserve privacy and user ownership?
5. Is the maintenance cost justified?
6. Does it require a payment, account, or backend decision that has not been approved?
7. How does it affect widgets, notifications, storage, export, and release testing?

If the answers are unclear, keep the feature out of the current release.
