import { LocalDocumentScreen, type LocalDocumentSection } from '@/components/local-document-screen';

const sections: readonly LocalDocumentSection[] = [
  {
    title: 'Does Simple Fasting need an account?',
    paragraphs: ['No. The app does not require registration, a login, or personal information.'],
  },
  {
    title: 'Does it work offline?',
    paragraphs: [
      'Yes. Timing, history, statistics, reminders, widgets, and settings work without a network connection.',
    ],
  },
  {
    title: 'Where is my data stored?',
    paragraphs: ['Your active fast, settings, goals, and history are stored locally on your device.'],
  },
  {
    title: 'Can I export my data?',
    paragraphs: [
      'Yes. Create a JSON or CSV export from Settings, then save or share it using the system share sheet.',
    ],
  },
  {
    title: 'Can Simple Fasting recover deleted data?',
    paragraphs: [
      'No. Simple Fasting has no account or cloud copy. Export data you want to keep before clearing storage or uninstalling the app.',
    ],
  },
  {
    title: 'Is Simple Fasting medical advice?',
    paragraphs: [
      'No. It is a tracking tool, not medical or nutrition advice. Consult a qualified healthcare professional if fasting may affect your health.',
    ],
  },
];

export default function FaqScreen() {
  return (
    <LocalDocumentScreen
      intro="This copy is stored inside the app and remains available offline."
      sections={sections}
    />
  );
}
