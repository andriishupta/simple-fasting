import { router } from 'expo-router';
import { useEffect } from 'react';

import { NotificationOnboardingScreen } from '@/components/notification-onboarding-screen';
import {
  completeNotificationOnboarding,
  reconcileDailyReminderNotification,
  refreshSettingsSnapshot,
  requestLocalNotificationPermission,
  useSettings,
} from '@/storage/settings-storage';
import { reconcileActiveFastEndNotification } from '@/storage/fasting-storage';

export default function NotificationOnboardingRoute() {
  const settings = useSettings();

  useEffect(() => {
    if (!settings.legalConsentAccepted) router.replace('/onboarding');
  }, [settings.legalConsentAccepted]);

  if (!settings.legalConsentAccepted) return null;

  const allowNotifications = async (): Promise<void> => {
    const notificationsAllowed = await requestLocalNotificationPermission();
    completeNotificationOnboarding({ notificationsAllowed });
    refreshSettingsSnapshot();
    await Promise.all([
      reconcileDailyReminderNotification(),
      reconcileActiveFastEndNotification(),
    ]).catch(() => undefined);
    router.replace('/');
  };

  const skipNotifications = (): void => {
    completeNotificationOnboarding({ notificationsAllowed: false });
    refreshSettingsSnapshot();
    router.replace('/');
  };

  return (
    <NotificationOnboardingScreen
      onAllowNotifications={allowNotifications}
      onSkip={skipNotifications}
    />
  );
}
