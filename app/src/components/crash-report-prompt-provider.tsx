import { useEffect, useRef, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { appStorage, StorageKey } from '@/storage/app-storage';
import {
  getDiagnostics,
  shareDiagnosticReport,
  shouldPromptForRepeatedFailures,
} from '@/storage/diagnostic-storage';

type CrashReportPromptProviderProps = {
  children: ReactNode;
};

export function CrashReportPromptProvider({
  children,
}: CrashReportPromptProviderProps): ReactNode {
  const promptedLatestEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    const maybeShowPrompt = (): void => {
      const diagnostics = getDiagnostics();
      const latestEventId = diagnostics.events.at(-1)?.id ?? null;

      if (
        latestEventId === null ||
        latestEventId === promptedLatestEventIdRef.current ||
        !shouldPromptForRepeatedFailures({ events: diagnostics.events })
      ) {
        return;
      }

      promptedLatestEventIdRef.current = latestEventId;
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
