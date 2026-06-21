import { render } from '@testing-library/react-native';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { DiagnosticEventKind, appStorage } from '@/storage/app-storage';
import { getDiagnostics } from '@/storage/diagnostic-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

function BrokenScreen(): never {
  throw new Error('Render failed');
}

describe('AppErrorBoundary', () => {
  test('shows a recoverable fallback and stores a local render diagnostic', async () => {
    appStorage.clear();
    initializeAppStorage();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const screen = await render(
        <AppErrorBoundary>
          <BrokenScreen />
        </AppErrorBoundary>,
      );

      expect(screen.getByText('Simple Fasting stopped unexpectedly')).toBeOnTheScreen();
      expect(getDiagnostics().events).toEqual([
        expect.objectContaining({ kind: DiagnosticEventKind.Render, message: 'Render failed' }),
      ]);
    } finally {
      consoleError.mockRestore();
    }
  });
});
