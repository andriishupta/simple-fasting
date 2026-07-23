# Simple Fasting Agent Guide

## Read first

Before changing the repository, read:

1. This file.
2. `docs/dev/PRODUCT.md` for current product behavior and boundaries.
3. `docs/dev/RELEASE.md` for release work.
4. `docs/dev/FUTURE.md` when evaluating new scope.
5. The nearest directory-specific `AGENTS.md`.

The current implementation is the source of truth for behavior that exists.
Documentation is the source of truth for product intent and release
requirements. Resolve conflicts by inspecting both and choosing the smallest
consistent correction.

## Repository

```text
app/          Expo React Native app
www/          Static Astro website
docs/content/ Canonical legal, FAQ, and What's New content
docs/dev/     Product, release, and future-scope documents
scripts/      Shared content and website verification scripts
```

Simple Fasting is a local-first, offline-first fasting tracker. It intentionally
has no account, backend, sync, advertising, subscription, analytics SDK,
installation identifier, or cross-app tracking.

Keep the product small. Do not implement items from `FUTURE.md` unless the user
explicitly changes product direction.

## Shared content

Canonical user-facing content lives in:

- `docs/content/legal/privacy-policy.md`
- `docs/content/legal/terms-of-use.md`
- `docs/content/faq.md`
- `docs/content/whats-new.md`

Never edit generated `shared-documents.json` files. After editing canonical
Markdown, run:

```bash
node scripts/sync-shared-content.mjs
node scripts/sync-shared-content.mjs --check
```

Generated JSON is ignored and must not be committed. Keep synchronization in
the website `prebuild`, app Expo `prebuild`, and EAS
`eas-build-pre-install` lifecycle hooks.

## Privacy and security

- Fasting history, dates, durations, goals, notes, reminders, and exports stay
  local unless the user explicitly exports or shares them.
- Do not add accounts, remote storage, analytics, advertising, profiling,
  telemetry, installation IDs, push services, or reporting SDKs.
- Native Apple/Google crash and vitals reports may be used where those platforms
  provide them.
- Local diagnostics may leave the app only after explicit user action.
- Never commit secrets, credentials, certificates, provisioning profiles,
  keystores, or tokens.
- Any new remote data handling requires explicit approval, a privacy review, and
  updated legal documentation.

## Engineering principles

- Prefer the simplest readable solution.
- Keep TypeScript strict and explicit; prefer `type` aliases and immutable
  updates.
- Avoid `any`, unused code, speculative abstractions, compatibility layers for
  abandoned pre-release data, and unnecessary dependencies.
- Prefer Expo-compatible libraries and native platform controls.
- Use React state, context, and small hooks instead of a large state framework.
- Persist app data in typed, validated, versioned MMKV storage.
- Do not clear local data without approval.

The project remains pre-public until the first production release is explicitly
declared. Before that point, approved breaking storage changes are allowed.
Afterward, persisted schema changes require migrations and upgrade testing.

## App rules

- Keep startup fast and battery use low.
- Use local notifications only.
- Treat widgets and iOS Live Activities as first-class consumers of active fast,
  goals, history, and display settings.
- Native feature changes require fresh native builds; Expo Go is not sufficient.
- Keep Fast, Data, Settings, stack screens, onboarding, and widgets visually
  consistent.
- Prefer native navigation, safe areas, controls, gestures, and transitions.
- Avoid visual clutter, unnecessary animation, scrolling when content fits, and
  divider-heavy cards.
- Check both iOS and Android behavior.

## Website rules

- Keep Astro output static and minimize JavaScript.
- Do not add analytics, ads, trackers, account cookies, or unnecessary
  dependencies.
- Preserve SEO metadata, semantic HTML, accessibility, responsive layouts, and
  stable support/legal URLs.
- Cloudflare Pages is the production host. `www/wrangler.toml` must use
  `pages_build_output_dir` and must not define a Workers `main` entry.
- Website claims must match the shipped app and canonical shared content.

## Tests and CI

Keep the existing CI gates:

- app TypeScript, lint, unit, integration, and coverage checks;
- website shared-content check and production build verification;
- iOS and Android Expo bundle exports;
- the same Maestro flows on iOS and Android through EAS.

Do not commit generated coverage. When behavior changes, update the narrowest
useful test and the relevant primary E2E flow. Native widget, notification, and
store behavior still requires runtime verification.

## Definition of done

- Requested behavior or documentation is correct and focused.
- App TypeScript, lint, and relevant tests pass.
- Website verification passes when content or website files change.
- Shared content is synchronized from canonical Markdown.
- Documentation and website claims match the current app.
- iOS and Android implications were considered.
- No secrets, generated content, or unrelated files were added.
