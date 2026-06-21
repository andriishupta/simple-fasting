import { createMMKV, type Configuration } from 'react-native-mmkv';

export enum StorageKey {
  Metadata = 'metadata',
  Settings = 'settings',
  ActiveFast = 'activeFast',
  History = 'history',
  Diagnostics = 'diagnostics',
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

export enum DataViewPreference {
  Stats = 'stats',
  Charts = 'charts',
  History = 'history',
}

export enum TimerViewPreference {
  Elapsed = 'elapsed',
  Remaining = 'remaining',
}

export enum FastStatus {
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum GoalKind {
  Duration = 'duration',
}

export enum FastingGoalType {
  Standard = 'standard',
  Custom = 'custom',
}

export enum DiagnosticEventKind {
  StorageInitialization = 'storage_initialization',
  ReminderReconciliation = 'reminder_reconciliation',
  Render = 'render',
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
  type: FastingGoalType;
  name: string;
  targetDurationHours: number;
  isEnabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type NotificationSettings = {
  fastEndReminderEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string | null;
  dailyReminderNotificationId: string | null;
};

export type AppSettings = {
  schemaVersion: StorageSchemaVersion.V1;
  themePreference: ThemePreference;
  accentColorName: AccentColorName;
  goals: readonly FastingGoal[];
  lastUsedGoalDurationHours: number;
  dataViewPreference: DataViewPreference;
  notifications: NotificationSettings;
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
  fastEndReminderEnabled: boolean;
  timerViewPreference: TimerViewPreference;
  updatedAt: Timestamp;
};

export type HistoryState = {
  schemaVersion: StorageSchemaVersion.V1;
  sessions: readonly FastSession[];
  updatedAt: Timestamp;
};

export type DiagnosticEvent = {
  id: string;
  kind: DiagnosticEventKind;
  occurredAt: Timestamp;
  errorName: string;
  message: string;
  context: string | null;
};

export type DiagnosticsState = {
  schemaVersion: StorageSchemaVersion.V1;
  events: readonly DiagnosticEvent[];
  updatedAt: Timestamp;
};

export type AppStorageValueMap = {
  [StorageKey.Metadata]: StorageMetadata;
  [StorageKey.Settings]: AppSettings;
  [StorageKey.ActiveFast]: ActiveFastState;
  [StorageKey.History]: HistoryState;
  [StorageKey.Diagnostics]: DiagnosticsState;
};

export type AppStorage = {
  insert: <Key extends StorageKey>(key: Key, value: AppStorageValueMap[Key]) => void;
  get: <Key extends StorageKey>(key: Key) => AppStorageValueMap[Key] | undefined;
  getRaw: (key: StorageKey) => string | undefined;
  getOrDefault: <Key extends StorageKey>(
    key: Key,
    defaultValue: AppStorageValueMap[Key],
  ) => AppStorageValueMap[Key];
  quarantine: (key: StorageKey, reason: string) => void;
  subscribe: (onValueChanged: (key: StorageKey) => void) => () => void;
  clear: () => void;
};

export const createDefaultGoals = (createdAt: Timestamp): readonly FastingGoal[] => [
  {
    id: 'goal-12-hours',
    kind: GoalKind.Duration,
    type: FastingGoalType.Standard,
    name: '12:12',
    targetDurationHours: 12,
    isEnabled: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'goal-14-hours',
    kind: GoalKind.Duration,
    type: FastingGoalType.Standard,
    name: '14:10',
    targetDurationHours: 14,
    isEnabled: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'goal-16-hours',
    kind: GoalKind.Duration,
    type: FastingGoalType.Standard,
    name: '16:8',
    targetDurationHours: 16,
    isEnabled: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'goal-18-hours',
    kind: GoalKind.Duration,
    type: FastingGoalType.Standard,
    name: '18:6',
    targetDurationHours: 18,
    isEnabled: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'goal-20-hours',
    kind: GoalKind.Duration,
    type: FastingGoalType.Standard,
    name: '20:4',
    targetDurationHours: 20,
    isEnabled: true,
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
  lastUsedGoalDurationHours: 16,
  dataViewPreference: DataViewPreference.Stats,
  notifications: {
    fastEndReminderEnabled: true,
    dailyReminderEnabled: false,
    dailyReminderTime: null,
    dailyReminderNotificationId: null,
  },
  updatedAt,
});

export const createEmptyActiveFastState = (updatedAt: Timestamp): ActiveFastState => ({
  schemaVersion: StorageSchemaVersion.V1,
  session: null,
  fastEndNotificationId: null,
  fastEndReminderEnabled: true,
  timerViewPreference: TimerViewPreference.Elapsed,
  updatedAt,
});

export const createEmptyHistoryState = (updatedAt: Timestamp): HistoryState => ({
  schemaVersion: StorageSchemaVersion.V1,
  sessions: [],
  updatedAt,
});

export const createEmptyDiagnosticsState = (updatedAt: Timestamp): DiagnosticsState => ({
  schemaVersion: StorageSchemaVersion.V1,
  events: [],
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
  StorageKey.Diagnostics,
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

  getRaw: (key) => storage.getString(key),

  getOrDefault: (key, defaultValue) =>
    parseStoredValue<AppStorageValueMap[typeof key]>(storage.getString(key)) ?? defaultValue,

  quarantine: (key, reason) => {
    const rawValue = storage.getString(key);

    if (rawValue === undefined) {
      return;
    }

    const timestamp = new Date().toISOString();
    const quarantineKey = `corrupt:${key}:${timestamp}`;

    storage.set(
      quarantineKey,
      JSON.stringify({
        key,
        reason,
        rawValue,
        quarantinedAt: timestamp,
      }),
    );
    storage.remove(key);
  },

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
