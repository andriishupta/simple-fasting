import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { FeedbackState } from '@/components/feedback-state';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import { FastSavedNoticeProvider } from '@/components/fast-saved-notice-context';
import { NotificationOnboardingScreen } from '@/components/notification-onboarding-screen';
import { StartupLogoAnimation } from '@/components/startup-logo-animation';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { AppThemeProvider, useAppThemeColorScheme, useTheme } from '@/hooks/use-theme';
import { DiagnosticEventKind } from '@/storage/app-storage';
import { recordDiagnosticError } from '@/storage/diagnostic-storage';
import {
  reconcileActiveFastEndNotification,
  refreshFastSnapshots,
} from '@/storage/fasting-storage';
import {
  reconcileDailyReminderNotification,
  completeNotificationOnboarding,
  requestLocalNotificationPermission,
  refreshSettingsSnapshot,
  syncNotificationPermissionState,
  useSettings,
} from '@/storage/settings-storage';
import { configureLocalNotificationBehavior } from '@/storage/notification-storage';
import { initializeAppStorage, resetAppStorage } from '@/storage/storage-migrations';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

type StartupState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

function RootLayout() {
  const [startupState, setStartupState] = useState<StartupState>(() => {
    try {
      initializeAppStorage();
      refreshSettingsSnapshot();
      refreshFastSnapshots();
      return { status: 'ready' };
    } catch (error) {
      recordDiagnosticError({ kind: DiagnosticEventKind.StorageInitialization, error });
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Storage could not be initialized.',
      };
    }
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <AppErrorBoundary>
          <RootLayoutContent startupState={startupState} setStartupState={setStartupState} />
        </AppErrorBoundary>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutContent({
  startupState,
  setStartupState,
}: {
  startupState: StartupState;
  setStartupState: React.Dispatch<React.SetStateAction<StartupState>>;
}) {
  const colorScheme = useAppThemeColorScheme();
  const settings = useSettings();
  const theme = useTheme();
  const [logoAnimationDone, setLogoAnimationDone] = useState(false);
  const navigationTheme = useMemo(() => {
    const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: theme.accent,
        background: theme.backgroundElement,
        card: theme.background,
        text: theme.text,
        border: theme.backgroundSelected,
        notification: theme.danger,
      },
    };
  }, [colorScheme, theme]);

  const initializeStorage = (): void => {
    try {
      initializeAppStorage();
      refreshSettingsSnapshot();
      refreshFastSnapshots();
      setStartupState({ status: 'ready' });
    } catch (error) {
      recordDiagnosticError({ kind: DiagnosticEventKind.StorageInitialization, error });
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
              resetAppStorage();
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
    if (startupState.status === 'loading') return;

    void SplashScreen.hideAsync().catch(() => undefined);
  }, [startupState.status]);

  useEffect(() => {
    if (startupState.status !== 'ready') return;

    void (async () => {
      await configureLocalNotificationBehavior();
      await syncNotificationPermissionState();
      await Promise.all([
        reconcileDailyReminderNotification(),
        reconcileActiveFastEndNotification(),
      ]);
    })().catch((error: unknown) => {
      recordDiagnosticError({ kind: DiagnosticEventKind.ReminderReconciliation, error });
      Alert.alert(
        'Reminders unavailable',
        'Your fasting data is safe, but local reminders could not be restored. You can try again from Settings.',
      );
    });
  }, [startupState.status]);

  useEffect(() => {
    if (startupState.status !== 'ready') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      void syncNotificationPermissionState()
        .then(() =>
          Promise.all([
            reconcileDailyReminderNotification(),
            reconcileActiveFastEndNotification(),
          ]),
        )
        .catch((error: unknown) => {
          recordDiagnosticError({ kind: DiagnosticEventKind.ReminderReconciliation, error });
        });
    });

    return () => subscription.remove();
  }, [startupState.status]);

  const allowOnboardingNotifications = async (): Promise<void> => {
    const notificationsAllowed = await requestLocalNotificationPermission();
    completeNotificationOnboarding({ notificationsAllowed });
    refreshSettingsSnapshot();
    await Promise.all([
      reconcileDailyReminderNotification(),
      reconcileActiveFastEndNotification(),
    ]).catch(() => undefined);
  };

  const skipOnboardingNotifications = (): void => {
    completeNotificationOnboarding({ notificationsAllowed: false });
    refreshSettingsSnapshot();
  };

  return (
    <ThemeProvider value={navigationTheme}>
      {startupState.status === 'ready' && !logoAnimationDone ? (
        <StartupLogoAnimation onDone={() => setLogoAnimationDone(true)} />
      ) : startupState.status === 'ready' && !settings.onboardingCompleted ? (
        <NotificationOnboardingScreen
          onAllowNotifications={allowOnboardingNotifications}
          onSkip={skipOnboardingNotifications}
        />
      ) : startupState.status === 'ready' ? (
        <FastSavedNoticeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="history/[id]"
              options={{
                title: 'Edit Fast',
                headerShown: true,
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
            <Stack.Screen
              name="goals"
              options={{
                title: 'Goals',
                headerShown: true,
                headerLargeTitle: true,
                headerTransparent: true,
                headerShadowVisible: false,
                headerBlurEffect: 'none',
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
            <Stack.Screen
              name="faq"
              options={{ title: 'FAQ', headerShown: true, headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen
              name="privacy"
              options={{
                title: 'Privacy Policy',
                headerShown: true,
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
            <Stack.Screen
              name="terms"
              options={{
                title: 'Terms of Use',
                headerShown: true,
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
          </Stack>
        </FastSavedNoticeProvider>
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

export default RootLayout;
