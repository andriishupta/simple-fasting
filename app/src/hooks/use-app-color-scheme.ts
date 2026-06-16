import { useColorScheme } from 'react-native';

import { selectEffectiveColorScheme } from '@/selectors/settings-selectors';
import { useSettings } from '@/storage/settings-storage';

export const useAppColorScheme = (): 'light' | 'dark' => {
  const settings = useSettings();
  const systemColorScheme = useColorScheme();

  return selectEffectiveColorScheme({
    themePreference: settings.themePreference,
    systemColorScheme,
  });
};
