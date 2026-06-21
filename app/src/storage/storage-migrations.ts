import Constants from 'expo-constants';

import {
  appStorage,
  createDefaultAppSettings,
  createDefaultStorageMetadata,
  createEmptyDiagnosticsState,
  createEmptyActiveFastState,
  createEmptyHistoryState,
  StorageKey,
  StorageSchemaVersion,
  type ActiveFastState,
  type AppSettings,
  type FastingGoal,
  type StorageMetadata,
  type Timestamp,
} from '@/storage/app-storage';
import {
  quarantineIfRawParseFailed,
  repairActiveFast,
  repairDiagnostics,
  repairHistory,
  repairMetadata,
  repairSettings,
} from '@/storage/storage-validation';

type RuntimeVersions = {
  appVersion: string;
  expoVersion: string;
};

const getRuntimeVersions = (): RuntimeVersions => ({
  appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '0.0.0',
  expoVersion: Constants.expoVersion ?? 'unknown',
});

const now = (): Timestamp => new Date().toISOString();

const readRepairedValue = <Value>({
  key,
  timestamp,
  repair,
}: {
  key: StorageKey;
  timestamp: Timestamp;
  repair: (value: unknown, timestamp: Timestamp) => {
    value: Value | undefined;
    repaired: boolean;
    reason: string | null;
  };
}): Value | undefined => {
  quarantineIfRawParseFailed(key);

  const hasRawValue = appStorage.getRaw(key) !== undefined;
  const value = appStorage.get(key) as unknown;
  const result = repair(value, timestamp);

  if (result.value === undefined) {
    if (result.repaired && hasRawValue) {
      appStorage.quarantine(key, result.reason ?? 'Stored value was repaired.');
    }

    return undefined;
  }

  if (result.repaired && hasRawValue) {
    const previousValue = JSON.stringify(value);
    const repairedValue = JSON.stringify(result.value);

    if (previousValue !== repairedValue) {
      appStorage.quarantine(key, result.reason ?? 'Stored value was repaired.');
    }
  }

  return result.value;
};

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
      : settings.goals;

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
  const metadata = readRepairedValue({
    key: StorageKey.Metadata,
    timestamp,
    repair: repairMetadata,
  });
  const settings = readRepairedValue({
    key: StorageKey.Settings,
    timestamp,
    repair: repairSettings,
  });
  const activeFast = readRepairedValue({
    key: StorageKey.ActiveFast,
    timestamp,
    repair: repairActiveFast,
  });
  const history = readRepairedValue({
    key: StorageKey.History,
    timestamp,
    repair: repairHistory,
  });
  const diagnostics = readRepairedValue({
    key: StorageKey.Diagnostics,
    timestamp,
    repair: repairDiagnostics,
  });

  appStorage.insert(
    StorageKey.Metadata,
    mergeRuntimeMetadata(metadata, timestamp),
  );

  appStorage.insert(
    StorageKey.Settings,
    migrateSettingsToV1(settings, timestamp),
  );

  appStorage.insert(
    StorageKey.ActiveFast,
    migrateActiveFastToV1(activeFast, timestamp),
  );

  appStorage.insert(
    StorageKey.History,
    history ?? createEmptyHistoryState(timestamp),
  );

  appStorage.insert(
    StorageKey.Diagnostics,
    diagnostics ?? createEmptyDiagnosticsState(timestamp),
  );

};
