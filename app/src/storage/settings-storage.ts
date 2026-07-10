import { useSyncExternalStore } from 'react';
import { Linking, Platform, Share, type ColorSchemeName } from 'react-native';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { t } from '@/locales/i18n';
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
  type GoalDurationFormat as GoalDurationFormatType,
  type NotificationSettings,
  type ThemePreference as ThemePreferenceType,
} from '@/storage/app-storage';
import {
  cancelScheduledNotification,
  getLocalNotificationPermissionState,
  LocalNotificationPermissionState,
  openLocalNotificationSettings,
  requestLocalNotificationPermission,
  scheduleDailyReminderNotification,
} from '@/storage/notification-storage';
import { repairSettings } from '@/storage/storage-validation';

export enum SettingsExportFormat {
  Json = 'json',
  Csv = 'csv',
}

const now = (): string => new Date().toISOString();

type ExportedNotificationSettings = Pick<
  NotificationSettings,
  'fastEndReminderEnabled' | 'dailyReminderEnabled' | 'dailyReminderTime'
>;

export type ExportedAppSettings = Pick<
  AppSettings,
  | 'themePreference'
  | 'accentColorName'
  | 'goals'
  | 'lastUsedGoalDurationHours'
  | 'goalDurationFormat'
  | 'liveActivitiesEnabled'
> & {
  notifications: ExportedNotificationSettings;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readSettings = (): AppSettings =>
  appStorage.getOrDefault(StorageKey.Settings, createDefaultAppSettings(now()));

let settingsSnapshot = createDefaultAppSettings(now());
let dailyReminderNotificationRevision = 0;

export const accentColorValues: Record<AccentColorName, string> = {
  [AccentColorName.Rose]: '#F43F5E',
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
    [AccentColorName.Rose]: {
      accent: '#BE123C',
      accentBackground: '#FFE4E6',
      accentBorder: '#FDA4AF',
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
    [AccentColorName.Rose]: {
      accent: '#F87171',
      accentBackground: '#450A0A',
      accentBorder: '#DC2626',
      accentForeground: '#111827',
    },
    [AccentColorName.Orange]: {
      accent: '#FB923C',
      accentBackground: '#431407',
      accentBorder: '#EA580C',
      accentForeground: '#111827',
    },
    [AccentColorName.Amber]: {
      accent: '#D97706',
      accentBackground: '#451A03',
      accentBorder: '#B45309',
      accentForeground: '#111827',
    },
    [AccentColorName.Green]: {
      accent: '#4ADE80',
      accentBackground: '#052E16',
      accentBorder: '#16A34A',
      accentForeground: '#111827',
    },
    [AccentColorName.Teal]: {
      accent: '#2DD4BF',
      accentBackground: '#042F2E',
      accentBorder: '#0D9488',
      accentForeground: '#111827',
    },
    [AccentColorName.Blue]: {
      accent: '#60A5FA',
      accentBackground: '#172554',
      accentBorder: '#2563EB',
      accentForeground: '#0F172A',
    },
    [AccentColorName.Purple]: {
      accent: '#A78BFA',
      accentBackground: '#2E1065',
      accentBorder: '#7C3AED',
      accentForeground: '#111827',
    },
    [AccentColorName.Pink]: {
      accent: '#F472B6',
      accentBackground: '#500724',
      accentBorder: '#DB2777',
      accentForeground: '#111827',
    },
  },
};

export const accentColorLabels: Record<AccentColorName, string> = {
  [AccentColorName.Rose]: 'Rose',
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

export const updateSettings = (
  update: (settings: AppSettings) => AppSettings,
): AppSettings => {
  const currentSettings = getSettings();
  const updatedSettings = update(currentSettings);

  if (updatedSettings === currentSettings) {
    return currentSettings;
  }
  saveSettings(updatedSettings);

  return updatedSettings;
};

export const createExportSettings = (settings: AppSettings = getSettings()): ExportedAppSettings => ({
  themePreference: settings.themePreference,
  accentColorName: settings.accentColorName,
  goals: settings.goals,
  lastUsedGoalDurationHours: settings.lastUsedGoalDurationHours,
  goalDurationFormat: settings.goalDurationFormat,
  liveActivitiesEnabled: settings.liveActivitiesEnabled,
  notifications: {
    fastEndReminderEnabled: settings.notifications.fastEndReminderEnabled,
    dailyReminderEnabled: settings.notifications.dailyReminderEnabled,
    dailyReminderTime: settings.notifications.dailyReminderTime,
  },
});

export const mergeImportedSettings = (value: unknown): AppSettings | null => {
  if (!isRecord(value)) {
    return null;
  }

  const repaired = repairSettings(value, now()).value;
  const importedNotifications = isRecord(value.notifications) ? value.notifications : null;

  if (repaired === undefined) {
    return null;
  }

  return updateSettings((currentSettings) => {
    return {
      ...currentSettings,
      themePreference: 'themePreference' in value
        ? repaired.themePreference
        : currentSettings.themePreference,
      accentColorName: 'accentColorName' in value
        ? repaired.accentColorName
        : currentSettings.accentColorName,
      goals: 'goals' in value ? repaired.goals : currentSettings.goals,
      lastUsedGoalDurationHours: 'lastUsedGoalDurationHours' in value
        ? repaired.lastUsedGoalDurationHours
        : currentSettings.lastUsedGoalDurationHours,
      goalDurationFormat: 'goalDurationFormat' in value
        ? repaired.goalDurationFormat
        : currentSettings.goalDurationFormat,
      liveActivitiesEnabled: 'liveActivitiesEnabled' in value
        ? repaired.liveActivitiesEnabled
        : currentSettings.liveActivitiesEnabled,
      notifications: {
        ...currentSettings.notifications,
        fastEndReminderEnabled: importedNotifications !== null && 'fastEndReminderEnabled' in importedNotifications
          ? repaired.notifications.fastEndReminderEnabled
          : currentSettings.notifications.fastEndReminderEnabled,
        dailyReminderEnabled: importedNotifications !== null && 'dailyReminderEnabled' in importedNotifications
          ? repaired.notifications.dailyReminderEnabled
          : currentSettings.notifications.dailyReminderEnabled,
        dailyReminderTime: importedNotifications !== null && 'dailyReminderTime' in importedNotifications
          ? repaired.notifications.dailyReminderTime
          : currentSettings.notifications.dailyReminderTime,
        dailyReminderNotificationId: null,
      },
      updatedAt: now(),
    };
  });
};

export const setThemePreference = (themePreference: ThemePreferenceType): AppSettings =>
  updateSettings((settings) =>
    settings.themePreference === themePreference
      ? settings
      : {
          ...settings,
          themePreference,
          updatedAt: now(),
        },
  );

export const setAccentColorName = (accentColorName: AccentColorNameType): AppSettings =>
  updateSettings((settings) =>
    settings.accentColorName === accentColorName
      ? settings
      : {
          ...settings,
          accentColorName,
          updatedAt: now(),
        },
  );

export const setLastUsedGoalDurationHours = (lastUsedGoalDurationHours: number): AppSettings =>
  updateSettings((settings) =>
    settings.lastUsedGoalDurationHours === lastUsedGoalDurationHours
      ? settings
      : {
          ...settings,
          lastUsedGoalDurationHours,
          updatedAt: now(),
        },
  );

export const setGoalDurationFormat = (
  goalDurationFormat: GoalDurationFormatType,
): AppSettings =>
  updateSettings((currentSettings) =>
    currentSettings.goalDurationFormat === goalDurationFormat
      ? currentSettings
      : {
          ...currentSettings,
          goalDurationFormat,
          updatedAt: now(),
        },
  );

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
    if (!Number.isFinite(destinationIndex)) return settings;

    const sourceIndex = settings.goals.findIndex((goal) => goal.id === goalId);
    if (sourceIndex < 0) return settings;

    const boundedDestination = Math.max(0, Math.min(destinationIndex, settings.goals.length - 1));
    if (sourceIndex === boundedDestination) return settings;

    const goals = [...settings.goals];
    const [goal] = goals.splice(sourceIndex, 1);
    if (goal === undefined) return settings;

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
      fallbackGoal !== undefined &&
      currentSettings.lastUsedGoalDurationHours === selectedGoal.targetDurationHours
        ? fallbackGoal.targetDurationHours
        : currentSettings.lastUsedGoalDurationHours,
    updatedAt: timestamp,
  }));

  return true;
};

export const setDataViewPreference = (dataViewPreference: DataViewPreferenceType): AppSettings =>
  updateSettings((settings) =>
    settings.dataViewPreference === dataViewPreference
      ? settings
      : {
          ...settings,
          dataViewPreference,
          updatedAt: now(),
        },
  );

export const setLiveActivitiesEnabled = (liveActivitiesEnabled: boolean): AppSettings =>
  updateSettings((settings) =>
    settings.liveActivitiesEnabled === liveActivitiesEnabled
      ? settings
      : {
          ...settings,
          liveActivitiesEnabled,
          updatedAt: now(),
        },
  );

export const completeNotificationOnboarding = ({
  notificationsAllowed,
}: {
  notificationsAllowed: boolean;
}): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    onboardingCompleted: true,
    notificationPromptShown: true,
    notifications: {
      ...settings.notifications,
      fastEndReminderEnabled: notificationsAllowed,
      dailyReminderEnabled: false,
      dailyReminderNotificationId: notificationsAllowed
        ? settings.notifications.dailyReminderNotificationId
        : null,
    },
    updatedAt: now(),
  }));

export const acceptLegalConsent = (): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    legalConsentAccepted: true,
    updatedAt: now(),
  }));

export const updateNotificationSettings = (
  update: (notifications: NotificationSettings) => NotificationSettings,
): AppSettings => {
  return updateSettings((currentSettings) => ({
    ...currentSettings,
    notifications: update(currentSettings.notifications),
    updatedAt: now(),
  }));
};

export const syncNotificationPermissionState = async (): Promise<LocalNotificationPermissionState> => {
  const permissionState = await getLocalNotificationPermissionState();

  if (permissionState === LocalNotificationPermissionState.Granted) {
    return permissionState;
  }

  dailyReminderNotificationRevision += 1;
  const settings = getSettings();
  const activeFast = appStorage.get(StorageKey.ActiveFast);

  await Promise.all([
    cancelScheduledNotification(settings.notifications.dailyReminderNotificationId),
    cancelScheduledNotification(activeFast?.fastEndNotificationId ?? null),
  ]);

  if (activeFast !== undefined) {
    appStorage.insert(StorageKey.ActiveFast, {
      ...activeFast,
      fastEndNotificationId: null,
      fastEndReminderEnabled: false,
      updatedAt: now(),
    });
  }

  updateNotificationSettings((notifications) => ({
    ...notifications,
    fastEndReminderEnabled: false,
    dailyReminderEnabled: false,
    dailyReminderNotificationId: null,
  }));

  return permissionState;
};

export const reconcileDailyReminderNotification = async (): Promise<AppSettings> => {
  const revision = ++dailyReminderNotificationRevision;
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

  const currentSettings = getSettings();
  const currentActiveFast = appStorage.get(StorageKey.ActiveFast);
  const hasCurrentActiveFast =
    currentActiveFast?.session !== undefined && currentActiveFast.session !== null;
  const shouldKeepNotification =
    revision === dailyReminderNotificationRevision &&
    currentSettings.notifications.dailyReminderEnabled &&
    currentSettings.notifications.dailyReminderTime === settings.notifications.dailyReminderTime &&
    !hasCurrentActiveFast;

  if (dailyReminderNotificationId === null) {
    return shouldKeepNotification
      ? updateNotificationSettings((notifications) => ({
          ...notifications,
          dailyReminderNotificationId: null,
        }))
      : currentSettings;
  }

  if (!shouldKeepNotification) {
    await cancelScheduledNotification(dailyReminderNotificationId).catch(() => undefined);
    return currentSettings;
  }

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
  dailyReminderNotificationRevision += 1;
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

const subscribeToSettings = (onStoreChange: () => void): (() => void) => {
  const unsubscribeStorage = appStorage.subscribe((key) => {
    if (key === StorageKey.Settings) {
      settingsSnapshot = readSettings();
      onStoreChange();
    }
  });

  return () => {
    unsubscribeStorage();
  };
};

export const useSettings = (): AppSettings =>
  useSyncExternalStore(subscribeToSettings, getSettings, getSettings);

export const useSettingsSelector = <Value,>(select: (settings: AppSettings) => Value): Value =>
  useSyncExternalStore(
    subscribeToSettings,
    () => select(getSettings()),
    () => select(getSettings()),
  );

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
    'note',
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
      settings: createExportSettings(),
      sessions: appStorage.get(StorageKey.History)?.sessions ?? [],
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
      dialogTitle: t('exports.shareDialogTitle'),
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
  openLocalNotificationSettings,
  requestLocalNotificationPermission,
};

const websiteUrl = 'https://simplefasting.app';
const supportEmail = 'support@simplefasting.app';
const bugReportEmail = 'bugs@simplefasting.app';

type StoreLinksExtra = {
  storeLinks?: {
    appStoreReview?: unknown;
    playStoreReview?: unknown;
  };
};

const getExtraString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

export const getStoreReviewUrlForPlatform = ({
  extra,
  platform,
}: {
  extra: StoreLinksExtra | undefined;
  platform: typeof Platform.OS;
}): string | null => {
  if (platform === 'ios') return getExtraString(extra?.storeLinks?.appStoreReview);
  if (platform === 'android') return getExtraString(extra?.storeLinks?.playStoreReview);

  return null;
};

export const getStoreReviewUrl = (): string | null =>
  getStoreReviewUrlForPlatform({
    extra: Constants.expoConfig?.extra as StoreLinksExtra | undefined,
    platform: Platform.OS,
  });

const openWebsitePath = async (path: string): Promise<void> => {
  await WebBrowser.openBrowserAsync(`${websiteUrl}${path}`);
};

export const getAppVersionLabel = (): string =>
  `Version ${Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0'}`;

export const openWebsite = async (): Promise<void> => openWebsitePath('');

export const openRateApp = async (): Promise<void> => {
  const storeReviewUrl = getStoreReviewUrl();

  if (!storeReviewUrl) return;

  await Linking.openURL(storeReviewUrl);
};

export const openFaq = async (): Promise<void> => openWebsitePath('/faq');

export const openPrivacyPolicy = async (): Promise<void> => openWebsitePath('/privacy');

export const openTerms = async (): Promise<void> => openWebsitePath('/terms');

export const openSupportEmail = async (): Promise<void> =>
  Linking.openURL(`mailto:${supportEmail}?subject=%5BSUPPORT%5D%20Simple%20Fasting%3A%20Support%20request`);

export const openBugReportEmail = async (): Promise<void> =>
  Linking.openURL(`mailto:${bugReportEmail}?subject=%5BBUG%5D%20Simple%20Fasting%3A%20Bug%20report`);
