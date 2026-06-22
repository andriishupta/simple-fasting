import { render } from '@testing-library/react-native';

import { LocalDocumentScreen } from '@/components/local-document-screen';
import { sharedDocuments } from '@/content/shared-documents';

describe('LocalDocumentScreen shared-content integration', () => {
  test('renders canonical legal metadata, sections, paragraphs, and lists', async () => {
    const screen = await render(<LocalDocumentScreen document={sharedDocuments.privacy} />);

    expect(screen.getByText('Effective 2026-06-21 · Version 1.2')).toBeOnTheScreen();
    expect(screen.getByText('3. No accounts, tracking, advertising, or sale')).toBeOnTheScreen();
    expect(screen.getByText(/up to 50 recent diagnostic events/)).toBeOnTheScreen();
    expect(screen.getByText(/Active and completed fasting sessions/)).toBeOnTheScreen();
  });

  test('renders the version-only FAQ metadata and diagnostic answer', async () => {
    const screen = await render(<LocalDocumentScreen document={sharedDocuments.faq} />);

    expect(screen.getByText('Version 1.2')).toBeOnTheScreen();
    expect(screen.getByText('Does the app collect crash or diagnostic information?')).toBeOnTheScreen();
    expect(screen.getByText(/Nothing is sent unless you choose that option and a destination/)).toBeOnTheScreen();
  });
});
