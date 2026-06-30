import {
  FastStatus,
  StorageKey,
  TimerViewPreference,
  appStorage,
  createDefaultAppSettings,
  createEmptyActiveFastState,
  createEmptyHistoryState,
} from '@/storage/app-storage';
import {
  cancelFast,
  deleteFastSession,
  endFast,
  getActiveFastState,
  getFastSession,
  getHistoryState,
  mergeImportedFastSessions,
  reconcileActiveFastEndNotification,
  refreshFastSnapshots,
  setActiveFastEndReminderEnabled,
  setActiveFastTimerView,
  startFast,
  updateActiveFastStart,
  updateFastSession,
} from '@/storage/fasting-storage';
import * as notificationStorage from '@/storage/notification-storage';
import { getSettings, refreshSettingsSnapshot, saveSettings } from '@/storage/settings-storage';
import * as fastingWidget from '@/widgets/fasting-widget';
import * as fastingLiveActivity from '@/widgets/fasting-live-activity';

jest.mock('@/storage/notification-storage', () => ({
  cancelScheduledNotification: jest.fn(),
  requestLocalNotificationPermission: jest.fn(),
  scheduleDailyReminderNotification: jest.fn(),
  scheduleFastEndNotification: jest.fn(),
}));
jest.mock('@/widgets/fasting-widget', () => ({ updateFastingWidget: jest.fn() }));
jest.mock('@/widgets/fasting-live-activity', () => ({ syncFastingLiveActivity: jest.fn() }));

const initialTime = new Date('2026-06-21T10:00:00.000Z');
const mockCancelScheduledNotification = jest.mocked(
  notificationStorage.cancelScheduledNotification,
);
const mockScheduleFastEndNotification = jest.mocked(
  notificationStorage.scheduleFastEndNotification,
);
const mockUpdateFastingWidget = jest.mocked(fastingWidget.updateFastingWidget);
const mockSyncFastingLiveActivity = jest.mocked(fastingLiveActivity.syncFastingLiveActivity);

describe('fasting lifecycle integration', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(initialTime);
    appStorage.clear();
    saveSettings(createDefaultAppSettings(initialTime.toISOString()));
    appStorage.insert(StorageKey.ActiveFast, createEmptyActiveFastState(initialTime.toISOString()));
    appStorage.insert(StorageKey.History, createEmptyHistoryState(initialTime.toISOString()));
    refreshSettingsSnapshot();
    refreshFastSnapshots();
    mockCancelScheduledNotification.mockResolvedValue(undefined);
    mockScheduleFastEndNotification.mockResolvedValue('fast-end-1');
    mockUpdateFastingWidget.mockClear();
    mockSyncFastingLiveActivity.mockClear();
  });

  afterEach(() => jest.useRealTimers());

  test('starts, persists, ends, and records a fast while coordinating side effects', async () => {
    saveSettings({
      ...getSettings(),
      notifications: {
        ...getSettings().notifications,
        fastEndReminderEnabled: true,
      },
    });
    const active = await startFast({ goalDurationHours: 16, reason: 'Routine' });

    expect(active.session).toMatchObject({
      status: FastStatus.Active,
      goalDurationHours: 16,
      reason: 'Routine',
    });
    expect(getActiveFastState().fastEndNotificationId).toBe('fast-end-1');
    expect(appStorage.get(StorageKey.ActiveFast)).toEqual(getActiveFastState());
    expect(getSettings().lastUsedGoalDurationHours).toBe(16);
    expect(mockScheduleFastEndNotification).toHaveBeenCalledWith({
      session: expect.objectContaining({ goalDurationHours: 16 }),
      enabled: true,
      goalDurationLabel: '16 hours',
    });

    jest.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));
    const completed = await endFast();

    expect(completed).toMatchObject({ status: FastStatus.Completed, reason: 'Routine' });
    expect(getActiveFastState().session).toBeNull();
    expect(getHistoryState().sessions).toHaveLength(1);
    expect(getFastSession(completed!.id)).toEqual(completed);
    expect(mockCancelScheduledNotification).toHaveBeenCalledWith('fast-end-1');
    expect(mockUpdateFastingWidget).toHaveBeenCalled();
    expect(mockSyncFastingLiveActivity).toHaveBeenCalled();
  });

  test('keeps the active fast usable when notification scheduling fails', async () => {
    mockScheduleFastEndNotification.mockRejectedValueOnce(new Error('notifications unavailable'));

    const active = await startFast({ goalDurationHours: 12, reason: null });
    expect(active.session?.status).toBe(FastStatus.Active);
    expect(getActiveFastState().fastEndNotificationId).toBeNull();
  });

  test('coalesces deferred timer view surface sync with the latest snapshot', async () => {
    const requestAnimationFrameMock = jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        setTimeout(() => callback(0), 0);
        return 1;
      });

    try {
      await startFast({ goalDurationHours: 16, reason: null });
      mockUpdateFastingWidget.mockClear();
      mockSyncFastingLiveActivity.mockClear();

      setActiveFastTimerView(TimerViewPreference.Remaining);
      setActiveFastTimerView(TimerViewPreference.Elapsed);

      expect(mockUpdateFastingWidget).not.toHaveBeenCalled();
      expect(mockSyncFastingLiveActivity).not.toHaveBeenCalled();

      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();

      expect(mockUpdateFastingWidget).toHaveBeenCalledTimes(1);
      expect(mockSyncFastingLiveActivity).toHaveBeenCalledTimes(1);
      expect(mockUpdateFastingWidget).toHaveBeenLastCalledWith(
        expect.objectContaining({ timerViewPreference: TimerViewPreference.Elapsed }),
      );
      expect(mockSyncFastingLiveActivity).toHaveBeenLastCalledWith(
        expect.objectContaining({ timerViewPreference: TimerViewPreference.Elapsed }),
      );
    } finally {
      requestAnimationFrameMock.mockRestore();
    }
  });

  test('cancels without history and supports timer/reminder preferences', async () => {
    await startFast({ goalDurationHours: 0, reason: null });
    expect(setActiveFastTimerView(TimerViewPreference.Remaining).timerViewPreference).toBe(
      TimerViewPreference.Remaining,
    );
    expect(appStorage.get(StorageKey.ActiveFast)?.timerViewPreference).toBe(
      TimerViewPreference.Remaining,
    );
    expect((await setActiveFastEndReminderEnabled(false)).fastEndReminderEnabled).toBe(false);
    expect(appStorage.get(StorageKey.ActiveFast)?.timerViewPreference).toBe(
      TimerViewPreference.Remaining,
    );

    await cancelFast();
    expect(getActiveFastState().session).toBeNull();
    expect(getHistoryState().sessions).toEqual([]);

    await startFast({ goalDurationHours: 16, reason: null });
    expect(getActiveFastState().timerViewPreference).toBe(TimerViewPreference.Remaining);
  });

  test('skips duplicate and overlapping imported sessions and reports both counts', async () => {
    await startFast({ goalDurationHours: 16, reason: null });
    jest.setSystemTime(new Date('2026-06-21T20:00:00.000Z'));
    const existing = (await endFast())!;
    const result = mergeImportedFastSessions([
      existing,
      { ...existing, id: 'overlap', startedAt: '2026-06-21T18:00:00.000Z', endedAt: '2026-06-21T22:00:00.000Z' },
      { ...existing, id: 'new', startedAt: '2026-06-22T08:00:00.000Z', endedAt: '2026-06-22T16:00:00.000Z' },
    ]);

    expect(result).toEqual({ saved: 1, skipped: 2 });
    expect(getHistoryState().sessions.map(({ id }) => id)).toContain('new');
  });

  test('does not import sessions while a fast is active', async () => {
    await startFast({ goalDurationHours: 16, reason: null });
    const active = getActiveFastState().session!;
    const result = mergeImportedFastSessions([
      {
        ...active,
        id: 'imported',
        status: FastStatus.Completed,
        endedAt: '2026-06-22T02:00:00.000Z',
      },
    ]);

    expect(result).toEqual({ saved: 0, skipped: 1 });
    expect(getHistoryState().sessions).toEqual([]);
  });

  test('updates active fast start time and reschedules reminders', async () => {
    saveSettings({
      ...getSettings(),
      notifications: {
        ...getSettings().notifications,
        fastEndReminderEnabled: true,
      },
    });
    await startFast({ goalDurationHours: 16, reason: null });
    mockScheduleFastEndNotification.mockResolvedValueOnce('fast-end-2');

    const result = await updateActiveFastStart('2026-06-21T08:00:00.000Z');

    expect(result.status).toBe('updated');
    expect(getActiveFastState().session?.startedAt).toBe('2026-06-21T08:00:00.000Z');
    expect(getActiveFastState().fastEndNotificationId).toBe('fast-end-2');
    expect(mockCancelScheduledNotification).toHaveBeenCalledWith('fast-end-1');
    expect(mockScheduleFastEndNotification).toHaveBeenLastCalledWith({
      session: expect.objectContaining({ startedAt: '2026-06-21T08:00:00.000Z' }),
      enabled: true,
      goalDurationLabel: '16 hours',
    });
  });

  test('rejects future and overlapping active fast start edits', async () => {
    await startFast({ goalDurationHours: 16, reason: null });
    jest.setSystemTime(new Date('2026-06-21T18:00:00.000Z'));
    await endFast();
    jest.setSystemTime(new Date('2026-06-22T10:00:00.000Z'));
    await startFast({ goalDurationHours: 12, reason: null });

    expect((await updateActiveFastStart('2026-06-23T10:00:00.000Z')).status).toBe('future');
    expect((await updateActiveFastStart('2026-06-21T17:00:00.000Z')).status).toBe('overlap');
    expect(getActiveFastState().session?.startedAt).toBe('2026-06-22T10:00:00.000Z');
  });

  test('edits, sorts, and deletes saved sessions', async () => {
    await startFast({ goalDurationHours: 16, reason: null });
    jest.setSystemTime(new Date('2026-06-21T20:00:00.000Z'));
    const first = await endFast();
    await startFast({ goalDurationHours: 12, reason: null });
    jest.setSystemTime(new Date('2026-06-22T08:00:00.000Z'));
    const second = await endFast();

    const updated = updateFastSession({
      sessionId: first!.id,
      update: (session) => ({ ...session, reason: 'Edited' }),
    });
    expect(updated?.reason).toBe('Edited');
    expect(
      updateFastSession({
        sessionId: first!.id,
        update: (session) => ({
          ...session,
          startedAt: '2026-06-22T07:00:00.000Z',
          endedAt: '2026-06-22T09:00:00.000Z',
        }),
      }),
    ).toBeUndefined();
    expect(updateFastSession({ sessionId: 'missing', update: (session) => session })).toBeUndefined();
    expect(getHistoryState().sessions[0].id).toBe(second!.id);

    deleteFastSession(second!.id);
    expect(getHistoryState().sessions.map(({ id }) => id)).toEqual([first!.id]);
  });

  test('reconciles stale notification identifiers', async () => {
    await startFast({ goalDurationHours: 16, reason: null });
    mockScheduleFastEndNotification.mockResolvedValueOnce('fast-end-2');
    const reconciled = await reconcileActiveFastEndNotification();
    expect(mockCancelScheduledNotification).toHaveBeenCalledWith('fast-end-1');
    expect(reconciled.fastEndNotificationId).toBe('fast-end-2');

    await cancelFast();
    const inactive = await reconcileActiveFastEndNotification();
    expect(inactive.fastEndNotificationId).toBeNull();
  });

  test('returns null when ending an inactive state', async () => {
    expect(await endFast()).toBeNull();
  });
});
