import { Linking, Platform, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';

import { Colors } from '@/constants/theme';
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
  acceptLegalConsent,
  createExportContent,
  createExportFilename,
  createFastingGoal,
  completeNotificationOnboarding,
  deleteFastingGoal,
  escapeCsvValue,
  getAccentPalette,
  getEffectiveColorScheme,
  getSettings,
  getStoreReviewUrlForPlatform,
  mergeImportedSettings,
  moveFastingGoal,
  LocalNotificationPermissionState,
  openBugReportEmail,
  openFaq,
  openPrivacyPolicy,
  openRateApp,
  openSupportEmail,
  openTerms,
  openWebsite,
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
  updateNotificationSettingsAndSchedule,
  updateFastingGoal,
  updateNotificationSettings,
} from '@/storage/settings-storage';
import * as notificationStorage from '@/storage/notification-storage';
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

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
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

const relativeLuminance = (hexColor: string): number => {
  const value = Number.parseInt(hexColor.slice(1), 16);
  const channels = [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
  ].map((channel) => {
    const scaled = channel / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrastRatio = (firstColor: string, secondColor: string): number => {
  const [lighter, darker] = [relativeLuminance(firstColor), relativeLuminance(secondColor)].sort(
    (first, second) => second - first,
  );

  return (lighter + 0.05) / (darker + 0.05);
};

const createDeferred = <Value>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

describe('settings storage integration', () => {
  const initialPlatform = Platform.OS;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(timestamp));
    appStorage.clear();
    appStorage.insert(StorageKey.ActiveFast, createEmptyActiveFastState(timestamp));
    appStorage.insert(StorageKey.History, createEmptyHistoryState(timestamp));
    saveSettings(createDefaultAppSettings(timestamp));
    refreshSettingsSnapshot();
    mockCancelScheduledNotification.mockReset();
    mockScheduleDailyReminderNotification.mockReset();
    mockCancelScheduledNotification.mockResolvedValue(undefined);
    mockScheduleDailyReminderNotification.mockResolvedValue('daily-1');
    mockGetLocalNotificationPermissionState.mockResolvedValue(
      LocalNotificationPermissionState.Granted,
    );
    mockRequestLocalNotificationPermission.mockClear();
    mockRequestLocalNotificationPermission.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: initialPlatform });
    jest.restoreAllMocks();
  });

  test('updates appearance and data-view choices immediately', () => {
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
    expect(getEffectiveColorScheme({ themePreference: ThemePreference.Light, systemColorScheme: 'dark' })).toBe('light');
    expect(getEffectiveColorScheme({ themePreference: ThemePreference.Dark, systemColorScheme: 'light' })).toBe('dark');
    expect(appStorage.get(StorageKey.Settings)).toEqual(getSettings());
    expect(getEffectiveColorScheme({ themePreference: ThemePreference.System, systemColorScheme: 'light' })).toBe('light');
    expect(getEffectiveColorScheme({ themePreference: ThemePreference.System, systemColorScheme: 'dark' })).toBe('dark');
    expect(getAccentPalette({ accentColorName: AccentColorName.Teal, colorScheme: 'dark' }).accent).toBe('#2DD4BF');
  });

  test('keeps dark accent palettes readable while preserving the accepted light palette', () => {
    Object.values(AccentColorName).forEach((accentColorName) => {
      const palette = getAccentPalette({ accentColorName, colorScheme: 'dark' });

      expect(contrastRatio(palette.accent, Colors.dark.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.accent, Colors.dark.backgroundElement)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.accentForeground, palette.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.accent, palette.accentBackground)).toBeGreaterThanOrEqual(4.5);
    });

    expect(getAccentPalette({ accentColorName: AccentColorName.Amber, colorScheme: 'light' })).toEqual({
      accent: '#B45309',
      accentBackground: '#FEF3C7',
      accentBorder: '#FCD34D',
      accentForeground: '#FFFFFF',
    });
    expect(getAccentPalette({ accentColorName: AccentColorName.Rose, colorScheme: 'light' })).toEqual({
      accent: '#BE123C',
      accentBackground: '#FFE4E6',
      accentBorder: '#FDA4AF',
      accentForeground: '#FFFFFF',
    });
    expect(contrastRatio(
      getAccentPalette({ accentColorName: AccentColorName.Rose, colorScheme: 'light' }).accent,
      Colors.light.background,
    )).toBeGreaterThanOrEqual(4.5);
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
    expect(setFastingGoalEnabled('missing-goal', true)).toBe(false);

    getSettings().goals.filter(({ isEnabled }) => isEnabled).forEach(({ id }) => {
      expect(setFastingGoalEnabled(id, false)).toBe(true);
    });
    expect(getSettings().goals.every(({ isEnabled }) => !isEnabled)).toBe(true);
  });

  test('updates and persists goal ordering immediately', () => {
    const firstGoalId = getSettings().goals[0].id;
    moveFastingGoal(firstGoalId, 3);

    expect(getSettings().goals[3].id).toBe(firstGoalId);
    expect(appStorage.get(StorageKey.Settings)?.goals[3].id).toBe(firstGoalId);
  });

  test('moves last-used goal to an enabled fallback when deleting it', () => {
    const goal = createFastingGoal({ name: 'Short', targetDurationHours: 10 });
    setDataViewPreference(DataViewPreference.History);
    updateFastingGoal({ goalId: goal.id, name: goal.name, targetDurationHours: 11 });
    setGoalDurationFormat(GoalDurationFormat.Days);
    const updatedGoal = getSettings().goals.find((candidate) => candidate.id === goal.id)!;
    saveSettings({
      ...getSettings(),
      lastUsedGoalDurationHours: updatedGoal.targetDurationHours,
    });
    refreshSettingsSnapshot();

    expect(deleteFastingGoal(updatedGoal.id)).toBe(true);
    expect(getSettings().lastUsedGoalDurationHours).toBe(16);
  });

  test('keeps goal ordering stable for invalid moves and appends new goals', () => {
    const originalOrder = getSettings().goals.map((goal) => goal.id);

    moveFastingGoal('missing-goal', 1);
    moveFastingGoal(originalOrder[0], Number.NaN);
    moveFastingGoal(originalOrder[0], Number.POSITIVE_INFINITY);
    expect(getSettings().goals.map((goal) => goal.id)).toEqual(originalOrder);

    const customGoal = createFastingGoal({ name: 'Late shift', targetDurationHours: 20 });
    expect(getSettings().goals.at(-1)?.id).toBe(customGoal.id);

    moveFastingGoal(customGoal.id, -100);
    expect(getSettings().goals[0].id).toBe(customGoal.id);

    moveFastingGoal(customGoal.id, 10_000);
    expect(getSettings().goals.at(-1)?.id).toBe(customGoal.id);
  });

  test('reconciles daily reminders and suppresses them during an active fast', async () => {
    updateNotificationSettings((notifications) => ({
      ...notifications,
      dailyReminderEnabled: true,
      dailyReminderTime: '20:30',
      dailyReminderNotificationId: 'old',
    }));

    await setDailyReminderTimeAndSchedule('21:15');
    expect(getSettings().notifications.dailyReminderTime).toBe('21:15');
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

  test('cancels a late daily reminder after the reminder is toggled off', async () => {
    const deferredSchedule = createDeferred<string | null>();
    mockScheduleDailyReminderNotification.mockReturnValueOnce(deferredSchedule.promise);

    const enablePromise = updateNotificationSettingsAndSchedule((notifications) => ({
      ...notifications,
      dailyReminderEnabled: true,
      dailyReminderTime: '20:00',
    }));
    await Promise.resolve();
    expect(getSettings().notifications.dailyReminderEnabled).toBe(true);
    expect(getSettings().notifications.dailyReminderNotificationId).toBeNull();

    await updateNotificationSettingsAndSchedule((notifications) => ({
      ...notifications,
      dailyReminderEnabled: false,
    }));
    expect(getSettings().notifications.dailyReminderEnabled).toBe(false);
    expect(getSettings().notifications.dailyReminderNotificationId).toBeNull();

    deferredSchedule.resolve('late-daily');
    await enablePromise;

    expect(getSettings().notifications.dailyReminderEnabled).toBe(false);
    expect(getSettings().notifications.dailyReminderNotificationId).toBeNull();
    expect(mockCancelScheduledNotification).toHaveBeenCalledWith('late-daily');
  });

  test('completes notification onboarding and enables only fast-end reminders when allowed', () => {
    expect(getSettings().legalConsentAccepted).toBe(false);
    acceptLegalConsent();
    expect(getSettings().legalConsentAccepted).toBe(true);

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
    appStorage.insert(StorageKey.ActiveFast, {
      ...createEmptyActiveFastState(timestamp),
      session: createSession({
        id: 'active',
        startedAt: timestamp,
        endedAt: null,
        status: FastStatus.Active,
      }),
      fastEndNotificationId: 'fast-end-1',
      fastEndReminderEnabled: true,
    });
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
    expect(mockCancelScheduledNotification).toHaveBeenCalledWith('fast-end-1');
    expect(getSettings().notifications).toMatchObject({
      fastEndReminderEnabled: false,
      dailyReminderEnabled: false,
      dailyReminderNotificationId: null,
    });
    expect(appStorage.get(StorageKey.ActiveFast)).toMatchObject({
      fastEndNotificationId: null,
      fastEndReminderEnabled: false,
    });
  });

  test('creates deterministic JSON and escaped CSV exports', () => {
    setThemePreference(ThemePreference.Dark);
    setAccentColorName(AccentColorName.Teal);
    setGoalDurationFormat(GoalDurationFormat.Days);
    updateNotificationSettings((notifications) => ({
      ...notifications,
      dailyReminderEnabled: true,
      dailyReminderTime: '20:30',
      dailyReminderNotificationId: 'local-only',
    }));
    const customGoal = createFastingGoal({ name: 'Weekend', targetDurationHours: 24 });
    appStorage.insert(StorageKey.History, {
      ...createEmptyHistoryState(timestamp),
      sessions: [
        createSession({ id: 'one', startedAt: timestamp, endedAt: '2026-06-21T20:00:00.000Z', reason: 'Dinner, "late"' }),
      ],
    });

    expect(createExportFilename(SettingsExportFormat.Json)).toBe('simple-fasting-export-2026-06-21.json');
    expect(escapeCsvValue('Dinner, "late"')).toBe('"Dinner, ""late"""');
    const json = JSON.parse(createExportContent(SettingsExportFormat.Json)) as {
      data?: unknown;
      sessions?: unknown[];
      settings?: {
        accentColorName?: unknown;
        dataViewPreference?: unknown;
        goalDurationFormat?: unknown;
        goals?: unknown[];
        notifications?: {
          dailyReminderEnabled?: unknown;
          dailyReminderNotificationId?: unknown;
          dailyReminderTime?: unknown;
        };
        themePreference?: unknown;
      };
    };
    expect(json.sessions).toHaveLength(1);
    expect(json.data).toBeUndefined();
    expect(json.settings).toMatchObject({
      themePreference: ThemePreference.Dark,
      accentColorName: AccentColorName.Teal,
      goalDurationFormat: GoalDurationFormat.Days,
      notifications: {
        dailyReminderEnabled: true,
        dailyReminderTime: '20:30',
      },
    });
    expect(json.settings?.goals).toEqual(expect.arrayContaining([expect.objectContaining({ id: customGoal.id })]));
    expect(json.settings?.dataViewPreference).toBeUndefined();
    expect(json.settings?.notifications?.dailyReminderNotificationId).toBeUndefined();
    const csv = createExportContent(SettingsExportFormat.Csv);
    expect(csv).toContain('exportedAt,appVersion,buildVersion,id,status,startedAt,endedAt,goalDurationHours,note');
    expect(csv).toContain('"Dinner, ""late"""');
  });

  test('merges imported settings without restoring transient UI state or notification ids', () => {
    setDataViewPreference(DataViewPreference.History);
    updateNotificationSettings((notifications) => ({
      ...notifications,
      dailyReminderNotificationId: 'daily-1',
    }));

    const importedGoal = {
      id: 'goal-weekend',
      kind: 'duration',
      type: FastingGoalType.Custom,
      name: 'Weekend',
      targetDurationHours: 30,
      isEnabled: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mergeImportedSettings({
      themePreference: ThemePreference.Dark,
      accentColorName: AccentColorName.Purple,
      dataViewPreference: DataViewPreference.Stats,
      goals: [importedGoal],
      lastUsedGoalDurationHours: 30,
      goalDurationFormat: GoalDurationFormat.Days,
      notifications: {
        dailyReminderEnabled: true,
        dailyReminderTime: '21:00',
        dailyReminderNotificationId: 'from-export',
      },
    });

    expect(getSettings()).toMatchObject({
      themePreference: ThemePreference.Dark,
      accentColorName: AccentColorName.Purple,
      lastUsedGoalDurationHours: 30,
      goalDurationFormat: GoalDurationFormat.Days,
      dataViewPreference: DataViewPreference.History,
    });
    expect(getSettings().goals).toEqual(expect.arrayContaining([expect.objectContaining({ id: importedGoal.id })]));
    expect(getSettings().notifications).toMatchObject({
      dailyReminderEnabled: true,
      dailyReminderTime: '21:00',
      dailyReminderNotificationId: null,
    });
  });

  test('shares an export only after the user requests it', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

    await shareDataExport(SettingsExportFormat.Json);

    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'simple-fasting-export-2026-06-21.json',
      message: expect.stringContaining('"sessions": []'),
    }));
  });

  test('uses the native share sheet for export files when available', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const isAvailable = jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    const shareAsync = jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);

    await shareDataExport(SettingsExportFormat.Csv);

    expect(isAvailable).toHaveBeenCalled();
    expect(shareAsync).toHaveBeenCalledWith(
      expect.stringContaining('simple-fasting-export-2026-06-21.csv'),
      expect.objectContaining({ mimeType: 'text/csv' }),
    );
  });

  test('resolves configured platform review links', () => {
    const extra = {
      storeLinks: {
        appStoreReview: 'itms-apps://apps.apple.com/app/id123?action=write-review',
        playStoreReview: 'market://details?id=app.simplefasting',
      },
    };

    expect(getStoreReviewUrlForPlatform({ extra, platform: 'ios' })).toBe(
      'itms-apps://apps.apple.com/app/id123?action=write-review',
    );
    expect(getStoreReviewUrlForPlatform({ extra, platform: 'android' })).toBe(
      'market://details?id=app.simplefasting',
    );
    expect(getStoreReviewUrlForPlatform({ extra, platform: 'web' })).toBeNull();
  });

  test('opens support, bug, website, and legal links through platform APIs', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const openBrowser = jest.spyOn(WebBrowser, 'openBrowserAsync').mockResolvedValue({
      type: 'opened',
    } as never);

    await openSupportEmail();
    await openBugReportEmail();
    await openWebsite();
    await openFaq();
    await openPrivacyPolicy();
    await openTerms();

    expect(openUrl).toHaveBeenCalledWith(
      'mailto:support@simplefasting.app?subject=%5BSUPPORT%5D%20Simple%20Fasting%3A%20Support%20request',
    );
    expect(openUrl).toHaveBeenCalledWith(
      'mailto:bugs@simplefasting.app?subject=%5BBUG%5D%20Simple%20Fasting%3A%20Bug%20report',
    );
    expect(openBrowser).toHaveBeenCalledWith('https://simplefasting.app');
    expect(openBrowser).toHaveBeenCalledWith('https://simplefasting.app/faq');
    expect(openBrowser).toHaveBeenCalledWith('https://simplefasting.app/privacy');
    expect(openBrowser).toHaveBeenCalledWith('https://simplefasting.app/terms');
  });

  test('does not open a store review link when none is configured', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    openUrl.mockClear();

    await openRateApp();

    expect(openUrl).not.toHaveBeenCalled();
  });
});
