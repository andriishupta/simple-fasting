# app/AGENTS.md

## Purpose

This file contains instructions for AI agents working inside:

```text
/app
```

Read and follow:

1. `/AGENTS.md`
2. Relevant files in `/docs`
3. This file

If instructions conflict:

```text
Project Documentation
    ↓
Root AGENTS.md
    ↓
app/AGENTS.md
```

---

# Project Context

Simple Fasting is:

- Privacy First
- Local First
- Offline First

The app intentionally avoids:

- Accounts
- Backends
- Cloud Sync
- Analytics
- Advertising
- Tracking

The goal is not feature count.

The goal is simplicity and reliability.

---

# Technology Stack

Required stack:

- Expo
- React Native
- TypeScript
- Expo Router
- MMKV

Preferred:

- Expo SDK features
- Expo-compatible packages
- Well-maintained third-party packages with clear value

Avoid native code whenever possible.

---

# Expo First

Before introducing any library:

1. Check Expo SDK
2. Check Expo official package
3. Check Expo-compatible package
4. Check whether a straightforward local implementation is simpler
5. Only then consider native solutions

Prefer:

```ts
expo - notifications;
expo - file - system;
expo - sharing;
expo - router;
```

Avoid ejecting.

Avoid custom native code.

Avoid config plugins unless required.

Avoid installing random or obscure packages for a single small function.

Prefer straightforward app code over package-driven indirection when the feature is simple.

---

# Platform Support

Primary targets:

- iOS
- Android

Every feature should work on both platforms.

Avoid platform-specific implementations unless necessary.

If platform differences exist:

- Document them
- Keep behavior consistent

---

# Architecture

Prefer:

```text
app/
storage/
utils/
components/
```

Organize code by route first, not by technical type.

Examples:

```text
app/(tabs)/settings.tsx
app/(tabs)/history.tsx
app/history/[id].tsx
```

Routes are the feature boundary.

Route-specific behavior, selectors, services, and components should live with the route that uses them.

Shared UI primitives can stay in:

```text
components/
```

Reusable graph primitives, buttons, text wrappers, and layout helpers belong in `components/` only when they are useful across routes.

Generic app storage primitives can stay in:

```text
storage/
```

Truly reusable helpers can stay in:

```text
utils/
```

Avoid:

```text
features/
selectors/
services/
feature-components/
helpers/
misc/
common/
shared/
```

when they become type-based buckets or vague catch-all folders.

Do not create separate global folders for features, selectors, services, or feature components.

If code is reusable, put it in a clear shared place such as:

```text
components/
storage/
utils/
```

Avoid repository-pattern layers unless there is a real boundary or complexity that justifies them.

Prefer direct storage/services functions with clear names for this app.

Structure should remain understandable to a new developer.

---

# State Management

Prefer:

- React State
- Context
- Custom Hooks

Avoid:

- Redux
- MobX
- Complex state machines

unless there is a strong justification.

This application is intentionally small.

---

# Error Handling

Handle throwable cases explicitly.

Prefer:

- Recover immediately when the app can safely do so
- Retry or reschedule local-only work when the fix is obvious
- Keep persisted data consistent if an operation partially fails
- Show a small in-app error state or alert when the app cannot recover automatically

Avoid:

- Silent failures
- Unhandled promises
- Throwing from user-triggered flows without visible feedback
- Losing local data because an optional platform feature failed

If a recoverable operation fails:

1. Preserve the user's local data.
2. Revert or repair any partial app state if needed.
3. Surface a clear in-app message that something went wrong.

Do not expose internal stack traces to users.

---

# Storage

Primary storage:

```text
MMKV
```

All persistent data should:

- Have types
- Have schema versioning
- Support migrations

Example:

```ts
{
  schemaVersion: 1;
}
```

Storage must survive app updates.

---

# Data Model Principles

Use explicit IDs.

Example:

```ts
id;
createdAt;
updatedAt;
status;
```

Avoid anonymous structures that cannot be migrated later.

Future sync should remain possible.

---

# Performance

Prioritize:

- Fast startup
- Fast navigation
- Low memory usage
- Low battery usage

Avoid:

- Unnecessary rerenders
- Deep component trees
- Expensive calculations in render

Use memoization only when necessary.

---

# Widgets

Widgets are a first-class feature.

Changes affecting:

- Active fast
- History
- Goals
- Statistics

must consider widget updates.

Do not implement app features without considering widget impact.

---

# Notifications

Use:

```text
expo-notifications
```

Only local notifications.

Do not introduce:

- Push notifications
- Notification backends
- External messaging services

unless explicitly requested.

---

# UI Guidelines

The app should feel:

- Native
- Minimal
- Calm
- Fast

Avoid:

- Heavy animations
- Excessive gradients
- Complex onboarding
- Visual clutter

Users should start fasting within seconds.

---

# Components

Prefer:

- Small components
- Focused responsibilities
- Clear props

Avoid:

- God components
- 1000+ line screens

Extract reusable pieces early.

---

# Styling

Keep styling consistent.

Prefer:

- Design tokens
- Theme-based colors
- Reusable spacing values

Avoid magic numbers.

---

# TypeScript

Requirements:

- Strict mode
- No implicit any
- Explicit types
- No unused exports

Prefer type safety over speed of implementation.

---

# Dependencies

Before adding a dependency:

1. Is it already solvable with Expo?
2. Is it solvable with existing dependencies?
3. Is a direct implementation small and clearer?
4. Is the package known, actively maintained, and Expo-compatible?
5. Is the package worth future maintenance cost?

Prefer fewer dependencies.

Use good third-party packages when they remove meaningful complexity.

Do not add unknown packages for one utility function, small formatting logic, or simple UI behavior.

Keep implementation straightforward unless a dependency clearly improves reliability or platform support.

---

# Error Handling

Do not silently swallow errors.

Handle:

- Storage failures
- Export failures
- Notification failures

Provide safe fallbacks.

---

# Testing

At minimum verify:

- Start Fast
- End Fast
- History
- Statistics
- Export
- Notifications
- Widgets

before release.

---

# Security

Never store:

- Secrets
- Tokens
- Credentials

inside source code.

Assume repository is public.

---

# Future Features

Future roadmap exists in:

```text
/docs/04-future-roadmap.md
```

Do not implement future roadmap items unless requested.

---

# Decision Framework

When multiple solutions exist:

1. Prefer Expo solution.
2. Prefer simpler solution.
3. Prefer local-first solution.
4. Prefer privacy-first solution.
5. Prefer maintainable solution.

Long-term maintainability is more important than short-term speed.

---

# Definition of Done

A task is complete when:

- Requirements are implemented
- TypeScript passes
- App builds successfully
- iOS works
- Android works
- Existing functionality remains intact
- Widgets remain functional
- No obvious performance regressions exist

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
