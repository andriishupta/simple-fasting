import { useSyncExternalStore } from 'react';

import {
  appStorage,
  createDefaultAppSettings,
  StorageKey,
  type AccentColorName,
  type AppSettings,
  type NotificationSettings,
  type ThemePreference,
  type WidgetSettings,
} from '@/storage/app-storage';

const now = (): string => new Date().toISOString();

const readSettings = (): AppSettings =>
  appStorage.getOrDefault(StorageKey.Settings, createDefaultAppSettings(now()));

let settingsSnapshot = createDefaultAppSettings(now());

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

export const setThemePreference = (themePreference: ThemePreference): AppSettings =>
  updateSettings((settings) => ({
    ...settings,
    themePreference,
    updatedAt: now(),
  }));

export const setAccentColorName = (accentColorName: AccentColorName): AppSettings =>
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

const subscribeToSettings = (onStoreChange: () => void): (() => void) =>
  appStorage.subscribe((key) => {
    if (key === StorageKey.Settings) {
      settingsSnapshot = readSettings();
      onStoreChange();
    }
  });

export const useSettings = (): AppSettings =>
  useSyncExternalStore(subscribeToSettings, getSettings, getSettings);
