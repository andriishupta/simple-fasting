import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { selectAccentColor, selectEffectiveColorScheme } from '@/selectors/settings-selectors';
import { useSettings } from '@/storage/settings-storage';

export function useTheme() {
  const settings = useSettings();
  const systemColorScheme = useColorScheme();
  const theme = selectEffectiveColorScheme({
    themePreference: settings.themePreference,
    systemColorScheme,
  });

  return {
    ...Colors[theme],
    accent: selectAccentColor(settings),
  };
}
