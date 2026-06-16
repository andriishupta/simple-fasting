import { useSettings } from '@/repositories/settings-repository';
import { useEffectiveColorScheme } from '@/selectors/settings-selectors';

export const useAppColorScheme = (): 'light' | 'dark' => {
  const settings = useSettings();

  return useEffectiveColorScheme(settings);
};
