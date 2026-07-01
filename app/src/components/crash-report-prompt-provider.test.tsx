import { render, waitFor } from '@testing-library/react-native';
import { Alert, Text, type AlertButton } from 'react-native';

import { CrashReportPromptProvider } from '@/components/crash-report-prompt-provider';
import { DiagnosticEventKind } from '@/storage/app-storage';
import { recordDiagnosticError } from '@/storage/diagnostic-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));
jest.mock('@/widgets/fasting-widget', () => ({ updateFastingWidget: jest.fn() }));
jest.mock('@/widgets/fasting-live-activity', () => ({
  syncFastingLiveActivity: jest.fn(),
}));

describe('CrashReportPromptProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('offers clear data as the last repeated-crash action behind a second warning', async () => {
    initializeAppStorage();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const nowMs = Date.now();

    recordDiagnosticError({
      kind: DiagnosticEventKind.FatalJs,
      error: new Error('one'),
      occurredAt: new Date(nowMs - 50_000).toISOString(),
    });
    recordDiagnosticError({
      kind: DiagnosticEventKind.FatalJs,
      error: new Error('two'),
      occurredAt: new Date(nowMs - 30_000).toISOString(),
    });
    recordDiagnosticError({
      kind: DiagnosticEventKind.FatalJs,
      error: new Error('three'),
      occurredAt: new Date(nowMs - 10_000).toISOString(),
    });

    render(
      <CrashReportPromptProvider>
        <Text>App</Text>
      </CrashReportPromptProvider>,
    );

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    const firstButtons = alert.mock.calls[0][2] as AlertButton[];

    expect(firstButtons.at(-1)).toEqual(expect.objectContaining({
      text: 'Clear Data',
      style: 'destructive',
    }));

    firstButtons.at(-1)?.onPress?.();

    expect(alert).toHaveBeenCalledTimes(2);
    expect(alert.mock.calls[1]).toEqual([
      'Reset local data?',
      expect.stringContaining('cannot open normally'),
      [
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Clear Data', style: 'destructive' }),
      ],
    ]);
  });
});
