import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';

import AppTabs from '@/components/app-tabs';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { initializeStorage } from '@/repositories/storage-repository';

export default function TabLayout() {
  const [, setStorageInitialized] = useState(false);
  const colorScheme = useAppColorScheme();

  useEffect(() => {
    initializeStorage();
    setStorageInitialized(true);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
