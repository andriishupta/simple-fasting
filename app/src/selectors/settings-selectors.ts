import type { ColorSchemeName } from 'react-native';

import {
  AccentColorName,
  ThemePreference,
  type AppSettings,
  type FastingGoal,
} from '@/storage/app-storage';

export const accentColorValues: Record<AccentColorName, string> = {
  [AccentColorName.Red]: '#EF4444',
  [AccentColorName.Orange]: '#F97316',
  [AccentColorName.Amber]: '#F59E0B',
  [AccentColorName.Green]: '#22C55E',
  [AccentColorName.Teal]: '#14B8A6',
  [AccentColorName.Blue]: '#3B82F6',
  [AccentColorName.Purple]: '#8B5CF6',
  [AccentColorName.Pink]: '#EC4899',
};

export const accentColorLabels: Record<AccentColorName, string> = {
  [AccentColorName.Red]: 'Red',
  [AccentColorName.Orange]: 'Orange',
  [AccentColorName.Amber]: 'Amber',
  [AccentColorName.Green]: 'Green',
  [AccentColorName.Teal]: 'Teal',
  [AccentColorName.Blue]: 'Blue',
  [AccentColorName.Purple]: 'Purple',
  [AccentColorName.Pink]: 'Pink',
};

export const selectDefaultGoal = (settings: AppSettings): FastingGoal =>
  settings.goals.find((goal) => goal.isDefault) ?? settings.goals[0];

export const selectAccentColor = (settings: AppSettings): string =>
  accentColorValues[settings.accentColorName];

export const selectEffectiveColorScheme = ({
  themePreference,
  systemColorScheme,
}: {
  themePreference: ThemePreference;
  systemColorScheme: ColorSchemeName;
}): 'light' | 'dark' => {
  if (themePreference === ThemePreference.Light) {
    return 'light';
  }

  if (themePreference === ThemePreference.Dark) {
    return 'dark';
  }

  return systemColorScheme === 'dark' ? 'dark' : 'light';
};
