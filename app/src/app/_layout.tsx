import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, usePathname } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FeedbackState } from '@/components/feedback-state';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import { CrashReportPromptProvider } from '@/components/crash-report-prompt-provider';
import { FastSavedNoticeProvider } from '@/components/fast-saved-notice-context';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { AppThemeProvider, useAppThemeColorScheme, useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';
import { DiagnosticEventKind } from '@/storage/app-storage';
import { recordDiagnosticError } from '@/storage/diagnostic-storage';
import {
  reconcileActiveFastEndNotification,
  refreshFastSnapshots,
} from '@/storage/fasting-storage';
import {
  reconcileDailyReminderNotification,
  refreshSettingsSnapshot,
  syncNotificationPermissionState,
  useSettings,
} from '@/storage/settings-storage';
import { configureLocalNotificationBehavior } from '@/storage/notification-storage';
import { initializeAppStorage, resetAppStorage } from '@/storage/storage-migrations';

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
        message: error instanceof Error ? error.message : t('startup.storageInitFailed'),
      };
    }
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <CrashReportPromptProvider>
          <AppErrorBoundary>
            <RootLayoutContent startupState={startupState} setStartupState={setStartupState} />
          </AppErrorBoundary>
        </CrashReportPromptProvider>
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
  const pathname = usePathname();
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
        message: error instanceof Error ? error.message : t('startup.storageInitFailed'),
      });
    }
  };
  const resetLocalAppData = (): void => {
    Alert.alert(
      t('startup.resetTitle'),
      t('startup.resetMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('startup.resetAction'),
          style: 'destructive',
          onPress: () => {
            try {
              resetAppStorage();
              initializeStorage();
            } catch (error) {
              setStartupState({
                status: 'error',
                message: error instanceof Error ? error.message : t('startup.resetFailed'),
              });
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (startupState.status !== 'ready') return;

    void (async () => {
      refreshFastSnapshots();
      await configureLocalNotificationBehavior();
      await syncNotificationPermissionState();
      await Promise.all([
        reconcileDailyReminderNotification(),
        reconcileActiveFastEndNotification(),
      ]);
    })().catch((error: unknown) => {
      recordDiagnosticError({ kind: DiagnosticEventKind.ReminderReconciliation, error });
      Alert.alert(
        t('startup.remindersUnavailableTitle'),
        t('startup.remindersUnavailableMessage'),
      );
    });
  }, [startupState.status]);

  useEffect(() => {
    if (startupState.status !== 'ready') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      refreshFastSnapshots();
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

  const onboardingRequired =
    startupState.status === 'ready' &&
    (!settings.legalConsentAccepted || !settings.onboardingCompleted);

  useEffect(() => {
    if (startupState.status !== 'ready') return;

    if (onboardingRequired && !pathname.startsWith('/onboarding')) {
      router.replace(settings.legalConsentAccepted ? '/onboarding/notifications' : '/onboarding');
      return;
    }

    if (!onboardingRequired && pathname.startsWith('/onboarding')) {
      router.replace('/');
    }
  }, [onboardingRequired, pathname, settings.legalConsentAccepted, startupState.status]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {startupState.status === 'ready' ? (
        <FastSavedNoticeProvider>
          <AppStack
            onboardingRequired={onboardingRequired}
            legalConsentAccepted={settings.legalConsentAccepted}
          />
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

const documentScreenOptions = {
  headerShown: true,
  headerLargeTitle: false,
  headerTransparent: true,
  headerShadowVisible: false,
  headerBlurEffect: 'none' as const,
  headerBackButtonDisplayMode: 'minimal' as const,
};

function AppStack({
  onboardingRequired,
  legalConsentAccepted,
}: {
  onboardingRequired: boolean;
  legalConsentAccepted: boolean;
}) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={onboardingRequired && !legalConsentAccepted}>
        <Stack.Screen name="onboarding/index" />
      </Stack.Protected>
      <Stack.Protected guard={onboardingRequired && legalConsentAccepted}>
        <Stack.Screen
          name="onboarding/notifications"
          options={{
            ...documentScreenOptions,
            title: t('settings.sections.notifications'),
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={onboardingRequired}>
        <Stack.Screen
          name="onboarding/privacy"
          options={{
            ...documentScreenOptions,
            title: t('navigation.privacy'),
          }}
        />
        <Stack.Screen
          name="onboarding/terms"
          options={{
            ...documentScreenOptions,
            title: t('navigation.terms'),
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!onboardingRequired}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="history/[id]"
          options={{
            ...documentScreenOptions,
            title: t('navigation.editFast'),
          }}
        />
        <Stack.Screen
          name="goals"
          options={{
            ...documentScreenOptions,
            title: t('navigation.goals'),
          }}
        />
        <Stack.Screen
          name="goals/new"
          options={{
            ...documentScreenOptions,
            title: t('navigation.newGoal'),
          }}
        />
        <Stack.Screen
          name="goals/[id]"
          options={{
            ...documentScreenOptions,
            title: t('navigation.editGoal'),
          }}
        />
        <Stack.Screen
          name="faq"
          options={{
            ...documentScreenOptions,
            title: t('navigation.faq'),
          }}
        />
        <Stack.Screen
          name="whats-new"
          options={{
            ...documentScreenOptions,
            title: t('navigation.whatsNew'),
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            ...documentScreenOptions,
            title: t('navigation.privacy'),
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            ...documentScreenOptions,
            title: t('navigation.terms'),
          }}
        />
      </Stack.Protected>
    </Stack>
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
              title={t('startup.loadingTitle')}
              description={t('startup.loadingDescription')}
            />
          ) : (
            <FeedbackState
              kind="error"
              title={t('startup.errorTitle')}
              description={startupState.message}
              action={{ label: t('startup.tryAgain'), onPress: onRetry, variant: 'primary' }}
              secondaryAction={{
                label: t('startup.resetLocalData'),
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
