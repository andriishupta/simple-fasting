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
├── docs/          # Product and project documentation
├── AGENTS.md
└── README.md
```

---

## Documentation First

Before implementing features, review relevant documentation.

Location:

```text
docs/
```

Current documents:

```text
01-product-specification.md
02-execution-plan.md
03-release-deployment-guide.md
04-future-roadmap.md
```

Use this reference table to choose the right document before starting work:

| Task type                                                                                                                         | Primary document                                       | Use when                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| General product behavior, feature requirements, architecture, UX, privacy, data model, widgets, notifications, app store metadata | `01-product-specification.md` | You need the broad source of truth or are implementing v1 app behavior.                  |
| Implementation sequencing, task breakdown, epic scope, development order                                                          | `02-execution-plan.md`        | You need to decide what to build next or keep work aligned with the execution plan.      |
| Release, deployment, platform setup, store preparation, EAS, TestFlight, Google Play, testing strategy                            | `03-release-deployment-guide.md` | You are changing deployment, release, platform configuration, or store-facing materials. |
| Future roadmap, versioning, migrations beyond v1, sync, accounts, health integrations, premium features                           | `04-future-roadmap.md`        | You are evaluating whether a requested feature belongs now or is a future-version item.  |

When unsure, start with `01-product-specification.md`, then consult the more specific document if the work is about execution order, deployment, or future evolution.

Documentation is the source of truth.

Do not silently diverge from documented requirements.

If documentation and implementation conflict:

1. Explain the conflict.
2. Propose a solution.
3. Keep behavior consistent.

---

## Project Overview

Simple Fasting is a privacy-first fasting tracker.

Core principles:

- Local First
- Offline First
- No Account Required
- No Backend Required
- No Tracking
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

- No analytics
- No tracking
- No advertising SDKs
- No user accounts
- No personal data collection

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
- Migration support
- Backward compatibility

Persisted structures should support future migrations.

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
04-future-roadmap.md
```

Do not implement roadmap items unless requested.

---

## Agent Behavior

Before implementing:

1. Read relevant documentation.
2. Understand existing patterns.
3. Follow repository conventions.

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
