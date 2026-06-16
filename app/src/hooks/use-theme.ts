import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { getAccentColor, getEffectiveColorScheme, useSettings } from '@/features/settings/settings';

export function useTheme() {
  const settings = useSettings();
  const systemColorScheme = useColorScheme();
  const theme = getEffectiveColorScheme({
    themePreference: settings.themePreference,
    systemColorScheme,
  });

  return {
    ...Colors[theme],
    accent: getAccentColor(settings),
  };
}
