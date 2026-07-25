import documents from '../content/generated/shared-documents.json';
import {
  bugReportSubject,
  createSupportMailto,
  supportEmailAddress,
  supportRequestSubject,
} from '../constants/contact';

const siteUrl = 'https://simplefasting.app';

const page = (path: string) => new URL(path, siteUrl).toString();

export function GET() {
  const content = `# Simple Fasting

> A privacy-first, local-first fasting tracker for iOS and Android.

Simple Fasting is a small mobile app for starting and tracking fasts, reviewing local history and statistics, using local reminders and supported widgets, and importing or exporting data. The app is being prepared for its first public release.

## Primary pages

- [Home](${page('/')}): Product overview, features, privacy model, and release availability.
- [Frequently Asked Questions](${page('/faq/')}): ${documents.faq.description}
- [What's New](${page('/whats-new/')}): ${documents.whatsNew.description}
- [Legal](${page('/legal/')}): Current legal documents for the app and website.
- [Privacy Policy](${page('/privacy/')}): ${documents.privacy.description}
- [Terms of Use](${page('/terms/')}): ${documents.terms.description}

## Product facts

- Platforms: iOS and Android.
- Core features: fasting timer, goals, history, statistics, local reminders, supported widgets, optional iOS Live Activities, and JSON or CSV data portability.
- Data model: fasting data and preferences stay on the device unless the user explicitly exports or shares them.
- Privacy: no account, backend, cloud sync, advertising, subscription, analytics SDK, installation identifier, or cross-app tracking.
- Availability: core fasting, history, statistics, reminders, widgets, and local help work offline.
- Scope: Simple Fasting is a general wellness tracking tool and does not provide medical advice, diagnosis, treatment, or emergency services.

## Contact

- Support: [${supportEmailAddress}](${createSupportMailto(supportRequestSubject)})
- Bug reports: [${supportEmailAddress}](${createSupportMailto(bugReportSubject)})
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
