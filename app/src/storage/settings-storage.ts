import { useSyncExternalStore } from 'react';
import { Linking, Platform, Share, type ColorSchemeName } from 'react-native';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import {
  appStorage,
  createDefaultAppSettings,
  StorageKey,
  AccentColorName,
  FastingGoalType,
  GoalKind,
  ThemePreference,
  type AccentColorName as AccentColorNameType,
  type AppSettings,
  type DataViewPreference as DataViewPreferenceType,
  type FastingGoal,
  type NotificationSettings,
  type ThemePreference as ThemePreferenceType,
} from '@/storage/app-storage';
import {
  cancelScheduledNotification,
  getLocalNotificationPermissionState,
  LocalNotificationPermissionState,
  requestLocalNotificationPermission,
  scheduleDailyReminderNotification,
} from '@/storage/notification-storage';

export enum SettingsExportFormat {
  Json = 'json',
  Csv = 'csv',
}

const now = (): string => new Date().toISOString();

const readSettings = (): AppSettings =>
  appStorage.getOrDefault(StorageKey.Settings, createDefaultAppSettings(now()));

let settingsSnapshot = createDefaultAppSettings(now());

export const accentColorValues: Record<AccentColorName, string> = {
  [AccentColorName.Red]: '#DC2626',
  [AccentColorName.Orange]: '#F97316',
  [AccentColorName.Amber]: '#F59E0B',
  [AccentColorName.Green]: '#22C55E',
  [AccentColorName.Teal]: '#14B8A6',
  [AccentColorName.Blue]: '#2563EB',
  [AccentColorName.Purple]: '#8B5CF6',
  [AccentColorName.Pink]: '#EC4899',
};

type AccentPalette = {
  accent: string;
  accentBackground: string;
  accentBorder: string;
  accentForeground: string;
};

const accentPalettes: Record<'light' | 'dark', Record<AccentColorName, AccentPalette>> = {
  light: {
    [AccentColorName.Red]: {
      accent: '#DC2626',
      accentBackground: '#FEE2E2',
      accentBorder: '#FCA5A5',
      accentForeground: '#FFFFFF',
    },
    [AccentColorName.Orange]: {
      accent: '#EA580C',
      accentBackground: '#FFEDD5',
      accentBorder: '#FDBA74',
      accentForeground: '#FFFFFF',
    },
    [AccentColorName.Amber]: {
      accent: '#B45309',
      accentBackground: '#FEF3C7',
      accentBorder: '#FCD34D',
      accentForeground: '#FFFFFF',
    },
    [AccentColorName.Green]: {
      accent: '#15803D',
      accentBackground: '#DCFCE7',
      accentBorder: '#86EFAC',
      accentForeground: '#FFFFFF',
    },
    [AccentColorName.Teal]: {
      accent: '#0F766E',
      accentBackground: '#CCFBF1',
      accentBorder: '#5EEAD4',
      accentForeground: '#FFFFFF',
    },
    [AccentColorName.Blue]: {
      accent: '#2563EB',
      accentBackground: '#DBEAFE',
      accentBorder: '#93C5FD',
      accentForeground: '#FFFFFF',
    },
    [AccentColorName.Purple]: {
      accent: '#7C3AED',
      accentBackground: '#EDE9FE',
      accentBorder: '#C4B5FD',
      accentForeground: '#FFFFFF',
    },
    [AccentColorName.Pink]: {
      accent: '#DB2777',
      accentBackground: '#FCE7F3',
      accentBorder: '#F9A8D4',
      accentForeground: '#FFFFFF',
    },
  },
  dark: {
    [AccentColorName.Red]: {
      accent: '#FCA5A5',
      accentBackground: '#7F1D1D',
      accentBorder: '#EF4444',
      accentForeground: '#111827',
    },
    [AccentColorName.Orange]: {
      accent: '#FDBA74',
      accentBackground: '#7C2D12',
      accentBorder: '#F97316',
      accentForeground: '#111827',
    },
    [AccentColorName.Amber]: {
      accent: '#FCD34D',
      accentBackground: '#78350F',
      accentBorder: '#F59E0B',
      accentForeground: '#111827',
    },
    [AccentColorName.Green]: {
      accent: '#86EFAC',
      accentBackground: '#14532D',
      accentBorder: '#22C55E',
      accentForeground: '#111827',
    },
    [AccentColorName.Teal]: {
      accent: '#5EEAD4',
      accentBackground: '#134E4A',
      accentBorder: '#14B8A6',
      accentForeground: '#111827',
    },
    [AccentColorName.Blue]: {
      accent: '#60A5FA',
      accentBackground: '#1E3A8A',
      accentBorder: '#3B82F6',
      accentForeground: '#0F172A',
    },
    [AccentColorName.Purple]: {
      accent: '#C4B5FD',
      accentBackground: '#4C1D95',
      accentBorder: '#8B5CF6',
      accentForeground: '#111827',
    },
    [AccentColorName.Pink]: {
      accent: '#F9A8D4',
      accentBackground: '#831843',
      accentBorder: '#EC4899',
      accentForeground: '#111827',
    },
  },
};

export const accentColorLabels: Record<AccentColorName, string> = {
  [AccentColorName.Red]: 'Red',
  [AccentColorName.Orange]: 'Orange',
  [AccentColorName.Amber]: 'Amber',
  [AccentColorName.Green]: 'Green',
  [AccentColorName.Teal]: 'Teal',
  [AccentColorName.Blue]: 'Blue',
  [AccentColorName.Purple]: 'Purple',
  [AccentColorName.Pink]: 'Pink',
};

export const getSettings = (): AppSettings => settingsSnapshot;

export const refreshSettingsSnapshot = (): AppSettings => {
  settingsSnapshot = readSettings();

  return settingsSnapshot;
};

export const saveSettings = (settings: AppSettings): void => {
  appStorage.insert(StorageKey.Settings, settings);
  settingsSnapshot = settings;
};

export const updateSettings = (update: (settings: AppSettings) => AppSettings): AppSettings => {
  const updatedSettings = update(getSettings());

  saveSettings(updatedSettings);

  return updatedSettings;
};

export const setThemePreference = (themePreference: ThemePreferenceType): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    themePreference,
    updatedAt: now(),
  }));

export const setAccentColorName = (accentColorName: AccentColorNameType): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    accentColorName,
    updatedAt: now(),
  }));

export const setLastUsedGoalDurationHours = (lastUsedGoalDurationHours: number): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    lastUsedGoalDurationHours,
    updatedAt: now(),
  }));

const createGoalId = (): string =>
  `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createFastingGoal = ({
  name,
  targetDurationHours,
}: {
  name: string;
  targetDurationHours: number;
}): FastingGoal => {
  const timestamp = now();
  const goal: FastingGoal = {
    id: createGoalId(),
    kind: GoalKind.Duration,
    type: FastingGoalType.Custom,
    name,
    targetDurationHours,
    isEnabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  updateSettings((settings) => ({
    ...settings,
    goals: [...settings.goals, goal],
    updatedAt: timestamp,
  }));

  return goal;
};

export const updateFastingGoal = ({
  goalId,
  name,
  targetDurationHours,
}: {
  goalId: string;
  name: string;
  targetDurationHours: number;
}): FastingGoal | undefined => {
  const settings = getSettings();
  const currentGoal = settings.goals.find((goal) => goal.id === goalId);

  if (currentGoal === undefined || currentGoal.type === FastingGoalType.Standard) {
    return undefined;
  }

  const timestamp = now();
  const goal: FastingGoal = {
    ...currentGoal,
    name,
    targetDurationHours,
    updatedAt: timestamp,
  };

  updateSettings((currentSettings) => ({
    ...currentSettings,
    goals: currentSettings.goals.map((candidate) =>
      candidate.id === goalId ? goal : candidate,
    ),
    lastUsedGoalDurationHours:
      currentSettings.lastUsedGoalDurationHours === currentGoal.targetDurationHours
        ? targetDurationHours
        : currentSettings.lastUsedGoalDurationHours,
    updatedAt: timestamp,
  }));

  return goal;
};

export const deleteFastingGoal = (goalId: string): boolean => {
  const settings = getSettings();
  const deletedGoal = settings.goals.find((goal) => goal.id === goalId);

  if (
    deletedGoal === undefined ||
    deletedGoal.type === FastingGoalType.Standard ||
    settings.goals.length <= 1
  ) {
    return false;
  }

  const remainingGoals = settings.goals.filter((goal) => goal.id !== goalId);
  const fallbackGoal =
    remainingGoals.find((goal) => goal.id === 'goal-16-hours' && goal.isEnabled) ??
    remainingGoals.find((goal) => goal.isEnabled) ??
    remainingGoals[0];
  const timestamp = now();

  updateSettings((currentSettings) => ({
    ...currentSettings,
    goals: remainingGoals,
    lastUsedGoalDurationHours:
      currentSettings.lastUsedGoalDurationHours === deletedGoal.targetDurationHours
        ? fallbackGoal.targetDurationHours
        : currentSettings.lastUsedGoalDurationHours,
    updatedAt: timestamp,
  }));

  return true;
};

export const moveFastingGoal = (goalId: string, destinationIndex: number): AppSettings =>
  updateSettings((settings) => {
    const sourceIndex = settings.goals.findIndex((goal) => goal.id === goalId);
    if (sourceIndex < 0) return settings;

    const boundedDestination = Math.max(0, Math.min(destinationIndex, settings.goals.length - 1));
    if (sourceIndex === boundedDestination) return settings;

    const goals = [...settings.goals];
    const [goal] = goals.splice(sourceIndex, 1);
    goals.splice(boundedDestination, 0, goal);

    return { ...settings, goals, updatedAt: now() };
  });

export const setFastingGoalEnabled = (goalId: string, isEnabled: boolean): boolean => {
  const settings = getSettings();
  const selectedGoal = settings.goals.find((goal) => goal.id === goalId);

  if (selectedGoal === undefined || selectedGoal.isEnabled === isEnabled) {
    return selectedGoal !== undefined;
  }

  const enabledGoals = settings.goals.filter(
    (goal) => goal.id !== goalId && goal.isEnabled,
  );

  if (!isEnabled && enabledGoals.length === 0) {
    return false;
  }

  const fallbackGoal =
    enabledGoals.find((goal) => goal.id === 'goal-16-hours') ?? enabledGoals[0];
  const timestamp = now();

  updateSettings((currentSettings) => ({
    ...currentSettings,
    goals: currentSettings.goals.map((goal) => ({
      ...goal,
      isEnabled: goal.id === goalId ? isEnabled : goal.isEnabled,
      updatedAt: goal.id === goalId ? timestamp : goal.updatedAt,
    })),
    lastUsedGoalDurationHours:
      !isEnabled &&
      currentSettings.lastUsedGoalDurationHours === selectedGoal.targetDurationHours
        ? fallbackGoal.targetDurationHours
        : currentSettings.lastUsedGoalDurationHours,
    updatedAt: timestamp,
  }));

  return true;
};

export const setDataViewPreference = (dataViewPreference: DataViewPreferenceType): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    dataViewPreference,
    updatedAt: now(),
  }));

export const updateNotificationSettings = (
  update: (notifications: NotificationSettings) => NotificationSettings,
): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    notifications: update(settings.notifications),
    updatedAt: now(),
  }));

export const initializeNotificationPermission = async (): Promise<LocalNotificationPermissionState> => {
  const initialState = await getLocalNotificationPermissionState();

  if (initialState === LocalNotificationPermissionState.Granted) {
    return initialState;
  }

  const granted =
    initialState === LocalNotificationPermissionState.Undetermined
      ? await requestLocalNotificationPermission()
      : false;

  updateNotificationSettings((notifications) => ({
    ...notifications,
    fastEndReminderEnabled: granted,
    dailyReminderEnabled: false,
  }));

  return granted
    ? LocalNotificationPermissionState.Granted
    : LocalNotificationPermissionState.Denied;
};

export const reconcileDailyReminderNotification = async (): Promise<AppSettings> => {
  const settings = getSettings();
  const activeFast = appStorage.get(StorageKey.ActiveFast);
  const hasActiveFast = activeFast?.session !== undefined && activeFast.session !== null;

  await cancelScheduledNotification(settings.notifications.dailyReminderNotificationId);

  if (
    !settings.notifications.dailyReminderEnabled ||
    settings.notifications.dailyReminderTime === null ||
    hasActiveFast
  ) {
    return updateNotificationSettings((notifications) => ({
      ...notifications,
      dailyReminderNotificationId: null,
    }));
  }

  const dailyReminderNotificationId = await scheduleDailyReminderNotification(
    settings.notifications.dailyReminderTime,
  );

  return updateNotificationSettings((notifications) => ({
    ...notifications,
    dailyReminderNotificationId,
  }));
};

export const updateNotificationSettingsAndSchedule = async (
  update: (notifications: NotificationSettings) => NotificationSettings,
): Promise<AppSettings> => {
  updateNotificationSettings(update);

  return reconcileDailyReminderNotification();
};

export const setDailyReminderTimeAndSchedule = async (
  dailyReminderTime: string,
): Promise<AppSettings> =>
  updateNotificationSettingsAndSchedule((notifications) => ({
    ...notifications,
    dailyReminderTime,
  }));

export const cancelDailyReminderNotification = async (): Promise<AppSettings> => {
  const settings = getSettings();

  await cancelScheduledNotification(settings.notifications.dailyReminderNotificationId);

  return updateNotificationSettings((notifications) => ({
    ...notifications,
    dailyReminderNotificationId: null,
  }));
};

export const getAccentPalette = ({
  accentColorName,
  colorScheme,
}: {
  accentColorName: AccentColorName;
  colorScheme: 'light' | 'dark';
}): AccentPalette => accentPalettes[colorScheme][accentColorName];

export const getEffectiveColorScheme = ({
  themePreference,
  systemColorScheme,
}: {
  themePreference: ThemePreference;
  systemColorScheme: ColorSchemeName;
}): 'light' | 'dark' => {
  if (themePreference === ThemePreference.Light) {
    return 'light';
  }

  if (themePreference === ThemePreference.Dark) {
    return 'dark';
  }

  return systemColorScheme === 'dark' ? 'dark' : 'light';
};

const subscribeToSettings = (onStoreChange: () => void): (() => void) =>
  appStorage.subscribe((key) => {
    if (key === StorageKey.Settings) {
      settingsSnapshot = readSettings();
      onStoreChange();
    }
  });

export const useSettings = (): AppSettings =>
  useSyncExternalStore(subscribeToSettings, getSettings, getSettings);

export const createExportFilename = (format: SettingsExportFormat): string =>
  `simple-fasting-export-${new Date().toISOString().slice(0, 10)}.${format}`;

export const escapeCsvValue = (value: string | number | null): string => {
  const text = value === null ? '' : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const createExportMetadata = () => ({
  exportedAt: now(),
  app: {
    name: Constants.expoConfig?.name ?? 'Simple Fasting',
    version: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0',
    buildVersion: Constants.nativeBuildVersion ?? null,
  },
  storage: appStorage.get(StorageKey.Metadata) ?? null,
});

export const createHistoryCsv = (): string => {
  const metadata = createExportMetadata();
  const history = appStorage.get(StorageKey.History);
  const rows = history?.sessions ?? [];
  const header = [
    'exportedAt',
    'appVersion',
    'buildVersion',
    'id',
    'status',
    'startedAt',
    'endedAt',
    'goalDurationHours',
    'reason',
    'createdAt',
    'updatedAt',
  ];
  const body = rows.map((session) =>
    [
      metadata.exportedAt,
      metadata.app.version,
      metadata.app.buildVersion,
      session.id,
      session.status,
      session.startedAt,
      session.endedAt,
      session.goalDurationHours,
      session.reason,
      session.createdAt,
      session.updatedAt,
    ]
      .map(escapeCsvValue)
      .join(','),
  );

  return [header.join(','), ...body].join('\n');
};

export const createJsonExport = (): string =>
  JSON.stringify(
    {
      metadata: createExportMetadata(),
      data: appStorage.get(StorageKey.History)?.sessions ?? [],
    },
    null,
    2,
  );

export const createExportContent = (format: SettingsExportFormat): string =>
  format === SettingsExportFormat.Json ? createJsonExport() : createHistoryCsv();

const shareTextFallback = async ({
  content,
  filename,
}: {
  content: string;
  filename: string;
}): Promise<void> => {
  await Share.share({
    title: filename,
    message: content,
  });
};

export const shareDataExport = async (format: SettingsExportFormat): Promise<void> => {
  const filename = createExportFilename(format);
  const content = createExportContent(format);
  const file = new File(Paths.cache, filename);

  if (Platform.OS === 'web') {
    await shareTextFallback({ content, filename });
    return;
  }

  file.create({ overwrite: true });
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Export Simple Fasting data',
      mimeType: format === SettingsExportFormat.Json ? 'application/json' : 'text/csv',
      UTI: format === SettingsExportFormat.Json ? 'public.json' : 'public.comma-separated-values-text',
    });
    return;
  }

  await shareTextFallback({ content, filename });
};

export {
  getLocalNotificationPermissionState,
  LocalNotificationPermissionState,
  requestLocalNotificationPermission,
};

const websiteUrl = 'https://simplefasting.app';
const supportEmail = 'support@simplefasting.app';
const bugReportEmail = 'bugs@simplefasting.app';

const openWebsitePath = async (path: string): Promise<void> => {
  await WebBrowser.openBrowserAsync(`${websiteUrl}${path}`);
};

export const getAppVersionLabel = (): string =>
  `Version ${Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0'}`;

export const openWebsite = async (): Promise<void> => openWebsitePath('');

export const openFaq = async (): Promise<void> => openWebsitePath('/faq');

export const openPrivacyPolicy = async (): Promise<void> => openWebsitePath('/privacy');

export const openTerms = async (): Promise<void> => openWebsitePath('/terms');

export const openSupportEmail = async (): Promise<void> =>
  Linking.openURL(`mailto:${supportEmail}?subject=Simple%20Fasting%20support`);

export const openBugReportEmail = async (): Promise<void> =>
  Linking.openURL(`mailto:${bugReportEmail}?subject=Simple%20Fasting%20bug%20report`);
