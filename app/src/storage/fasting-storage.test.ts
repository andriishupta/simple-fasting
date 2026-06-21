jest.mock('@/storage/notification-storage', () => ({
  cancelScheduledNotification: jest.fn(),
  requestLocalNotificationPermission: jest.fn(),
  scheduleDailyReminderNotification: jest.fn(),
  scheduleFastEndNotification: jest.fn(),
}));
jest.mock('@/widgets/fasting-widget', () => ({ updateFastingWidget: jest.fn() }));

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
  reconcileActiveFastEndNotification,
  refreshFastSnapshots,
  setActiveFastEndReminderEnabled,
  setActiveFastTimerView,
  startFast,
  updateFastSession,
} from '@/storage/fasting-storage';
import * as notificationStorage from '@/storage/notification-storage';
import { getSettings, refreshSettingsSnapshot, saveSettings } from '@/storage/settings-storage';
import * as fastingWidget from '@/widgets/fasting-widget';

const initialTime = new Date('2026-06-21T10:00:00.000Z');
const mockCancelScheduledNotification = jest.mocked(
  notificationStorage.cancelScheduledNotification,
);
const mockScheduleFastEndNotification = jest.mocked(
  notificationStorage.scheduleFastEndNotification,
);
const mockUpdateFastingWidget = jest.mocked(fastingWidget.updateFastingWidget);

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
  });

  afterEach(() => jest.useRealTimers());

  test('starts, persists, ends, and records a fast while coordinating side effects', async () => {
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
    });

    jest.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));
    const completed = await endFast();

    expect(completed).toMatchObject({ status: FastStatus.Completed, reason: 'Routine' });
    expect(getActiveFastState().session).toBeNull();
    expect(getHistoryState().sessions).toHaveLength(1);
    expect(getFastSession(completed!.id)).toEqual(completed);
    expect(mockCancelScheduledNotification).toHaveBeenCalledWith('fast-end-1');
    expect(mockUpdateFastingWidget).toHaveBeenCalled();
  });

  test('keeps the active fast usable when notification scheduling fails', async () => {
    mockScheduleFastEndNotification.mockRejectedValueOnce(new Error('notifications unavailable'));

    const active = await startFast({ goalDurationHours: 12, reason: null });
    expect(active.session?.status).toBe(FastStatus.Active);
    expect(getActiveFastState().fastEndNotificationId).toBeNull();
  });

  test('cancels without history and supports timer/reminder preferences', async () => {
    await startFast({ goalDurationHours: 0, reason: null });
    expect(setActiveFastTimerView(TimerViewPreference.Remaining).timerViewPreference).toBe(
      TimerViewPreference.Remaining,
    );
    expect((await setActiveFastEndReminderEnabled(false)).fastEndReminderEnabled).toBe(false);

    await cancelFast();
    expect(getActiveFastState().session).toBeNull();
    expect(getHistoryState().sessions).toEqual([]);
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
