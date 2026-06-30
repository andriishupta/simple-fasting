# Simple Fasting — Release and Deployment Guide

This guide records the current native configuration and the remaining release work. Verify current Apple, Google, and Expo requirements in their official documentation before submission.

## Current Configuration

| Setting | Value |
| --- | --- |
| Expo name | Simple Fasting |
| Expo slug | `simple-fasting-app` |
| App version | `1.0.0` |
| URL scheme | `simple-fasting` |
| iOS bundle identifier | `app.simplefasting` |
| Android package | `app.simplefasting` |
| Orientation | Portrait |
| Expo SDK | 56 |
| Web output | Static, for development/verification |

The Expo configuration is linked to an EAS project. Development, preview, production, and credential-free E2E profiles are committed in `app/eas.json`.

## Native Dependency Reality

The complete app is not an Expo Go-only project. MMKV, native widgets, notifications, and the generated iOS project require development or release builds for full verification.

- iOS native project currently exists in `app/ios`.
- Android native output should be generated or built through the chosen Expo/EAS workflow when Android validation begins.
- Do not edit generated native code when an Expo config plugin or app configuration can express the same change.

## Preflight Checks

From `/app`:

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm test:coverage
pnpm exec expo export --platform ios --output-dir /tmp/simple-fasting-ios
pnpm exec expo export --platform android --output-dir /tmp/simple-fasting-android
pnpm exec expo export --platform web --output-dir /tmp/simple-fasting-web
```

Static export confirms bundling but does not replace native runtime testing.

For widgets, install a newly generated native build rather than Expo Go or a JavaScript-only update. Confirm the iOS extension target/App Group and Android receiver/provider XML exist after prebuild, launch the app once, and use a simulator/emulator launcher with widget-picker support. Uninstall stale pre-plugin builds before retesting widget discovery.

## Automated CI and E2E

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`, using Node 24-compatible GitHub Actions. It gates the faster app and website quality checks first: app shared-content verification, TypeScript, lint, unit tests, and website shared-content/build verification. After those pass, it runs app integration tests and Jest coverage. Independent iOS/Android Expo bundle exports run last after the deeper app checks and website quality check pass.

On pushes to `main`, the website quality job also uploads the built `www/dist` output as a GitHub Actions artifact. This artifact is an auditable copy of the static site produced from `main`; it is not a production deploy by itself.

`app/.eas/workflows/e2e.yml` is schema-validated against Expo's current workflow schema. For app-related pull requests it creates credential-free iOS simulator and Android APK builds, then runs every flow in `app/.maestro` on both platforms. These flows cover planned and open-ended fasting, save/cancel behavior, history/edit navigation, custom goals, Settings, and offline legal/FAQ content. EAS project access and build quota are operational prerequisites.

## CI/CD Ownership

Use separate deployment owners rather than forcing the app and website through one tool:

- GitHub Actions owns deterministic repository gates and website artifacts.
- EAS owns native app builds, native E2E, signing, TestFlight/internal-track builds, and store upload automation.
- Cloudflare Pages owns the production website.

Do not use Expo web output as the production marketing/legal website. Expo web export remains a bundling check for the app. Do not use Cloudflare Pages to build or submit native app binaries.

## Website Release

Production website deploys should be manual until the native release process is intentionally automated. After the Expo/EAS app release is approved or shipped, run `.github/workflows/www-release.yml` from GitHub Actions:

1. Select `main` unless releasing a specific reviewed ref.
2. Leave `deploy_to_cloudflare` off to create only a `www-dist` artifact.
3. Enable `deploy_to_cloudflare` to deploy the built artifact to Cloudflare Pages.

The Cloudflare deploy step requires repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow uses the `cloudflare_project_name` input, defaulting to `simple-fasting`. If the Cloudflare Pages project uses a different name, provide that name when running the workflow.

Configure the GitHub `website-production` environment with manual approval if production website deploys should require a second human confirmation.

Legal, FAQ, and What's New changes are special because the app also renders offline copies:

- website-only copy fix: deploy Cloudflare Pages after website verification;
- shared legal/FAQ/What's New change visible in the app: release through a new native build, or through EAS Update only after `expo-updates` is explicitly added, reviewed for privacy impact, and documented;
- legal version change requiring renewed consent: ship app logic and content together so the app can compare the accepted legal version with the current legal version.

## Required Runtime Test Matrix

### Shared flows

- fresh launch selects `16:8`;
- selecting another goal persists without starting a fast;
- start, background, resume, end, and cancel;
- custom duration boundaries, including seven days;
- optional note;
- history creation, edit, and delete;
- statistics and chart recalculation;
- JSON and CSV export;
- clear-data confirmation and recovery;
- offline FAQ, Privacy Policy, and Terms;
- light, dark, and system themes;
- multiple accent colors and accessibility labels.

### Notifications

- permission denied and granted states;
- fast-end notification scheduling and cancellation;
- daily reminder scheduling and time changes;
- startup reconciliation after app termination;
- no stale notification after ending/cancelling/clearing a fast.

### Widgets

- inactive and active small widget states;
- elapsed timer and goal/open-ended label;
- refresh after start, end, cancel, and clear data;
- tap opens the app through `simple-fasting://`;
- widget failure never blocks fasting-state persistence;
- light and dark widget appearance.

### Devices

- at least one current iPhone and one smaller iPhone layout;
- at least one current Android phone and one smaller Android layout;
- large accessibility text where practical;
- app restart during an active long-running fast.

## EAS and Signing Work

Before TestFlight or Google Play testing:

1. Review the committed `eas.json` profiles for the intended release channel.
2. Confirm Expo owner/project linkage and EAS workflow access.
3. Confirm iOS signing, capabilities, widget target, bundle identifiers, and App Group requirements generated by the widget tooling.
4. Confirm Android signing and widget provider configuration.
5. Build preview binaries and run the complete native test matrix.
6. Only then create production builds.

Never commit certificates, provisioning profiles, keystores, passwords, tokens, or service credentials.

## Store Assets and Metadata

Required before submission:

- final app icon and adaptive Android icon review;
- splash-screen review;
- iPhone and Android screenshots;
- product description, subtitle/short description, keywords/tags, and category;
- privacy policy URL;
- terms URL where required;
- support URL and support email;
- final legal provider/controller name, postal address, contact phone, and governing jurisdiction inserted after entity and distribution decisions are complete;
- qualified legal review of Privacy Policy and Terms for launch countries, including U.S. consumer, health-app, children, sanctions/export-control, and app-store requirements;
- honest privacy/data-safety declarations reflecting no analytics SDK, no installation identifier, native Apple/Google platform crash reporting, user-shared local diagnostics, and no accounts, backend, advertising, cross-app tracking, or health-data transmission;
- release notes and version number.

Do not advertise medium/large widgets, iOS lock-screen widgets, Android ongoing notifications, bulk history actions, sync, or payments until they exist and have been tested.

## Release Sequence

1. Freeze v1 scope.
2. Run TypeScript, lint, unit tests, and static exports.
3. Build and test native preview binaries.
4. Test notifications and widgets on real/native environments.
5. Capture final store screenshots from release-equivalent builds.
6. Submit to TestFlight and Google Play internal testing.
7. Fix release-blocking issues without adding unrelated features.
8. Submit production builds.
9. After the project is explicitly declared public/production, require explicit storage migrations for every persisted schema change.

## Release Criteria

- Core fasting works completely offline.
- Active fast survives restart and backgrounding.
- History remains the statistics source of truth.
- Local notifications reconcile reliably.
- Small widgets and iOS Live Activities reflect active/inactive state.
- Export and clear-data flows work.
- No account, advertising, cross-app tracking, analytics SDK, telemetry backend, installation identifier, or backend dependency is introduced; native platform crash/vitals reporting and optional user-shared diagnostics never block core features.
- Store copy matches the actual shipped feature set.
