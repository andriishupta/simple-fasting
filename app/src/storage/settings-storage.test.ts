jest.mock('@/storage/notification-storage', () => ({
  cancelScheduledNotification: jest.fn(),
  requestLocalNotificationPermission: jest.fn(),
  scheduleDailyReminderNotification: jest.fn(),
}));

import {
  AccentColorName,
  DataViewPreference,
  FastingGoalType,
  StorageKey,
  ThemePreference,
  appStorage,
  createDefaultAppSettings,
  createEmptyActiveFastState,
  createEmptyHistoryState,
} from '@/storage/app-storage';
import {
  SettingsExportFormat,
  createExportContent,
  createExportFilename,
  createFastingGoal,
  deleteFastingGoal,
  escapeCsvValue,
  getAccentPalette,
  getEffectiveColorScheme,
  getSettings,
  refreshSettingsSnapshot,
  saveSettings,
  setAccentColorName,
  setDailyReminderTimeAndSchedule,
  setDataViewPreference,
  setFastingGoalEnabled,
  setThemePreference,
  updateFastingGoal,
  updateNotificationSettings,
} from '@/storage/settings-storage';
import * as notificationStorage from '@/storage/notification-storage';
import { createSession } from '../../test/fixtures';

const timestamp = '2026-06-21T12:00:00.000Z';
const mockCancelScheduledNotification = jest.mocked(
  notificationStorage.cancelScheduledNotification,
);
const mockScheduleDailyReminderNotification = jest.mocked(
  notificationStorage.scheduleDailyReminderNotification,
);

describe('settings storage integration', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(timestamp));
    appStorage.clear();
    appStorage.insert(StorageKey.ActiveFast, createEmptyActiveFastState(timestamp));
    appStorage.insert(StorageKey.History, createEmptyHistoryState(timestamp));
    saveSettings(createDefaultAppSettings(timestamp));
    refreshSettingsSnapshot();
    mockCancelScheduledNotification.mockResolvedValue(undefined);
    mockScheduleDailyReminderNotification.mockResolvedValue('daily-1');
  });

  afterEach(() => jest.useRealTimers());

  test('persists appearance and data-view choices', () => {
    setThemePreference(ThemePreference.Dark);
    setAccentColorName(AccentColorName.Teal);
    setDataViewPreference(DataViewPreference.History);

    expect(getSettings()).toMatchObject({
      themePreference: ThemePreference.Dark,
      accentColorName: AccentColorName.Teal,
      dataViewPreference: DataViewPreference.History,
    });
    expect(appStorage.get(StorageKey.Settings)).toEqual(getSettings());
    expect(getEffectiveColorScheme({ themePreference: ThemePreference.System, systemColorScheme: null })).toBe('light');
    expect(getEffectiveColorScheme({ themePreference: ThemePreference.System, systemColorScheme: 'dark' })).toBe('dark');
    expect(getAccentPalette({ accentColorName: AccentColorName.Teal, colorScheme: 'dark' }).accent).toBe('#5EEAD4');
  });

  test('creates, updates, disables, and deletes custom goals while preserving invariants', () => {
    const goal = createFastingGoal({ name: 'Weekend', targetDurationHours: 24 });
    expect(goal.type).toBe(FastingGoalType.Custom);
    expect(getSettings().goals).toContainEqual(goal);

    const updated = updateFastingGoal({ goalId: goal.id, name: 'Weekend updated', targetDurationHours: 30 });
    expect(updated).toMatchObject({ name: 'Weekend updated', targetDurationHours: 30 });
    expect(updateFastingGoal({ goalId: 'goal-16-hours', name: 'No', targetDurationHours: 10 })).toBeUndefined();

    expect(setFastingGoalEnabled(goal.id, false)).toBe(true);
    expect(getSettings().goals.find(({ id }) => id === goal.id)?.isEnabled).toBe(false);
    expect(deleteFastingGoal(goal.id)).toBe(true);
    expect(deleteFastingGoal('goal-16-hours')).toBe(false);

    getSettings().goals.filter(({ isEnabled }) => isEnabled).slice(1).forEach(({ id }) => {
      expect(setFastingGoalEnabled(id, false)).toBe(true);
    });
    const onlyEnabled = getSettings().goals.find(({ isEnabled }) => isEnabled);
    expect(onlyEnabled).toBeDefined();
    expect(setFastingGoalEnabled(onlyEnabled!.id, false)).toBe(false);
  });

  test('reconciles daily reminders and suppresses them during an active fast', async () => {
    updateNotificationSettings((notifications) => ({
      ...notifications,
      dailyReminderEnabled: true,
      dailyReminderTime: '20:30',
      dailyReminderNotificationId: 'old',
    }));

    await setDailyReminderTimeAndSchedule('21:15');
    expect(mockCancelScheduledNotification).toHaveBeenCalledWith('old');
    expect(mockScheduleDailyReminderNotification).toHaveBeenCalledWith('21:15');
    expect(getSettings().notifications.dailyReminderNotificationId).toBe('daily-1');

    appStorage.insert(StorageKey.ActiveFast, {
      ...createEmptyActiveFastState(timestamp),
      session: createSession({ id: 'active', startedAt: timestamp, endedAt: null, status: 'active' as never }),
    });
    await setDailyReminderTimeAndSchedule('22:00');
    expect(getSettings().notifications.dailyReminderNotificationId).toBeNull();
  });

  test('creates deterministic JSON and escaped CSV exports', () => {
    appStorage.insert(StorageKey.History, {
      ...createEmptyHistoryState(timestamp),
      sessions: [
        createSession({ id: 'one', startedAt: timestamp, endedAt: '2026-06-21T20:00:00.000Z', reason: 'Dinner, "late"' }),
      ],
    });

    expect(createExportFilename(SettingsExportFormat.Json)).toBe('simple-fasting-export-2026-06-21.json');
    expect(escapeCsvValue('Dinner, "late"')).toBe('"Dinner, ""late"""');
    expect(JSON.parse(createExportContent(SettingsExportFormat.Json)).data).toHaveLength(1);
    const csv = createExportContent(SettingsExportFormat.Csv);
    expect(csv).toContain('exportedAt,appVersion,buildVersion,id,status');
    expect(csv).toContain('"Dinner, ""late"""');
  });
});
