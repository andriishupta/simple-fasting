import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';

import { refreshFastSnapshots } from '@/features/fast/fasting';
import { refreshSettingsSnapshot, useAppColorScheme } from '@/features/settings/settings';
import { initializeAppStorage } from '@/storage/storage-migrations';

export default function RootLayout() {
  const [, forceRenderAfterStorageInit] = useState(0);
  const colorScheme = useAppColorScheme();

  useEffect(() => {
    initializeAppStorage();
    refreshSettingsSnapshot();
    refreshFastSnapshots();
    forceRenderAfterStorageInit((value) => value + 1);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="history/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
