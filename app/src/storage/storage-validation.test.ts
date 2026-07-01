import {
  AccentColorName,
  DataViewPreference,
  DiagnosticEventKind,
  FastStatus,
  GoalDurationFormat,
  StorageSchemaVersion,
  ThemePreference,
  createDefaultGoals,
} from '@/storage/app-storage';
import {
  repairActiveFast,
  repairDiagnostics,
  repairHistory,
  repairMetadata,
  repairSettings,
} from '@/storage/storage-validation';

const timestamp = '2026-06-21T12:00:00.000Z';

describe('storage validation', () => {
  test('preserves missing values so initialization can supply defaults', () => {
    expect(repairSettings(undefined, timestamp)).toEqual({ value: undefined, repaired: false, reason: null });
    expect(repairActiveFast(undefined, timestamp)).toEqual({ value: undefined, repaired: false, reason: null });
    expect(repairHistory(undefined, timestamp)).toEqual({ value: undefined, repaired: false, reason: null });
    expect(repairMetadata(undefined, timestamp)).toEqual({ value: undefined, repaired: false, reason: null });
    expect(repairDiagnostics(undefined, timestamp)).toEqual({ value: undefined, repaired: false, reason: null });
  });

  test('repairs settings enums, legacy charts name, notifications, and goals', () => {
    const result = repairSettings(
      {
        themePreference: 'invalid',
        accentColorName: AccentColorName.Green,
        dataViewPreference: 'graphs',
        goalDurationFormat: 'invalid',
        liveActivitiesEnabled: true,
        legalConsentAccepted: true,
        lastUsedGoalDurationHours: -1,
        notifications: {
          fastEndReminderEnabled: false,
          dailyReminderEnabled: true,
          dailyReminderTime: '20:30',
          dailyReminderNotificationId: 123,
        },
        goals: [
          { id: 'duplicate-standard', targetDurationHours: 16, name: 'Saved 16', isEnabled: false },
          { id: 'custom-24', targetDurationHours: 24, name: '', isEnabled: false },
          { id: 'duplicate-24', targetDurationHours: 24, name: 'Duplicate' },
          { id: 'broken', targetDurationHours: 0 },
        ],
      },
      timestamp,
    );

    expect(result.repaired).toBe(true);
    expect(result.value).toMatchObject({
      schemaVersion: StorageSchemaVersion.V1,
      themePreference: ThemePreference.System,
      accentColorName: AccentColorName.Green,
      dataViewPreference: DataViewPreference.Charts,
      goalDurationFormat: GoalDurationFormat.Hours,
      liveActivitiesEnabled: true,
      legalConsentAccepted: true,
      lastUsedGoalDurationHours: 16,
      notifications: {
        fastEndReminderEnabled: false,
        dailyReminderEnabled: true,
        dailyReminderTime: '20:30',
        dailyReminderNotificationId: null,
      },
    });
    expect(result.value?.goals).toHaveLength(6);
    expect(result.value?.goals.filter((goal) => goal.isEnabled).length).toBeGreaterThan(0);
    expect(result.value?.goals.find((goal) => goal.targetDurationHours === 24)).toMatchObject({
      name: '24 hours',
      isEnabled: false,
    });
  });

  test('preserves all-disabled goals during repair', () => {
    const result = repairSettings(
      {
        goals: createDefaultGoals(timestamp).map((goal) => ({ ...goal, isEnabled: false })),
      },
      timestamp,
    );

    expect(result.value?.goals).toHaveLength(5);
    expect(result.value?.goals.every((goal) => !goal.isEnabled)).toBe(true);
  });

  test('drops invalid active sessions and repairs active preferences', () => {
    const result = repairActiveFast(
      {
        session: {
          id: 'bad',
          status: FastStatus.Active,
          startedAt: timestamp,
          endedAt: '2026-06-20T12:00:00.000Z',
          goalDurationHours: 16,
        },
        fastEndNotificationId: 'notification-1',
        fastEndReminderEnabled: 'yes',
        timerViewPreference: 'invalid',
      },
      timestamp,
    );

    expect(result.value).toMatchObject({
      session: null,
      fastEndNotificationId: 'notification-1',
      fastEndReminderEnabled: true,
      timerViewPreference: 'elapsed',
    });
  });

  test('filters malformed history and sorts newest first', () => {
    const result = repairHistory(
      {
        sessions: [
          { id: 'old', status: FastStatus.Completed, startedAt: '2026-06-19T00:00:00.000Z', endedAt: '2026-06-19T12:00:00.000Z', goalDurationHours: 12 },
          { id: 'broken', status: 'wat', startedAt: timestamp, endedAt: null, goalDurationHours: 12 },
          { id: 'new', status: FastStatus.Completed, startedAt: '2026-06-20T00:00:00.000Z', endedAt: '2026-06-20T16:00:00.000Z', goalDurationHours: 16 },
        ],
      },
      timestamp,
    );

    expect(result.value?.sessions.map(({ id }) => id)).toEqual(['new', 'old']);
  });

  test('repairs metadata and rejects non-object roots safely', () => {
    expect(repairSettings('broken', timestamp).value).toMatchObject({
      themePreference: ThemePreference.System,
    });
    expect(repairHistory(null, timestamp).value?.sessions).toEqual([]);
    expect(repairMetadata({ appVersion: 2, expoVersion: '56' }, timestamp).value).toEqual({
      schemaVersion: StorageSchemaVersion.V1,
      appVersion: '0.0.0',
      expoVersion: '56',
      initializedAt: timestamp,
      updatedAt: timestamp,
    });
  });

  test('keeps only valid diagnostic events', () => {
    const result = repairDiagnostics({
      events: [
        {
          id: 'valid',
          kind: DiagnosticEventKind.Render,
          occurredAt: timestamp,
          errorName: 'Error',
          message: 'Render failed',
          context: null,
        },
        { id: 'invalid', kind: 'analytics_event', occurredAt: timestamp },
      ],
      lastRepeatedFailurePromptEventId: 'valid',
      updatedAt: timestamp,
    }, timestamp);

    expect(result.value?.events).toEqual([
      expect.objectContaining({ id: 'valid', kind: DiagnosticEventKind.Render }),
    ]);
    expect(result.value?.lastRepeatedFailurePromptEventId).toBe('valid');
    expect(repairDiagnostics('broken', timestamp).value?.events).toEqual([]);
  });
});
