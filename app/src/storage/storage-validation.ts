import {
  AccentColorName,
  DataViewPreference,
  DiagnosticEventKind,
  FastStatus,
  FastingGoalType,
  GoalDurationFormat,
  GoalKind,
  StorageKey,
  StorageSchemaVersion,
  TimerViewPreference,
  ThemePreference,
  appStorage,
  createDefaultGoals,
  createDefaultAppSettings,
  createEmptyDiagnosticsState,
  createEmptyActiveFastState,
  createEmptyHistoryState,
  type ActiveFastState,
  type AppSettings,
  type DiagnosticEvent,
  type DiagnosticsState,
  type FastSession,
  type FastingGoal,
  type HistoryState,
  type StorageMetadata,
  type Timestamp,
} from '@/storage/app-storage';

type RepairResult<Value> = {
  value: Value | undefined;
  repaired: boolean;
  reason: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPositiveNumber = (value: unknown): value is number => isNumber(value) && value > 0;

const isNonNegativeNumber = (value: unknown): value is number => isNumber(value) && value >= 0;

const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value);

const isTimestamp = (value: unknown): value is Timestamp =>
  isString(value) && !Number.isNaN(new Date(value).getTime());

const isEnumValue = <Value extends string>(
  enumValues: readonly Value[],
  value: unknown,
): value is Value => isString(value) && enumValues.includes(value as Value);

const themePreferences = Object.values(ThemePreference);
const accentColorNames = Object.values(AccentColorName);
const dataViewPreferences = Object.values(DataViewPreference);
const timerViewPreferences = Object.values(TimerViewPreference);
const goalDurationFormats = Object.values(GoalDurationFormat);
const fastStatuses = Object.values(FastStatus);
const fastingGoalTypes = Object.values(FastingGoalType);
const diagnosticEventKinds = Object.values(DiagnosticEventKind);

const sanitizeTimestamp = (value: unknown, fallback: Timestamp): Timestamp =>
  isTimestamp(value) ? value : fallback;

const sanitizeNotificationId = (value: unknown): string | null =>
  isNullableString(value) ? value : null;

const sanitizeGoal = (value: unknown, fallbackTimestamp: Timestamp): FastingGoal | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (!isString(value.id) || !isPositiveNumber(value.targetDurationHours)) {
    return null;
  }

  return {
    id: value.id,
    kind: GoalKind.Duration,
    type: isEnumValue(fastingGoalTypes, value.type)
      ? value.type
      : FastingGoalType.Custom,
    name: isString(value.name) && value.name.trim() !== '' ? value.name : `${value.targetDurationHours} hours`,
    targetDurationHours: value.targetDurationHours,
    isEnabled: isBoolean(value.isEnabled) ? value.isEnabled : true,
    createdAt: sanitizeTimestamp(value.createdAt, fallbackTimestamp),
    updatedAt: sanitizeTimestamp(value.updatedAt, fallbackTimestamp),
  };
};

const normalizeGoals = (
  value: unknown,
  fallbackGoals: readonly FastingGoal[],
  timestamp: Timestamp,
): readonly FastingGoal[] => {
  if (!Array.isArray(value)) {
    return fallbackGoals;
  }

  const goals = value.flatMap((goal) => {
    const sanitizedGoal = sanitizeGoal(goal, timestamp);

    return sanitizedGoal === null ? [] : [sanitizedGoal];
  });

  if (goals.length === 0) {
    return fallbackGoals;
  }

  const uniqueGoals = goals.filter(
    (goal, index) =>
      goals.findIndex(
        (candidate) =>
          candidate.id === goal.id ||
          candidate.targetDurationHours === goal.targetDurationHours,
      ) === index,
  );
  const standardGoals = createDefaultGoals(timestamp).map((standardGoal) => {
    const savedGoal = uniqueGoals.find(
      (goal) => goal.targetDurationHours === standardGoal.targetDurationHours,
    );

    return {
      ...standardGoal,
      isEnabled: savedGoal?.isEnabled ?? true,
      createdAt: savedGoal?.createdAt ?? standardGoal.createdAt,
      updatedAt: savedGoal?.updatedAt ?? standardGoal.updatedAt,
    };
  });
  const standardDurations = new Set(standardGoals.map((goal) => goal.targetDurationHours));
  const customGoals = uniqueGoals
    .filter((goal) => !standardDurations.has(goal.targetDurationHours))
    .map((goal) => ({ ...goal, type: FastingGoalType.Custom }));
  const mergedGoals = [...standardGoals, ...customGoals];
  const enabledGoals = mergedGoals.filter((goal) => goal.isEnabled);
  const fallbackGoal =
    enabledGoals.find((goal) => goal.id === 'goal-16-hours') ??
    enabledGoals[0] ??
    mergedGoals.find((goal) => goal.id === 'goal-16-hours') ??
    mergedGoals[0];

  return mergedGoals.map((goal) => ({
    ...goal,
    isEnabled: goal.id === fallbackGoal.id ? true : goal.isEnabled,
  }));
};

export const repairSettings = (
  value: unknown,
  timestamp: Timestamp,
): RepairResult<AppSettings> => {
  const defaults = createDefaultAppSettings(timestamp);

  if (value === undefined) {
    return { value: undefined, repaired: false, reason: null };
  }

  if (!isRecord(value)) {
    return { value: defaults, repaired: true, reason: 'Settings root was not an object.' };
  }

  const notifications = isRecord(value.notifications) ? value.notifications : {};
  const repaired: AppSettings = {
    schemaVersion: StorageSchemaVersion.V1,
    themePreference: isEnumValue(themePreferences, value.themePreference)
      ? value.themePreference
      : defaults.themePreference,
    accentColorName: isEnumValue(accentColorNames, value.accentColorName)
      ? value.accentColorName
      : defaults.accentColorName,
    goals: normalizeGoals(value.goals, defaults.goals, timestamp),
    lastUsedGoalDurationHours: isNonNegativeNumber(value.lastUsedGoalDurationHours)
      ? value.lastUsedGoalDurationHours
      : defaults.lastUsedGoalDurationHours,
    goalDurationFormat: isEnumValue(goalDurationFormats, value.goalDurationFormat)
      ? value.goalDurationFormat
      : defaults.goalDurationFormat,
    dataViewPreference:
      value.dataViewPreference === 'graphs'
        ? DataViewPreference.Charts
        : isEnumValue(dataViewPreferences, value.dataViewPreference)
          ? value.dataViewPreference
          : defaults.dataViewPreference,
    legalConsentAccepted: isBoolean(value.legalConsentAccepted)
      ? value.legalConsentAccepted
      : defaults.legalConsentAccepted,
    onboardingCompleted: isBoolean(value.onboardingCompleted)
      ? value.onboardingCompleted
      : defaults.onboardingCompleted,
    notificationPromptShown: isBoolean(value.notificationPromptShown)
      ? value.notificationPromptShown
      : defaults.notificationPromptShown,
    notifications: {
      fastEndReminderEnabled: isBoolean(notifications.fastEndReminderEnabled)
        ? notifications.fastEndReminderEnabled
        : defaults.notifications.fastEndReminderEnabled,
      dailyReminderEnabled: isBoolean(notifications.dailyReminderEnabled)
        ? notifications.dailyReminderEnabled
        : defaults.notifications.dailyReminderEnabled,
      dailyReminderTime: isNullableString(notifications.dailyReminderTime)
        ? notifications.dailyReminderTime
        : defaults.notifications.dailyReminderTime,
      dailyReminderNotificationId: sanitizeNotificationId(
        notifications.dailyReminderNotificationId,
      ),
    },
    updatedAt: sanitizeTimestamp(value.updatedAt, timestamp),
  };

  return { value: repaired, repaired: true, reason: 'Settings were normalized.' };
};

const sanitizeSession = (value: unknown, timestamp: Timestamp): FastSession | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isString(value.id) ||
    !isEnumValue(fastStatuses, value.status) ||
    !isTimestamp(value.startedAt) ||
    !isNonNegativeNumber(value.goalDurationHours)
  ) {
    return null;
  }

  const endedAt = isNullableString(value.endedAt) && (value.endedAt === null || isTimestamp(value.endedAt))
    ? value.endedAt
    : null;

  if (endedAt !== null && new Date(endedAt).getTime() <= new Date(value.startedAt).getTime()) {
    return null;
  }

  return {
    id: value.id,
    status: value.status,
    startedAt: value.startedAt,
    endedAt,
    goalDurationHours: value.goalDurationHours,
    reason: isNullableString(value.reason) ? value.reason : null,
    createdAt: sanitizeTimestamp(value.createdAt, timestamp),
    updatedAt: sanitizeTimestamp(value.updatedAt, timestamp),
  };
};

export const repairActiveFast = (
  value: unknown,
  timestamp: Timestamp,
): RepairResult<ActiveFastState> => {
  if (value === undefined) {
    return { value: undefined, repaired: false, reason: null };
  }

  if (!isRecord(value)) {
    return {
      value: createEmptyActiveFastState(timestamp),
      repaired: true,
      reason: 'Active fast root was not an object.',
    };
  }

  const session = value.session === null ? null : sanitizeSession(value.session, timestamp);

  return {
    value: {
      schemaVersion: StorageSchemaVersion.V1,
      session,
      fastEndNotificationId: sanitizeNotificationId(value.fastEndNotificationId),
      fastEndReminderEnabled: isBoolean(value.fastEndReminderEnabled)
        ? value.fastEndReminderEnabled
        : true,
      timerViewPreference: isEnumValue(timerViewPreferences, value.timerViewPreference)
        ? value.timerViewPreference
        : TimerViewPreference.Elapsed,
      updatedAt: sanitizeTimestamp(value.updatedAt, timestamp),
    },
    repaired: true,
    reason: 'Active fast was normalized.',
  };
};

export const repairHistory = (
  value: unknown,
  timestamp: Timestamp,
): RepairResult<HistoryState> => {
  if (value === undefined) {
    return { value: undefined, repaired: false, reason: null };
  }

  if (!isRecord(value)) {
    return {
      value: createEmptyHistoryState(timestamp),
      repaired: true,
      reason: 'History root was not an object.',
    };
  }

  const sessions = Array.isArray(value.sessions)
    ? value.sessions.flatMap((session) => {
        const sanitizedSession = sanitizeSession(session, timestamp);

        return sanitizedSession === null ? [] : [sanitizedSession];
      })
    : [];

  return {
    value: {
      schemaVersion: StorageSchemaVersion.V1,
      sessions: sessions.sort((first, second) => second.startedAt.localeCompare(first.startedAt)),
      updatedAt: sanitizeTimestamp(value.updatedAt, timestamp),
    },
    repaired: true,
    reason: 'History was normalized.',
  };
};

export const repairMetadata = (
  value: unknown,
  timestamp: Timestamp,
): RepairResult<StorageMetadata> => {
  if (value === undefined) {
    return { value: undefined, repaired: false, reason: null };
  }

  if (!isRecord(value)) {
    return { value: undefined, repaired: true, reason: 'Metadata root was not an object.' };
  }

  return {
    value: {
      schemaVersion: StorageSchemaVersion.V1,
      appVersion: isString(value.appVersion) ? value.appVersion : '0.0.0',
      expoVersion: isString(value.expoVersion) ? value.expoVersion : 'unknown',
      initializedAt: sanitizeTimestamp(value.initializedAt, timestamp),
      updatedAt: sanitizeTimestamp(value.updatedAt, timestamp),
    },
    repaired: true,
    reason: 'Metadata was normalized.',
  };
};

const sanitizeDiagnosticEvent = (value: unknown): DiagnosticEvent | null => {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !isEnumValue(diagnosticEventKinds, value.kind) ||
    !isTimestamp(value.occurredAt) ||
    !isString(value.errorName) ||
    !isString(value.message)
  ) {
    return null;
  }

  return {
    id: value.id,
    kind: value.kind,
    occurredAt: value.occurredAt,
    errorName: value.errorName,
    message: value.message,
    context: isNullableString(value.context) ? value.context : null,
  };
};

export const repairDiagnostics = (
  value: unknown,
  timestamp: Timestamp,
): RepairResult<DiagnosticsState> => {
  if (value === undefined) {
    return { value: undefined, repaired: false, reason: null };
  }

  if (!isRecord(value)) {
    return {
      value: createEmptyDiagnosticsState(timestamp),
      repaired: true,
      reason: 'Diagnostics root was not an object.',
    };
  }

  const events = Array.isArray(value.events)
    ? value.events.flatMap((event) => {
        const sanitizedEvent = sanitizeDiagnosticEvent(event);
        return sanitizedEvent === null ? [] : [sanitizedEvent];
      }).slice(-50)
    : [];

  return {
    value: {
      schemaVersion: StorageSchemaVersion.V1,
      events,
      updatedAt: sanitizeTimestamp(value.updatedAt, timestamp),
    },
    repaired: true,
    reason: 'Diagnostics were normalized.',
  };
};

export const quarantineIfRawParseFailed = (key: StorageKey): void => {
  if (appStorage.getRaw(key) !== undefined && appStorage.get(key) === undefined) {
    appStorage.quarantine(key, 'Stored value was not valid JSON.');
  }
};
