# Simple Fasting — Future Roadmap and Versioning

The current `/app` implementation is the baseline. Roadmap items are not commitments and should be implemented only when explicitly requested or supported by clear user demand.

## Versioning and Storage Policy

### Before the first public v1 release

- Breaking storage/model changes are allowed.
- Development data may be reset when explicitly approved.
- Do not build compatibility layers for abandoned development-only shapes unless they solve a current problem.
- Keep the current schema typed and internally consistent.

### After the first public release

- Persisted schema changes require a version bump and migration.
- Preserve user history, active fasts, settings, and goals.
- Test upgrades from every supported public schema.
- Never silently discard valid user data.

## Current v1 Baseline

Implemented today:

- native Data, Fast, and Settings tabs;
- planned, custom, and open-ended fasting;
- optional notes and local reminders;
- history, edit, statistics, heatmaps, and charts;
- standard/custom goals with last-selection persistence;
- themes and accent colors;
- JSON/CSV export and clear data;
- offline FAQ, Privacy Policy, and Terms;
- small iOS and Android home-screen widgets.

Release readiness work remains documented in `02-execution-plan.md` and `03-release-deployment-guide.md`.

## Near-Term Candidates

These retain the local-first architecture and can be considered for v1.x or v2 based on priority:

- native swipe-to-delete for History;
- multi-select and bulk history delete;
- network-aware external-link state;
- medium widget with active fast and recent summary;
- large statistics/heatmap widget;
- iOS lock-screen widgets;
- Android ongoing fasting notification;
- iOS Live Activities and Dynamic Island;
- more automated tests and accessibility polish.

## Version 2 — Power-User Native Experience

Possible additions:

- Apple Watch start/end/progress experience;
- advanced widgets and configurable layouts;
- weekly and monthly reports;
- long-term goal trends;
- alternate app icons;
- optional one-time Pro unlock if a paid tier is deliberately approved.

The architecture should remain local-only with no mandatory account or backend.

## Version 3 — Optional Apple Ecosystem Sync

Potential scope:

- iCloud backup;
- CloudKit sync for history, settings, and goals;
- iPhone, iPad, Apple Watch, and macOS continuity.

Derived statistics and charts should be rebuilt locally rather than synced.

This remains optional and must not remove local-only mode.

## Version 4 — Optional Cross-Platform Sync

Only if users clearly require Android/Apple synchronization:

- optional accounts;
- local mode remains available;
- encrypted transport and a minimal sync backend;
- sync only history, settings, and goals;
- rebuild charts and statistics locally;
- offline queue with an explicit, tested conflict strategy.

A backend, Cloudflare, database, authentication, or recurring payment must not be introduced speculatively.

## Version 5 — Ecosystem Expansion

Long-term possibilities:

- desktop applications;
- Apple Health and Health Connect integrations;
- wearables;
- richer data portability and backup/restore;
- privacy-preserving long-term insights.

## Features Intentionally Avoided

Unless product direction changes explicitly:

- mandatory accounts;
- social feeds and community mechanics;
- ads or tracking SDKs;
- aggressive gamification;
- complex meal/calorie tracking;
- AI-generated health advice;
- subscriptions without unavoidable recurring infrastructure cost.

## Decision Gate

Before adding a roadmap feature, answer:

1. Is there demonstrated user demand?
2. Does it preserve the fast start/end loop?
3. Can it remain local and offline where practical?
4. Does it preserve privacy and user ownership?
5. Is the maintenance cost justified?
6. Does it require a payment, account, or backend decision that has not been approved?
7. How does it affect widgets, notifications, storage, export, and release testing?

If the answers are unclear, keep the feature out of the current release.
