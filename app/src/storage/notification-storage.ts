import { Platform } from 'react-native';

import { type FastSession } from '@/storage/app-storage';

const notificationChannelId = 'fasting-reminders';

export const configureLocalNotificationBehavior = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

const parseReminderTime = (time: string): { hour: number; minute: number } | null => {
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

  const Notifications = await import('expo-notifications');

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

export const hasLocalNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }

  const Notifications = await import('expo-notifications');
  const permissions = await Notifications.getPermissionsAsync();

  return permissions.granted;
};

export const cancelScheduledNotification = async (
  notificationId: string | null,
): Promise<void> => {
  if (notificationId === null || Platform.OS === 'web') {
    return;
  }

  const Notifications = await import('expo-notifications');

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

  const Notifications = await import('expo-notifications');
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

  const Notifications = await import('expo-notifications');

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
