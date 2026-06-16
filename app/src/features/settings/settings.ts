import { useSyncExternalStore } from 'react';
import { useColorScheme, type ColorSchemeName } from 'react-native';

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

const now = (): string => new Date().toISOString();

const readSettings = (): AppSettings =>
  appStorage.getOrDefault(StorageKey.Settings, createDefaultAppSettings(now()));

let settingsSnapshot = createDefaultAppSettings(now());

export const accentColorValues: Record<AccentColorName, string> = {
  [AccentColorName.Red]: '#EF4444',
  [AccentColorName.Orange]: '#F97316',
  [AccentColorName.Amber]: '#F59E0B',
  [AccentColorName.Green]: '#22C55E',
  [AccentColorName.Teal]: '#14B8A6',
  [AccentColorName.Blue]: '#3B82F6',
  [AccentColorName.Purple]: '#8B5CF6',
  [AccentColorName.Pink]: '#EC4899',
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
