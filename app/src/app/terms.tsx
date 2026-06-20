import { LocalDocumentScreen, type LocalDocumentSection } from '@/components/local-document-screen';

const sections: readonly LocalDocumentSection[] = [
  {
    title: '1. Acceptance',
    paragraphs: [
      'By downloading, accessing, or using Simple Fasting, you agree to these Terms of Use and the Privacy Policy. If you do not agree, do not use the app or website.',
    ],
  },
  {
    title: '2. Health and medical disclaimer',
    paragraphs: [
      'Simple Fasting is a tracking tool. It does not provide medical advice, diagnosis, treatment, nutrition advice, or emergency services.',
      'Consult a qualified healthcare professional before fasting, particularly if you are pregnant or breastfeeding, under 18, have a medical condition, take medication, or have a history of an eating disorder. Stop fasting and seek care if you feel unwell.',
    ],
  },
  {
    title: '3. Permission to use the app',
    paragraphs: [
      'Subject to these terms and applicable store rules, you receive limited permission to install and use Simple Fasting for lawful personal purposes.',
    ],
  },
  {
    title: '4. Acceptable use',
    paragraphs: ['Do not use the app unlawfully, harm others, misrepresent it as medical advice, or interfere with its operation or security.'],
  },
  {
    title: '5. Local data and backups',
    paragraphs: [
      'You are responsible for access to your device and exports you wish to keep. Clearing data, uninstalling the app, device loss, or storage failure may result in data loss that we cannot recover.',
    ],
  },
  {
    title: '6. Stores and third-party services',
    paragraphs: [
      'App stores, operating systems, email providers, export destinations, and external websites are operated by others and governed by their own terms and privacy policies.',
    ],
  },
  {
    title: '7. Availability and warranties',
    paragraphs: [
      'The app and website are provided on an as-available basis. We do not promise uninterrupted operation, perfect accuracy, universal device compatibility, or preservation of local data.',
    ],
  },
  {
    title: '8. Liability',
    paragraphs: [
      'To the extent permitted by law, Simple Fasting and its contributors are not liable for indirect or consequential losses arising from use of the app, including health decisions, missed notifications, or local data loss.',
    ],
  },
  {
    title: '9. Changes and contact',
    paragraphs: [
      'These terms may be updated with a revised effective date. Questions can be sent to support@simplefasting.app.',
    ],
  },
];

export default function TermsScreen() {
  return (
    <LocalDocumentScreen
      meta="Effective June 19, 2026"
      intro="These terms govern your use of the Simple Fasting mobile app and website."
      sections={sections}
    />
  );
}
