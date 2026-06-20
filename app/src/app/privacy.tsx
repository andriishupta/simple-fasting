import { LocalDocumentScreen, type LocalDocumentSection } from '@/components/local-document-screen';

const sections: readonly LocalDocumentSection[] = [
  {
    title: '1. Scope',
    paragraphs: [
      'This policy applies to the Simple Fasting mobile app and website. The app requires no account and is designed to work without a custom backend.',
    ],
  },
  {
    title: '2. Data in the app',
    paragraphs: [
      'Simple Fasting stores the data needed to operate locally on your device.',
      'The current app does not use accounts, advertising SDKs, analytics SDKs, cross-app tracking, or a Simple Fasting backend.',
    ],
    bullets: [
      'Active and completed fasting sessions, including start and end times.',
      'Fasting goals and optional notes you enter.',
      'Theme, accent, reminder, and widget preferences.',
      'Locally derived statistics, charts, and heatmaps.',
    ],
  },
  {
    title: '3. Permissions and system features',
    paragraphs: [
      'Notification permission is requested only when you enable reminders. Notifications are scheduled locally. Widgets and other supported system surfaces use local fasting state.',
    ],
  },
  {
    title: '4. Your controls',
    paragraphs: ['You control the data stored by Simple Fasting.'],
    bullets: [
      'Edit or delete completed fasting sessions.',
      'Export data in JSON or CSV format.',
      'Clear all local app data from Settings.',
      'Choose where exported files are saved or shared.',
    ],
  },
  {
    title: '5. Website and email',
    paragraphs: [
      'The website does not intentionally use analytics cookies, advertising trackers, or accounts. Hosting providers may process ordinary technical request information. If you email support, the email providers process the message so it can be delivered.',
    ],
  },
  {
    title: '6. Security and retention',
    paragraphs: [
      'No device or storage system is completely secure. Protect access to your device and exports. Because local app data is not sent to us, we cannot recover it for you.',
    ],
  },
  {
    title: '7. Children and health',
    paragraphs: [
      'Simple Fasting does not knowingly collect personal information from children. Fasting may be inappropriate for children and adolescents; consult a parent, guardian, or qualified healthcare professional.',
    ],
  },
  {
    title: '8. Changes and contact',
    paragraphs: [
      'This policy may change when the product or legal requirements change. Privacy questions can be sent to support@simplefasting.app.',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <LocalDocumentScreen
      meta="Effective June 19, 2026"
      intro="Simple Fasting is designed so your fasting data can remain on your device."
      sections={sections}
    />
  );
}
