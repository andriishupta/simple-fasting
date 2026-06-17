import Constants from 'expo-constants';

import {
  appStorage,
  createDefaultAppSettings,
  createDefaultStorageMetadata,
  createEmptyActiveFastState,
  createEmptyGraphCacheState,
  createEmptyHistoryState,
  StorageKey,
  StorageSchemaVersion,
  type ActiveFastState,
  type AppSettings,
  type FastingGoal,
  type StorageMetadata,
  type Timestamp,
} from '@/storage/app-storage';

type RuntimeVersions = {
  appVersion: string;
  expoVersion: string;
};

const getRuntimeVersions = (): RuntimeVersions => ({
  appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '0.0.0',
  expoVersion: Constants.expoVersion ?? 'unknown',
});

const now = (): Timestamp => new Date().toISOString();

const mergeRuntimeMetadata = (
  metadata: StorageMetadata | undefined,
  timestamp: Timestamp,
): StorageMetadata => {
  const runtimeVersions = getRuntimeVersions();

  return metadata === undefined
    ? createDefaultStorageMetadata({
        ...runtimeVersions,
        initializedAt: timestamp,
      })
    : {
        ...metadata,
        ...runtimeVersions,
        schemaVersion: StorageSchemaVersion.V1,
        updatedAt: timestamp,
      };
};

const migrateSettingsToV1 = (
  settings: AppSettings | undefined,
  timestamp: Timestamp,
): AppSettings => {
  const defaultSettings = createDefaultAppSettings(timestamp);
  const goals: readonly FastingGoal[] =
    settings?.goals === undefined || settings.goals.length === 0
      ? defaultSettings.goals
      : [
          ...settings.goals,
          ...defaultSettings.goals.filter(
            (defaultGoal) => !settings.goals.some((goal) => goal.id === defaultGoal.id),
          ),
        ];

  return {
    ...defaultSettings,
    ...settings,
    schemaVersion: StorageSchemaVersion.V1,
    goals,
    notifications: {
      ...defaultSettings.notifications,
      ...settings?.notifications,
      dailyReminderNotificationId: settings?.notifications.dailyReminderNotificationId ?? null,
    },
    updatedAt: settings?.updatedAt ?? timestamp,
  };
};

const migrateActiveFastToV1 = (
  activeFast: ActiveFastState | undefined,
  timestamp: Timestamp,
): ActiveFastState => ({
  ...createEmptyActiveFastState(timestamp),
  ...activeFast,
  schemaVersion: StorageSchemaVersion.V1,
  fastEndNotificationId: activeFast?.fastEndNotificationId ?? null,
  updatedAt: activeFast?.updatedAt ?? timestamp,
});

export const initializeAppStorage = (): void => {
  const timestamp = now();

  appStorage.insert(
    StorageKey.Metadata,
    mergeRuntimeMetadata(appStorage.get(StorageKey.Metadata), timestamp),
  );

  appStorage.insert(
    StorageKey.Settings,
    migrateSettingsToV1(appStorage.get(StorageKey.Settings), timestamp),
  );

  appStorage.insert(
    StorageKey.ActiveFast,
    migrateActiveFastToV1(appStorage.get(StorageKey.ActiveFast), timestamp),
  );

  appStorage.insert(
    StorageKey.History,
    appStorage.getOrDefault(StorageKey.History, createEmptyHistoryState(timestamp)),
  );

  appStorage.insert(
    StorageKey.GraphCache,
    appStorage.getOrDefault(StorageKey.GraphCache, createEmptyGraphCacheState(timestamp)),
  );
};
