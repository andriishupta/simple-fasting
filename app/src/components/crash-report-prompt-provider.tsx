import { useEffect, useRef, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

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
        'Clear all local data?',
        'This is a last-resort recovery option. It permanently removes local settings, active fast, and fasting history from this device. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Data',
            style: 'destructive',
            onPress: () => {
              void clearLocalData().catch(() => {
                Alert.alert('Clear failed', 'Local data could not be cleared.');
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
        'Simple Fasting keeps stopping',
        'Simple Fasting is local-first, so we do not upload analytics or crash reports automatically. We noticed the app stopped a few times recently. Please report this bug and include the local diagnostics so we can fix it.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Report Bug',
            onPress: () => {
              void shareDiagnosticReport().catch(() => {
                Alert.alert(
                  'Report unavailable',
                  'The local diagnostic report could not be created. You can email bugs@simplefasting.app directly.',
                );
              });
            },
          },
          {
            text: 'Clear Data',
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
