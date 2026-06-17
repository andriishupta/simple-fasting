import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedbackState } from '@/components/feedback-state';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { refreshFastSnapshots } from '@/storage/fasting-storage';
import { refreshSettingsSnapshot, useAppColorScheme } from '@/storage/settings-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

type StartupState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export default function RootLayout() {
  const [startupState, setStartupState] = useState<StartupState>({ status: 'loading' });
  const colorScheme = useAppColorScheme();

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

  useEffect(initializeStorage, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {startupState.status === 'ready' ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="history/[id]" />
        </Stack>
      ) : (
        <StartupScreen startupState={startupState} onRetry={initializeStorage} />
      )}
    </ThemeProvider>
  );
}

function StartupScreen({
  startupState,
  onRetry,
}: {
  startupState: Exclude<StartupState, { status: 'ready' }>;
  onRetry: () => void;
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
              action={{ label: 'Try Again', onPress: onRetry }}
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
