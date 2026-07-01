import { useEffect, useRef, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { t } from '@/locales/i18n';
import { appStorage, StorageKey } from '@/storage/app-storage';
import {
  getRepeatedFailurePromptEventId,
  getDiagnostics,
  markRepeatedFailurePromptShown,
  shareDiagnosticReport,
} from '@/storage/diagnostic-storage';
import {
  getActiveFastState,
  refreshFastSnapshots,
} from '@/storage/fasting-storage';
import { cancelScheduledNotification } from '@/storage/notification-storage';
import { refreshSettingsSnapshot } from '@/storage/settings-storage';
import { resetAppStorage } from '@/storage/storage-migrations';

type CrashReportPromptProviderProps = {
  children: ReactNode;
};

const clearLocalData = async (): Promise<void> => {
  const settingsBeforeClear = appStorage.get(StorageKey.Settings);
  const activeFastBeforeClear = getActiveFastState();

  resetAppStorage();
  refreshSettingsSnapshot();
  refreshFastSnapshots();

  await Promise.all([
    cancelScheduledNotification(
      settingsBeforeClear?.notifications.dailyReminderNotificationId ?? null,
    ),
    cancelScheduledNotification(activeFastBeforeClear.fastEndNotificationId),
  ]).catch(() => undefined);

  router.replace('/');
};

export function CrashReportPromptProvider({
  children,
}: CrashReportPromptProviderProps): ReactNode {
  const promptedLatestEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    const confirmClearLocalData = (): void => {
      Alert.alert(
        t('errors.resetTitle'),
        t('errors.resetMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('errors.clearData'),
            style: 'destructive',
            onPress: () => {
              void clearLocalData().catch(() => {
                Alert.alert(t('errors.clearFailedTitle'), t('errors.clearFailedMessage'));
              });
            },
          },
        ],
      );
    };

    const maybeShowPrompt = (): void => {
      const diagnostics = getDiagnostics();
      const promptEventId = getRepeatedFailurePromptEventId({
        events: diagnostics.events,
        lastPromptedEventId: diagnostics.lastRepeatedFailurePromptEventId,
      });

      if (
        promptEventId === null ||
        promptEventId === promptedLatestEventIdRef.current
      ) {
        return;
      }

      promptedLatestEventIdRef.current = promptEventId;
      markRepeatedFailurePromptShown(promptEventId);
      Alert.alert(
        t('errors.criticalTitle'),
        t('errors.criticalMessage'),
        [
          { text: t('onboarding.notNow'), style: 'cancel' },
          {
            text: t('errors.reportBug'),
            onPress: () => {
              void shareDiagnosticReport().catch(() => {
                Alert.alert(
                  t('errors.reportBugUnavailableTitle'),
                  t('errors.reportBugUnavailableMessage'),
                );
              });
            },
          },
          {
            text: t('errors.lastResortClearData'),
            style: 'destructive',
            onPress: confirmClearLocalData,
          },
        ],
      );
    };

    maybeShowPrompt();

    return appStorage.subscribe((key) => {
      if (key === StorageKey.Diagnostics) {
        maybeShowPrompt();
      }
    });
  }, []);

  return children;
}
