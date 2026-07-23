import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';

import { LocalDocumentScreen } from '@/components/local-document-screen';
import { sharedDocuments } from '@/content/shared-documents';

const renderLocalDocument = (document: ComponentProps<typeof LocalDocumentScreen>['document']) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}>
      <LocalDocumentScreen document={document} />
    </SafeAreaProvider>,
  );

describe('LocalDocumentScreen shared-content integration', () => {
  test('renders canonical legal metadata, sections, paragraphs, and lists', async () => {
    const screen = await renderLocalDocument(sharedDocuments.privacy);

    expect(screen.getByText('Effective 2026-07-23 - Version 1.0')).toBeOnTheScreen();
    expect(screen.getByText('3. Analytics and native crash reporting')).toBeOnTheScreen();
    expect(screen.getByText(/does not use an analytics SDK/)).toBeOnTheScreen();
    expect(screen.getByText(/up to 50 recent diagnostic events/)).toBeOnTheScreen();
    expect(screen.getByText(/Active and completed fasting sessions/)).toBeOnTheScreen();
  });

  test('renders the version-only FAQ metadata and diagnostic answer', async () => {
    const screen = await renderLocalDocument(sharedDocuments.faq);

    expect(screen.getByText('Version 1.0')).toBeOnTheScreen();
    expect(screen.getByText('Does the app collect crash or diagnostic information?')).toBeOnTheScreen();
    expect(screen.getByText(/That file is not shared unless you choose it and a destination/)).toBeOnTheScreen();
  });

  test("renders what's new release notes", async () => {
    const screen = await renderLocalDocument(sharedDocuments.whatsNew);

    expect(screen.getAllByText('Version 1.0.0')).toHaveLength(2);
    expect(screen.getByText(/Initial release of Simple Fasting/)).toBeOnTheScreen();
    expect(screen.getByText(/Start and track active fasts/)).toBeOnTheScreen();
  });
});
