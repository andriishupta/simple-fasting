import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { getAccentPalette, getEffectiveColorScheme, useSettings } from '@/storage/settings-storage';

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
  const settings = useSettings();
  const systemColorScheme = useColorScheme();
  const colorScheme = getEffectiveColorScheme({
    themePreference: settings.themePreference,
    systemColorScheme,
  });
  const theme = useMemo(
    () => ({
      ...Colors[colorScheme],
      ...getAccentPalette({
        accentColorName: settings.accentColorName,
        colorScheme,
      }),
    }),
    [colorScheme, settings.accentColorName],
  );
  const value = useMemo(() => ({ colorScheme, theme }), [colorScheme, theme]);

  return createElement(AppThemeContext.Provider, { value }, children);
}

export function useTheme(): ResolvedTheme {
  return useContext(AppThemeContext).theme;
}

export function useAppThemeColorScheme(): 'light' | 'dark' {
  return useContext(AppThemeContext).colorScheme;
}
