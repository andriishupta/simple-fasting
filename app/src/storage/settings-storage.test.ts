import { Platform, Share } from 'react-native';

import {
  AccentColorName,
  DataViewPreference,
  FastStatus,
  FastingGoalType,
  GoalDurationFormat,
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
  completeNotificationOnboarding,
  deleteFastingGoal,
  escapeCsvValue,
  getAccentPalette,
  getEffectiveColorScheme,
  getSettings,
  moveFastingGoal,
  LocalNotificationPermissionState,
  refreshSettingsSnapshot,
  saveSettings,
  setAccentColorName,
  setGoalDurationFormat,
  setDailyReminderTimeAndSchedule,
  setDataViewPreference,
  setFastingGoalEnabled,
  setThemePreference,
  shareDataExport,
  syncNotificationPermissionState,
  updateFastingGoal,
  updateNotificationSettings,
} from '@/storage/settings-storage';
import * as notificationStorage from '@/storage/notification-storage';
import { updateFastingWidget } from '@/widgets/fasting-widget';
import { createSession } from '../../test/fixtures';

jest.mock('@/storage/notification-storage', () => ({
  cancelScheduledNotification: jest.fn(),
  getLocalNotificationPermissionState: jest.fn(),
  LocalNotificationPermissionState: {
    Granted: 'granted',
    Denied: 'denied',
    Undetermined: 'undetermined',
  },
  requestLocalNotificationPermission: jest.fn(),
  scheduleDailyReminderNotification: jest.fn(),
}));

jest.mock('@/widgets/fasting-widget', () => ({
  updateFastingWidget: jest.fn(),
}));

const timestamp = '2026-06-21T12:00:00.000Z';
const mockCancelScheduledNotification = jest.mocked(
  notificationStorage.cancelScheduledNotification,
);
const mockScheduleDailyReminderNotification = jest.mocked(
  notificationStorage.scheduleDailyReminderNotification,
);
const mockGetLocalNotificationPermissionState = jest.mocked(
  notificationStorage.getLocalNotificationPermissionState,
);
const mockRequestLocalNotificationPermission = jest.mocked(
  notificationStorage.requestLocalNotificationPermission,
);
const mockUpdateFastingWidget = jest.mocked(updateFastingWidget);

describe('settings storage integration', () => {
  const initialPlatform = Platform.OS;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(timestamp));
    appStorage.clear();
    appStorage.insert(StorageKey.ActiveFast, createEmptyActiveFastState(timestamp));
    appStorage.insert(StorageKey.History, createEmptyHistoryState(timestamp));
    saveSettings(createDefaultAppSettings(timestamp));
    refreshSettingsSnapshot();
    mockCancelScheduledNotification.mockResolvedValue(undefined);
    mockScheduleDailyReminderNotification.mockResolvedValue('daily-1');
    mockGetLocalNotificationPermissionState.mockResolvedValue(
      LocalNotificationPermissionState.Granted,
    );
    mockRequestLocalNotificationPermission.mockClear();
    mockRequestLocalNotificationPermission.mockResolvedValue(true);
    mockUpdateFastingWidget.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: initialPlatform });
    jest.restoreAllMocks();
  });

  test('persists appearance and data-view choices', () => {
    setThemePreference(ThemePreference.Dark);
    setAccentColorName(AccentColorName.Teal);
    setGoalDurationFormat(GoalDurationFormat.Days);
    setDataViewPreference(DataViewPreference.History);

    expect(getSettings()).toMatchObject({
      themePreference: ThemePreference.Dark,
      accentColorName: AccentColorName.Teal,
      goalDurationFormat: GoalDurationFormat.Days,
      dataViewPreference: DataViewPreference.History,
    });
    expect(mockUpdateFastingWidget).toHaveBeenCalledTimes(1);
    expect(appStorage.get(StorageKey.Settings)).toEqual(getSettings());
    expect(getEffectiveColorScheme({ themePreference: ThemePreference.System, systemColorScheme: 'light' })).toBe('light');
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

  test('persists goal ordering in settings', () => {
    const firstGoalId = getSettings().goals[0].id;
    moveFastingGoal(firstGoalId, 3);

    expect(getSettings().goals[3].id).toBe(firstGoalId);
    expect(appStorage.get(StorageKey.Settings)?.goals[3].id).toBe(firstGoalId);
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
      session: createSession({ id: 'active', startedAt: timestamp, endedAt: null, status: FastStatus.Active }),
    });
    await setDailyReminderTimeAndSchedule('22:00');
    expect(getSettings().notifications.dailyReminderNotificationId).toBeNull();
  });

  test('completes notification onboarding and enables only fast-end reminders when allowed', () => {
    completeNotificationOnboarding({ notificationsAllowed: true });

    expect(getSettings().notifications).toMatchObject({
      fastEndReminderEnabled: true,
      dailyReminderEnabled: false,
    });
    expect(getSettings()).toMatchObject({
      onboardingCompleted: true,
      notificationPromptShown: true,
    });
  });

  test('syncs denied OS notification permission without prompting', async () => {
    updateNotificationSettings((notifications) => ({
      ...notifications,
      fastEndReminderEnabled: true,
      dailyReminderEnabled: true,
      dailyReminderNotificationId: 'daily-1',
    }));
    mockGetLocalNotificationPermissionState.mockResolvedValue(
      LocalNotificationPermissionState.Denied,
    );

    await syncNotificationPermissionState();

    expect(mockRequestLocalNotificationPermission).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotification).toHaveBeenCalledWith('daily-1');
    expect(getSettings().notifications).toMatchObject({
      fastEndReminderEnabled: false,
      dailyReminderEnabled: false,
      dailyReminderNotificationId: null,
    });
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

  test('shares an export only after the user requests it', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

    await shareDataExport(SettingsExportFormat.Json);

    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'simple-fasting-export-2026-06-21.json',
      message: expect.stringContaining('"data": []'),
    }));
  });
});
