import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';

import AppTabs from '@/components/app-tabs';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { refreshSettingsSnapshot } from '@/storage/settings-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

export default function TabLayout() {
  const [, forceRenderAfterStorageInit] = useState(0);
  const colorScheme = useAppColorScheme();

  useEffect(() => {
    initializeAppStorage();
    refreshSettingsSnapshot();
    forceRenderAfterStorageInit((value) => value + 1);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
