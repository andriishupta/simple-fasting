import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { type FastSession } from '@/storage/app-storage';

const notificationChannelId = 'fasting-reminders';

export enum LocalNotificationPermissionState {
  Granted = 'granted',
  Denied = 'denied',
  Undetermined = 'undetermined',
}

export const configureLocalNotificationBehavior = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

export const parseReminderTime = (time: string): { hour: number; minute: number } | null => {
  if (!/^\d{1,2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
};

export const requestLocalNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(notificationChannelId, {
      name: 'Fasting reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();

  if (existingPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();

  return requestedPermissions.granted;
};

export const getLocalNotificationPermissionState = async (): Promise<LocalNotificationPermissionState> => {
  if (Platform.OS === 'web') {
    return LocalNotificationPermissionState.Denied;
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.granted) return LocalNotificationPermissionState.Granted;
  return permissions.status === Notifications.PermissionStatus.UNDETERMINED
    ? LocalNotificationPermissionState.Undetermined
    : LocalNotificationPermissionState.Denied;
};

export const hasLocalNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();

  return permissions.granted;
};

export const cancelScheduledNotification = async (
  notificationId: string | null,
): Promise<void> => {
  if (notificationId === null || Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const scheduleFastEndNotification = async ({
  session,
  enabled,
}: {
  session: FastSession;
  enabled: boolean;
}): Promise<string | null> => {
  if (!enabled || session.goalDurationHours <= 0 || Platform.OS === 'web') {
    return null;
  }

  if (!(await hasLocalNotificationPermission())) {
    return null;
  }

  const triggerDate = new Date(
    new Date(session.startedAt).getTime() + session.goalDurationHours * 3_600_000,
  );

  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Fast goal reached',
      body: `${session.goalDurationHours} hour fast complete.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: notificationChannelId,
    },
  });
};

export const scheduleDailyReminderNotification = async (
  dailyReminderTime: string,
): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return null;
  }

  const reminderTime = parseReminderTime(dailyReminderTime);

  if (reminderTime === null || !(await hasLocalNotificationPermission())) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ready to start your fast?',
      body: 'Open Simple Fasting when you are ready.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminderTime.hour,
      minute: reminderTime.minute,
      channelId: notificationChannelId,
    },
  });
};
