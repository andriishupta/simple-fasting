import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HistoryDetailScreen from '@/app/history/[id]';
import {
  GoalDurationFormat,
  StorageKey,
  appStorage,
  createDefaultAppSettings,
  createEmptyActiveFastState,
} from '@/storage/app-storage';
import { refreshFastSnapshots } from '@/storage/fasting-storage';
import { refreshSettingsSnapshot, saveSettings } from '@/storage/settings-storage';
import { createHistory, createSession } from './fixtures';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'future-fast' }),
}));
jest.mock('@/components/fast-setup-controls', () => ({
  customGoalId: 'custom',
  FastGoalSelector: () => null,
  getGoalSelectionId: () => 'goal-16-hours',
  maxCustomDurationHours: 168,
  unlimitedGoalId: 'unlimited',
}));
jest.mock('@/components/native-date-time-field', () => ({ NativeDateTimeField: () => null }));
jest.mock('@/widgets/fasting-widget', () => ({ updateFastingWidget: jest.fn() }));
jest.mock('@/widgets/fasting-live-activity', () => ({ syncFastingLiveActivity: jest.fn() }));

describe('HistoryDetailScreen validation', () => {
  beforeEach(() => {
    const now = new Date('2026-06-21T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    appStorage.clear();
    saveSettings(createDefaultAppSettings(now.toISOString()));
    appStorage.insert(StorageKey.ActiveFast, createEmptyActiveFastState(now.toISOString()));
    appStorage.insert(
      StorageKey.History,
      createHistory([
        createSession({
          id: 'future-fast',
          startedAt: '2026-06-22T10:00:00.000Z',
          endedAt: '2026-06-22T11:00:00.000Z',
        }),
      ]),
    );
    refreshSettingsSnapshot();
    refreshFastSnapshots();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('presents edit validation through a native alert', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}>
        <HistoryDetailScreen />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Save fast' }));

    expect(alert).toHaveBeenCalledWith(
      'Check fast details',
      'Start time cannot be in the future.',
    );
    expect(screen.queryByText('Save failed')).not.toBeOnTheScreen();
  });

  test('uses the selected compact format for a saved fast duration', async () => {
    saveSettings({
      ...createDefaultAppSettings(new Date().toISOString()),
      goalDurationFormat: GoalDurationFormat.Days,
    });
    refreshSettingsSnapshot();

    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}>
        <HistoryDetailScreen />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('1h')).toBeOnTheScreen();
  });
});
