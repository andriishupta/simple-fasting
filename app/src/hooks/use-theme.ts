import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { ThemePreference } from '@/storage/app-storage';
import {
  getAccentPalette,
  getEffectiveColorScheme,
  useSettingsSelector,
} from '@/storage/settings-storage';

type ResolvedTheme = Record<keyof typeof Colors.light, string>;
type AppThemeContextValue = {
  colorScheme: 'light' | 'dark';
  theme: ResolvedTheme;
};

const fallbackTheme: AppThemeContextValue = {
  colorScheme: 'light',
  theme: Colors.light,
};

const AppThemeContext = createContext<AppThemeContextValue>(fallbackTheme);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const themePreference = useSettingsSelector((settings) => settings.themePreference);
  const accentColorName = useSettingsSelector((settings) => settings.accentColorName);
  const systemColorScheme = useColorScheme();
  const colorScheme = getEffectiveColorScheme({
    themePreference,
    systemColorScheme,
  });
  const theme = useMemo(
    () => ({
      ...Colors[colorScheme],
      ...getAccentPalette({
        accentColorName,
        colorScheme,
      }),
    }),
    [accentColorName, colorScheme],
  );
  useLayoutEffect(() => {
    if (Platform.OS === 'web' || typeof Appearance.setColorScheme !== 'function') {
      return;
    }

    Appearance.setColorScheme(
      themePreference === ThemePreference.System ? 'unspecified' : colorScheme,
    );
  }, [colorScheme, themePreference]);
  const value = useMemo(() => ({ colorScheme, theme }), [colorScheme, theme]);

  return createElement(AppThemeContext.Provider, { value }, children);
}

export function useTheme(): ResolvedTheme {
  return useContext(AppThemeContext).theme;
}

export function useAppThemeColorScheme(): 'light' | 'dark' {
  return useContext(AppThemeContext).colorScheme;
}
