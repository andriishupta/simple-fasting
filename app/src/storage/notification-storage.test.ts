import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { FastStatus } from '@/storage/app-storage';
import {
  cancelScheduledNotification,
  configureLocalNotificationBehavior,
  hasLocalNotificationPermission,
  getLocalNotificationPermissionState,
  LocalNotificationPermissionState,
  openLocalNotificationSettings,
  parseReminderTime,
  requestLocalNotificationPermission,
  scheduleDailyReminderNotification,
  scheduleFastEndNotification,
} from '@/storage/notification-storage';
import { createSession } from '../../test/fixtures';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  PermissionStatus: { UNDETERMINED: 'undetermined' },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

const setPlatform = (os: typeof Platform.OS): void => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
};

describe('notification storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-21T10:00:00.000Z'));
    setPlatform('ios');
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as never);
    jest.mocked(Notifications.setNotificationChannelAsync).mockResolvedValue(undefined as never);
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockResolvedValue(undefined as never);
    jest.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('notification-1');
  });

  afterEach(() => jest.useRealTimers());

  test.each([
    ['00:00', { hour: 0, minute: 0 }],
    ['23:59', { hour: 23, minute: 59 }],
    ['7:05', { hour: 7, minute: 5 }],
  ])('parses %s', (value, expected) => {
    expect(parseReminderTime(value)).toEqual(expected);
  });

  test.each(['24:00', '-1:00', '12:60', 'nope', '12.5:00', '12:'])('rejects %s', (value) => {
    expect(parseReminderTime(value)).toBeNull();
  });

  test('configures foreground notification behavior outside web', async () => {
    await configureLocalNotificationBehavior();
    expect(Notifications.setNotificationHandler).toHaveBeenCalled();

    setPlatform('web');
    jest.mocked(Notifications.setNotificationHandler).mockClear();
    await configureLocalNotificationBehavior();
    expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
  });

  test('requests permission and creates the Android channel', async () => {
    setPlatform('android');
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    expect(await requestLocalNotificationPermission()).toBe(true);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'fasting-reminders',
      expect.objectContaining({ name: 'Fasting reminders' }),
    );
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();

    setPlatform('web');
    expect(await requestLocalNotificationPermission()).toBe(false);
    expect(await hasLocalNotificationPermission()).toBe(false);
  });

  test('reads existing permission and cancels only valid native identifiers', async () => {
    expect(await hasLocalNotificationPermission()).toBe(true);
    expect(await requestLocalNotificationPermission()).toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();

    await cancelScheduledNotification(null);
    await cancelScheduledNotification('notification-1');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);

    setPlatform('web');
    await cancelScheduledNotification('notification-2');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  });

  test('distinguishes granted, denied, and undetermined permission states', async () => {
    expect(await getLocalNotificationPermissionState()).toBe(
      LocalNotificationPermissionState.Granted,
    );
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
      granted: false,
      status: 'undetermined',
    } as never);
    expect(await getLocalNotificationPermissionState()).toBe(
      LocalNotificationPermissionState.Undetermined,
    );
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
      granted: false,
      status: 'denied',
    } as never);
    expect(await getLocalNotificationPermissionState()).toBe(
      LocalNotificationPermissionState.Denied,
    );
  });

  test('opens platform notification settings', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    await openLocalNotificationSettings();
    expect(openSettings).toHaveBeenCalledTimes(1);

    setPlatform('android');
    const sendIntent = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined);

    await openLocalNotificationSettings();
    expect(sendIntent).toHaveBeenCalledWith(
      'android.settings.APP_NOTIFICATION_SETTINGS',
      expect.arrayContaining([
        expect.objectContaining({ key: 'android.provider.extra.APP_PACKAGE' }),
      ]),
    );
  });

  test('schedules a future fast-end notification', async () => {
    const session = createSession({
      id: 'active',
      status: FastStatus.Active,
      startedAt: '2026-06-21T09:00:00.000Z',
      endedAt: null,
      goalDurationHours: 16,
    });

    expect(await scheduleFastEndNotification({ session, enabled: true })).toBe('notification-1');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Fast goal reached' }),
        trigger: expect.objectContaining({ type: 'date', channelId: 'fasting-reminders' }),
      }),
    );
  });

  test('does not schedule disabled, open-ended, past, web, or unauthorized fast reminders', async () => {
    const future = createSession({ id: 'future', status: FastStatus.Active, startedAt: '2026-06-21T09:00:00.000Z', endedAt: null, goalDurationHours: 16 });
    expect(await scheduleFastEndNotification({ session: future, enabled: false })).toBeNull();
    expect(await scheduleFastEndNotification({ session: { ...future, goalDurationHours: 0 }, enabled: true })).toBeNull();
    expect(await scheduleFastEndNotification({ session: { ...future, startedAt: '2026-06-20T00:00:00.000Z' }, enabled: true })).toBeNull();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    expect(await scheduleFastEndNotification({ session: future, enabled: true })).toBeNull();
    setPlatform('web');
    expect(await scheduleFastEndNotification({ session: future, enabled: true })).toBeNull();
  });

  test('fails closed when native notification APIs reject', async () => {
    const future = createSession({
      id: 'future',
      status: FastStatus.Active,
      startedAt: '2026-06-21T09:00:00.000Z',
      endedAt: null,
      goalDurationHours: 16,
    });

    jest.mocked(Notifications.getPermissionsAsync).mockRejectedValueOnce(new Error('disabled') as never);
    expect(await hasLocalNotificationPermission()).toBe(false);

    jest.mocked(Notifications.scheduleNotificationAsync).mockRejectedValueOnce(new Error('denied') as never);
    expect(await scheduleFastEndNotification({ session: future, enabled: true })).toBeNull();

    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockRejectedValueOnce(new Error('missing') as never);
    await expect(cancelScheduledNotification('old')).resolves.toBeUndefined();
  });

  test('schedules only valid authorized daily reminders', async () => {
    expect(await scheduleDailyReminderNotification('20:30')).toBe('notification-1');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: expect.objectContaining({ type: 'daily', hour: 20, minute: 30 }) }),
    );
    expect(await scheduleDailyReminderNotification('invalid')).toBeNull();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    expect(await scheduleDailyReminderNotification('21:00')).toBeNull();
  });
});
