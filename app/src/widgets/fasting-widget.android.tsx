"use no memo";

import NativeFastingWidget, {
  type NativeFastingWidgetPayload,
} from 'native-fasting-widget';

import {
  AccentColorName,
  appStorage,
  GoalDurationFormat,
  StorageKey,
  type ActiveFastState,
} from '@/storage/app-storage';
import { getAccentPalette } from '@/storage/settings-storage';
import { createFastingWidgetModel } from '@/widgets/fasting-widget-model';

const lightTheme = {
  background: '#F7F8FC',
  primary: '#17191F',
  secondary: '#626979',
} as const;

const darkTheme = {
  background: '#15171C',
  primary: '#F5F7FF',
  secondary: '#A9AFBD',
} as const;

const getWidgetColors = () => {
  const settings = appStorage.get(StorageKey.Settings);
  const accentColorName = settings?.accentColorName ?? AccentColorName.Amber;

  return {
    lightAccent: getAccentPalette({
      accentColorName,
      colorScheme: 'light',
    }).accent as `#${string}`,
    darkAccent: getAccentPalette({
      accentColorName,
      colorScheme: 'dark',
    }).accent as `#${string}`,
    lightBackground: lightTheme.background,
    darkBackground: darkTheme.background,
    lightPrimary: lightTheme.primary,
    darkPrimary: darkTheme.primary,
    lightSecondary: lightTheme.secondary,
    darkSecondary: darkTheme.secondary,
  };
};

const createNativeWidgetPayload = (state: ActiveFastState): NativeFastingWidgetPayload => {
  const settings = appStorage.get(StorageKey.Settings);
  const goalName = settings?.goals.find(
    (goal) => goal.targetDurationHours === state.session?.goalDurationHours,
  )?.name;
  const model = createFastingWidgetModel(
    state,
    Date.now(),
    goalName,
    settings?.goalDurationFormat,
  );
  const colors = getWidgetColors();
  const durationFormat = settings?.goalDurationFormat ?? GoalDurationFormat.Hours;

  if (model.status === 'inactive') {
    return {
      status: 'inactive',
      headline: model.headline,
      subtitle: model.subtitle,
      durationFormat,
      startedAt: 0,
      goalEndsAt: 0,
      hasGoal: false,
      hasReachedGoal: false,
      progress: 0,
      timerView: 'elapsed',
      ...colors,
    };
  }

  return {
    status: 'active',
    headline: model.headline,
    subtitle: model.subtitle,
    durationFormat,
    startedAt: model.startedAt,
    goalEndsAt: model.goalEndsAt,
    hasGoal: model.hasGoal,
    hasReachedGoal: model.hasReachedGoal,
    progress: model.progress,
    timerView: model.timerView,
    ...colors,
  };
};

export const updateFastingWidget = (state: ActiveFastState): void => {
  try {
    NativeFastingWidget.update(createNativeWidgetPayload(state));
  } catch {
    // Widget availability must never block local fasting state updates.
  }
};
