# AGENTS.md

## Purpose

This file contains instructions for AI agents working in this repository.

Always read this file before making changes.

Goals:

- Simplicity
- Maintainability
- Security
- Privacy
- Consistency

---

## Repository Structure

```text
/
├── app/           # Expo React Native application
├── www/           # Astro website
├── docs/
│   ├── content/  # Shared legal and FAQ content
│   └── dev/      # Developer manual, plans, and release documentation
├── AGENTS.md
└── README.md
```

---

## Documentation First

Before implementing features, review relevant documentation.

Planning location:

```text
docs/dev/plan/
```

Current planning documents:

```text
01-product-specification.md
02-execution-plan.md
03-release-deployment-guide.md
04-future-roadmap.md
```

Use this reference table to choose the right document before starting work:

| Task type                                                                                                                         | Primary document                                       | Use when                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| General product behavior, feature requirements, architecture, UX, privacy, data model, widgets, notifications, app store metadata | `plan/01-product-specification.md` | You need the broad source of truth or are implementing v1 app behavior.                  |
| Implementation sequencing, task breakdown, epic scope, development order                                                          | `plan/02-execution-plan.md`        | You need to decide what to build next or keep work aligned with the execution plan.      |
| Release, deployment, platform setup, store preparation, EAS, TestFlight, Google Play, testing strategy                            | `plan/03-release-deployment-guide.md` | You are changing deployment, release, platform configuration, or store-facing materials. |
| V1 parking-lot scope, deferred ideas, sync, accounts, health integrations, premium features                                        | `plan/04-future-roadmap.md`        | You are evaluating whether a requested feature belongs in current V1 work or remains deferred. |

When unsure, start with `plan/01-product-specification.md`, then consult the more specific document if the work is about execution order, deployment, or future evolution.

Shared user-facing content lives in `docs/content/legal/*.md` and `docs/content/faq.md`. These Markdown files are the source of truth for both `app` and `www`. Run `node scripts/sync-shared-content.mjs` after editing them; never edit generated `shared-documents.json` files directly. Legal documents require explicit `version` and `effectiveDate` metadata.

Shared-content synchronization is a mandatory build invariant:

- `www` must keep the shared-content generator in its `prebuild` lifecycle script;
- `app` must synchronize in its Expo `prebuild` command and EAS `eas-build-pre-install` hook;
- generated `shared-documents.json` files are ignored and must not be committed;
- CI should run a shared-content integration check that regenerates files, runs `node scripts/sync-shared-content.mjs --check` before the website build, builds the website, and verifies rendered output;
- changes to the Markdown schema, generator, targets, or lifecycle hooks must be reflected in the root, app, and website README and AGENTS files.

Automated verification is also a repository invariant:

- keep GitHub CI checks for app type/lint/unit/integration/coverage, the website shared-doc production verifier, and both iOS/Android bundle exports;
- keep native E2E flows platform-neutral and run the same Maestro set on iOS and Android through the validated EAS workflow;
- do not commit generated coverage output;
- when behavior changes, update the narrowest useful unit or integration test and the relevant primary E2E flow.

The current implementation in `/app` is the source of truth for behavior that already exists. Documentation is the source of truth for product intent, remaining work, release requirements, and future scope.

Keep implementation and documentation synchronized. Do not silently diverge from documented requirements or describe unimplemented behavior as shipped.

If documentation and implementation conflict:

1. Inspect the current implementation and relevant history/context.
2. Explain the conflict.
3. Propose the smallest consistent solution.
4. Update documentation when behavior intentionally changes.

---

## Project Overview

Simple Fasting is a privacy-first fasting tracker.

Core principles:

- Local First
- Offline First
- No Account Required
- No Backend Required
- No advertising or cross-app tracking
- No Ads
- No Subscription
- Fast UX

The product intentionally remains simple.

Avoid feature creep.

---

## App Directory

Location:

```text
/app
```

Technology:

- Expo
- React Native
- TypeScript

Responsibilities:

- Fasting timer
- Fasting sessions
- History
- Statistics
- Widgets
- Local notifications
- Local storage

Rules:

- Prefer Expo-compatible libraries
- Avoid native code unless required
- Prefer TypeScript
- Prefer simple architecture
- Keep startup fast
- Keep battery usage low

---

## Website Directory

Location:

```text
/www
```

Technology:

- Astro

Responsibilities:

- Landing page
- Privacy Policy
- Support
- FAQ
- Changelog

Rules:

- Prefer static pages
- Prefer server-rendered content
- Minimize JavaScript
- Prioritize SEO

---

## Security

Never commit:

- Secrets
- API keys
- Tokens
- Credentials
- Certificates

Use:

```text
.env.local
.env.production
```

for secrets.

Never hardcode sensitive values.

---

## Privacy

Default assumptions:

- No analytics SDK
- No telemetry backend
- No product-event tracking
- No installation identifier
- No autocaptured screens, touches, session replay, advertising, cross-app tracking, profiling, or GeoIP
- No advertising SDKs
- No user accounts
- No fasting history, dates, durations, goals, notes, reminder schedules, exports, contact details, advertising identifiers, or precise location in reporting

The app must not create an installation UUID or anonymous analytics profile for V1. Basic reliability reporting comes from Apple App Store Connect and Google Play Console platform crash/vitals reports, plus local diagnostics shared only after explicit user action. New remote reporting, identifiers, events, or properties require an explicit privacy review and corresponding documentation update.

Any feature that collects user data requires explicit approval.

Privacy is a product feature.

---

## Architecture Principles

Prefer:

- Simplicity
- Readability
- Explicit code
- Small abstractions

Avoid:

- Over-engineering
- Premature optimization
- Complex design patterns
- Excessive dependencies

---

## Storage

Primary storage:

```text
MMKV
```

Requirements:

- Versioned schema
- Typed validation

Until the project is explicitly declared production/public, all app work is V1 pre-release work. Breaking storage changes and local data resets are allowed when they simplify the app or improve correctness, but do not clear local data without approval.

Think about future migrations when shaping data, but do not implement compatibility layers or migrations for abandoned development-only shapes unless explicitly requested. After the first public release is declared, persisted schema changes will require migrations, backward compatibility, and upgrade testing.

---

## State Management

Prefer:

- React state
- Context
- Lightweight solutions

Avoid introducing large state libraries unless justified.

---

## TypeScript

Requirements:

- Strict mode
- Explicit types
- No unused code
- No dead dependencies
- Prefer functional style code.
- Prefer immutable data updates over mutation.
- Prefer explicit values over implicit behavior.
- Prefer `type` aliases over `interface` unless declaration merging or class contracts are required.
- Use `enum` for stable closed sets that are persisted, displayed, or shared across modules.
- Avoid custom DTO layers unless they remove a real boundary mismatch.

Avoid `any` unless absolutely necessary.

---

## UI Principles

The application should feel:

- Fast
- Calm
- Native
- Minimal

Avoid:

- Visual clutter
- Excessive animations
- Complex onboarding
- Unnecessary screens

Users should be able to start a fast within seconds.

### UI/UX Workflow

For meaningful UI changes:

1. Inspect the current screen and neighboring screens before editing.
2. Identify the existing shared tokens and native interaction patterns.
3. Prefer Expo and platform-native controls, safe-area handling, navigation, gestures, and transitions.
4. Keep cards, grouped rows, spacing, radii, typography, and icon treatment consistent across screens.
5. Avoid scrolling when a normal phone viewport has enough room; retain responsive scrolling for small or expanded states.
6. Check both idle and expanded/error/keyboard states.
7. When a simulator is available, verify with screenshots and interaction rather than relying only on code inspection.
8. Consider iOS and Android behavior separately while keeping product behavior consistent.

Do not optimize a single screen in isolation if the result makes the application feel like multiple unrelated products.

---

## Widgets

Widgets are a first-class feature.

Changes affecting:

- Active fasting session
- History
- Statistics
- Goals

must consider widget refresh behavior.

---

## Notifications

Use:

- Local notifications

Avoid:

- Push notifications
- Backend notification systems

unless explicitly requested.

---

## Performance

Optimize for:

- Fast startup
- Low memory usage
- Low battery consumption

Avoid unnecessary background processing.

---

## Dependencies

Before adding a dependency:

1. Check if existing tools solve the problem.
2. Prefer mature libraries.
3. Prefer fewer dependencies.

Every dependency increases maintenance cost.

---

## Future Features

Future roadmap items are documented in:

```text
docs/dev/plan/04-future-roadmap.md
```

Do not implement roadmap items unless requested.

---

## Agent Behavior

Before implementing:

1. Read relevant documentation.
2. Understand existing patterns.
3. Inspect the current app behavior when UX or runtime behavior matters.
4. Follow repository conventions.

### Skills and Tools

Use relevant provided skills when they materially improve the work. In particular:

- use Expo/native UI guidance for Expo Router, controls, safe areas, tabs, sheets, animation, and platform behavior;
- use iOS simulator/debugger tooling for native screenshots and interaction checks when an iOS simulator is available;
- use browser/frontend testing guidance for website rendering work;
- use focused review/audit skills when the user requests a whole-repository or over-engineering review.

Read a selected skill completely and follow its workflow. Do not invoke skills mechanically when they do not apply. Explain briefly when a skill changes the work or verification approach.

For significant changes:

1. Explain reasoning.
2. Explain tradeoffs.
3. Keep changes focused.

Avoid large architectural refactors unless explicitly requested.

---

## Decision Framework

When multiple solutions exist:

1. Choose the simplest.
2. Choose the most maintainable.
3. Choose the most privacy-friendly.
4. Choose the least surprising.

Long-term simplicity is preferred over short-term convenience.

---

## Definition of Done

A task is complete when:

- Requirements are implemented
- TypeScript passes
- Linting passes
- Existing functionality remains intact
- No obvious security issues exist
- Documentation remains accurate
- UI changes have proportional runtime or screenshot verification when available
- Native platform changes consider iOS and Android behavior

---

## Project Philosophy

Simple Fasting is intentionally small.

The project values:

- User privacy
- Local ownership of data
- Offline-first operation
- Reliability
- Maintainability

Every feature should support these goals.
