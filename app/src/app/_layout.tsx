import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FeedbackState } from '@/components/feedback-state';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { AppThemeProvider, useAppThemeColorScheme, useTheme } from '@/hooks/use-theme';
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
  const [startupState, setStartupState] = useState<StartupState>(() => {
    try {
      initializeAppStorage();
      refreshSettingsSnapshot();
      refreshFastSnapshots();
      return { status: 'ready' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Storage could not be initialized.',
      };
    }
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <RootLayoutContent startupState={startupState} setStartupState={setStartupState} />
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
  const theme = useTheme();
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
    if (startupState.status !== 'ready') return;

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
  }, [setStartupState, startupState.status]);

  return (
    <ThemeProvider value={navigationTheme}>
      {startupState.status === 'ready' ? (
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
