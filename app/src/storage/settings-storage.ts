import { useSyncExternalStore } from 'react';
import { Linking, Platform, Share, useColorScheme, type ColorSchemeName } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import {
  appStorage,
  createDefaultAppSettings,
  StorageKey,
  AccentColorName,
  ThemePreference,
  type AccentColorName as AccentColorNameType,
  type AppSettings,
  type FastingGoal,
  type NotificationSettings,
  type ThemePreference as ThemePreferenceType,
  type WidgetSettings,
} from '@/storage/app-storage';

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
  settingsSnapshot = settings;
  appStorage.insert(StorageKey.Settings, settings);
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

export const setDefaultGoal = (goalId: string): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    goals: settings.goals.map((goal) => ({
      ...goal,
      isDefault: goal.id === goalId,
      updatedAt: goal.id === goalId ? now() : goal.updatedAt,
    })),
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

export const setDailyReminderTime = (dailyReminderTime: string): AppSettings =>
  updateNotificationSettings((notifications) => ({
    ...notifications,
    dailyReminderTime,
  }));

export const updateWidgetSettings = (
  update: (widgets: WidgetSettings) => WidgetSettings,
): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    widgets: update(settings.widgets),
    updatedAt: now(),
  }));

export const getDefaultGoal = (settings: AppSettings): FastingGoal =>
  settings.goals.find((goal) => goal.isDefault) ?? settings.goals[0];

export const getAccentColor = (settings: AppSettings): string =>
  accentColorValues[settings.accentColorName];

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

export const useAppColorScheme = (): 'light' | 'dark' => {
  const settings = useSettings();
  const systemColorScheme = useColorScheme();

  return getEffectiveColorScheme({
    themePreference: settings.themePreference,
    systemColorScheme,
  });
};

const createExportFilename = (format: SettingsExportFormat): string =>
  `simple-fasting-export-${new Date().toISOString().slice(0, 10)}.${format}`;

const escapeCsvValue = (value: string | number | null): string => {
  const text = value === null ? '' : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const createHistoryCsv = (): string => {
  const history = appStorage.get(StorageKey.History);
  const rows = history?.sessions ?? [];
  const header = [
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

const createJsonExport = (): string =>
  JSON.stringify(
    {
      exportedAt: now(),
      data: appStorage.query([
        StorageKey.Metadata,
        StorageKey.Settings,
        StorageKey.ActiveFast,
        StorageKey.History,
        StorageKey.GraphCache,
      ]),
    },
    null,
    2,
  );

const createExportContent = (format: SettingsExportFormat): string =>
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

export const requestLocalNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }

  const Notifications = await import('expo-notifications');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fasting-reminders', {
      name: 'Fasting reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();

  if (existingPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();

  return requestedPermissions.granted;
};

export const openPrivacyPolicy = async (): Promise<void> => {
  await WebBrowser.openBrowserAsync('https://simple-fasting.app/privacy');
};

export const openSupportEmail = async (): Promise<void> => {
  await Linking.openURL('mailto:support@simple-fasting.app');
};
