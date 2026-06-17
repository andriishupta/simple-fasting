import { createMMKV, type Configuration } from 'react-native-mmkv';

export enum StorageKey {
  Metadata = 'metadata',
  Settings = 'settings',
  ActiveFast = 'activeFast',
  History = 'history',
  GraphCache = 'graphCache',
}

export enum StorageSchemaVersion {
  V1 = 1,
}

export enum ThemePreference {
  System = 'system',
  Light = 'light',
  Dark = 'dark',
}

export enum AccentColorName {
  Red = 'red',
  Orange = 'orange',
  Amber = 'amber',
  Green = 'green',
  Teal = 'teal',
  Blue = 'blue',
  Purple = 'purple',
  Pink = 'pink',
}

export enum FastStatus {
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum GoalKind {
  Duration = 'duration',
}

export type Timestamp = string;

export type StorageMetadata = {
  schemaVersion: StorageSchemaVersion.V1;
  appVersion: string;
  expoVersion: string;
  initializedAt: Timestamp;
  updatedAt: Timestamp;
};

export type FastingGoal = {
  id: string;
  kind: GoalKind.Duration;
  name: string;
  targetDurationHours: number;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type NotificationSettings = {
  fastEndReminderEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string | null;
  dailyReminderNotificationId: string | null;
};

export type WidgetSettings = {
  homeScreenWidgetsEnabled: boolean;
  liveActivitiesEnabled: boolean;
  dynamicIslandEnabled: boolean;
  androidOngoingNotificationEnabled: boolean;
};

export type AppSettings = {
  schemaVersion: StorageSchemaVersion.V1;
  themePreference: ThemePreference;
  accentColorName: AccentColorName;
  goals: readonly FastingGoal[];
  notifications: NotificationSettings;
  widgets: WidgetSettings;
  updatedAt: Timestamp;
};

export type FastSession = {
  id: string;
  status: FastStatus;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  goalDurationHours: number;
  reason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ActiveFastState = {
  schemaVersion: StorageSchemaVersion.V1;
  session: FastSession | null;
  fastEndNotificationId: string | null;
  updatedAt: Timestamp;
};

export type HistoryState = {
  schemaVersion: StorageSchemaVersion.V1;
  sessions: readonly FastSession[];
  updatedAt: Timestamp;
};

export type GraphCacheState = {
  schemaVersion: StorageSchemaVersion.V1;
  generatedFromHistoryUpdatedAt: Timestamp | null;
  weeklyHeatmap: readonly number[];
  monthlyHeatmap: readonly number[];
  yearlyHeatmap: readonly number[];
  monthlyHours: readonly number[];
  durationDistribution: readonly number[];
  completionRate: number | null;
  goalAchievementRate: number | null;
  updatedAt: Timestamp;
};

export type AppStorageValueMap = {
  [StorageKey.Metadata]: StorageMetadata;
  [StorageKey.Settings]: AppSettings;
  [StorageKey.ActiveFast]: ActiveFastState;
  [StorageKey.History]: HistoryState;
  [StorageKey.GraphCache]: GraphCacheState;
};

export type StoredEntry<Key extends StorageKey = StorageKey> = {
  key: Key;
  value: AppStorageValueMap[Key];
};

export type StorageQueryResult<Keys extends readonly StorageKey[]> = Partial<{
  [Key in Keys[number]]: AppStorageValueMap[Key];
}>;

export type AppStorage = {
  insert: <Key extends StorageKey>(key: Key, value: AppStorageValueMap[Key]) => void;
  get: <Key extends StorageKey>(key: Key) => AppStorageValueMap[Key] | undefined;
  getOrDefault: <Key extends StorageKey>(
    key: Key,
    defaultValue: AppStorageValueMap[Key],
  ) => AppStorageValueMap[Key];
  delete: (key: StorageKey) => boolean;
  contains: (key: StorageKey) => boolean;
  query: <Keys extends readonly StorageKey[]>(keys: Keys) => StorageQueryResult<Keys>;
  list: () => readonly StoredEntry[];
  subscribe: (onValueChanged: (key: StorageKey) => void) => () => void;
  clear: () => void;
};

export const createDefaultGoals = (createdAt: Timestamp): readonly FastingGoal[] => [
  {
    id: 'goal-12-hours',
    kind: GoalKind.Duration,
    name: '12 hours',
    targetDurationHours: 12,
    isDefault: false,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'goal-14-hours',
    kind: GoalKind.Duration,
    name: '14 hours',
    targetDurationHours: 14,
    isDefault: false,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'goal-16-hours',
    kind: GoalKind.Duration,
    name: '16 hours',
    targetDurationHours: 16,
    isDefault: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'goal-18-hours',
    kind: GoalKind.Duration,
    name: '18 hours',
    targetDurationHours: 18,
    isDefault: false,
    createdAt,
    updatedAt: createdAt,
  },
];

export const createDefaultStorageMetadata = ({
  appVersion,
  expoVersion,
  initializedAt,
}: {
  appVersion: string;
  expoVersion: string;
  initializedAt: Timestamp;
}): StorageMetadata => ({
  schemaVersion: StorageSchemaVersion.V1,
  appVersion,
  expoVersion,
  initializedAt,
  updatedAt: initializedAt,
});

export const createDefaultAppSettings = (updatedAt: Timestamp): AppSettings => ({
  schemaVersion: StorageSchemaVersion.V1,
  themePreference: ThemePreference.System,
  accentColorName: AccentColorName.Blue,
  goals: createDefaultGoals(updatedAt),
  notifications: {
    fastEndReminderEnabled: true,
    dailyReminderEnabled: false,
    dailyReminderTime: null,
    dailyReminderNotificationId: null,
  },
  widgets: {
    homeScreenWidgetsEnabled: true,
    liveActivitiesEnabled: false,
    dynamicIslandEnabled: false,
    androidOngoingNotificationEnabled: false,
  },
  updatedAt,
});

export const createEmptyActiveFastState = (updatedAt: Timestamp): ActiveFastState => ({
  schemaVersion: StorageSchemaVersion.V1,
  session: null,
  fastEndNotificationId: null,
  updatedAt,
});

export const createEmptyHistoryState = (updatedAt: Timestamp): HistoryState => ({
  schemaVersion: StorageSchemaVersion.V1,
  sessions: [],
  updatedAt,
});

export const createEmptyGraphCacheState = (updatedAt: Timestamp): GraphCacheState => ({
  schemaVersion: StorageSchemaVersion.V1,
  generatedFromHistoryUpdatedAt: null,
  weeklyHeatmap: [],
  monthlyHeatmap: [],
  yearlyHeatmap: [],
  monthlyHours: [],
  durationDistribution: [],
  completionRate: null,
  goalAchievementRate: null,
  updatedAt,
});

const appStorageConfiguration: Configuration = {
  id: 'simple-fasting',
  compareBeforeSet: true,
};

const storage = createMMKV(appStorageConfiguration);

const storageKeys = [
  StorageKey.Metadata,
  StorageKey.Settings,
  StorageKey.ActiveFast,
  StorageKey.History,
  StorageKey.GraphCache,
] as const;

const parseStoredValue = <Value>(rawValue: string | undefined): Value | undefined => {
  if (rawValue === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue) as Value;
  } catch {
    return undefined;
  }
};

export const createAppStorage = (): AppStorage => ({
  insert: (key, value) => storage.set(key, JSON.stringify(value)),

  get: (key) => parseStoredValue<AppStorageValueMap[typeof key]>(storage.getString(key)),

  getOrDefault: (key, defaultValue) =>
    parseStoredValue<AppStorageValueMap[typeof key]>(storage.getString(key)) ?? defaultValue,

  delete: (key) => storage.remove(key),

  contains: (key) => storage.contains(key),

  query: (keys) =>
    keys.reduce<StorageQueryResult<typeof keys>>((result, key) => {
      const value = parseStoredValue<AppStorageValueMap[typeof key]>(storage.getString(key));

      return value === undefined ? result : { ...result, [key]: value };
    }, {}),

  list: () =>
    storageKeys.flatMap((key) => {
      const value = parseStoredValue<AppStorageValueMap[typeof key]>(storage.getString(key));

      return value === undefined ? [] : [{ key, value } as StoredEntry];
    }),

  subscribe: (onValueChanged) => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (storageKeys.includes(key as StorageKey)) {
        onValueChanged(key as StorageKey);
      }
    });

    return () => listener.remove();
  },

  clear: () => storage.clearAll(),
});

export const appStorage = createAppStorage();
