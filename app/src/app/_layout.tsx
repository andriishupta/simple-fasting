import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedbackState } from '@/components/feedback-state';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { AppThemeProvider, useAppThemeColorScheme } from '@/hooks/use-theme';
import { appStorage } from '@/storage/app-storage';
import {
  reconcileActiveFastEndNotification,
  refreshFastSnapshots,
} from '@/storage/fasting-storage';
import {
  reconcileDailyReminderNotification,
  refreshSettingsSnapshot,
} from '@/storage/settings-storage';
import { configureLocalNotificationBehavior } from '@/storage/notification-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

type StartupState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}

function RootLayoutContent() {
  const [startupState, setStartupState] = useState<StartupState>({ status: 'loading' });
  const colorScheme = useAppThemeColorScheme();

  const initializeStorage = (): void => {
    try {
      initializeAppStorage();
      refreshSettingsSnapshot();
      refreshFastSnapshots();
      setStartupState({ status: 'ready' });
      void Promise.all([
        configureLocalNotificationBehavior(),
        reconcileDailyReminderNotification(),
        reconcileActiveFastEndNotification(),
      ]).catch(() => {
        setStartupState({
          status: 'error',
          message: 'Local data loaded, but reminders could not be restored.',
        });
      });
    } catch (error) {
      setStartupState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Storage could not be initialized.',
      });
    }
  };
  const resetLocalAppData = (): void => {
    Alert.alert(
      'Reset local data?',
      'This removes local settings, active fast, and history from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            try {
              appStorage.clear();
              initializeStorage();
            } catch (error) {
              setStartupState({
                status: 'error',
                message:
                  error instanceof Error ? error.message : 'Local app data could not be reset.',
              });
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    queueMicrotask(initializeStorage);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {startupState.status === 'ready' ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="history/[id]" />
        </Stack>
      ) : (
        <StartupScreen
          startupState={startupState}
          onRetry={initializeStorage}
          onReset={resetLocalAppData}
        />
      )}
    </ThemeProvider>
  );
}

function StartupScreen({
  startupState,
  onRetry,
  onReset,
}: {
  startupState: Exclude<StartupState, { status: 'ready' }>;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView type="backgroundElement" style={styles.panel}>
          {startupState.status === 'loading' ? (
            <FeedbackState
              kind="loading"
              title="Starting Simple Fasting"
              description="Preparing local settings and fasting history."
            />
          ) : (
            <FeedbackState
              kind="error"
              title="App data could not load"
              description={startupState.message}
              action={{ label: 'Try Again', onPress: onRetry, variant: 'primary' }}
              secondaryAction={{
                label: 'Reset Local Data',
                onPress: onReset,
                variant: 'danger',
              }}
            />
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  panel: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
