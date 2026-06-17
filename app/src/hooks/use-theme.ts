import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { getAccentPalette, getEffectiveColorScheme, useSettings } from '@/storage/settings-storage';

export function useTheme() {
  const settings = useSettings();
  const systemColorScheme = useColorScheme();
  const theme = getEffectiveColorScheme({
    themePreference: settings.themePreference,
    systemColorScheme,
  });

  return {
    ...Colors[theme],
    ...getAccentPalette({
      accentColorName: settings.accentColorName,
      colorScheme: theme,
    }),
  };
}
