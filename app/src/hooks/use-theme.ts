import { Colors } from '@/constants/theme';
import { useSettings } from '@/repositories/settings-repository';
import { selectAccentColor, useEffectiveColorScheme } from '@/selectors/settings-selectors';

export function useTheme() {
  const settings = useSettings();
  const theme = useEffectiveColorScheme(settings);

  return {
    ...Colors[theme],
    accent: selectAccentColor(settings),
  };
}
