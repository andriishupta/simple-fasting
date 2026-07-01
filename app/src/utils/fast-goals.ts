import { t } from '@/locales/i18n';
import { GoalDurationFormat } from '@/storage/app-storage';

export const customGoalId = 'custom-duration';
export const unlimitedGoalId = 'unlimited-duration';
export const maxCustomDurationHours = 7 * 24;

type GoalSelectionOption = {
  id: string;
  targetDurationHours: number;
};

export const formatGoalDuration = (
  hours: number,
  format: GoalDurationFormat = GoalDurationFormat.Hours,
): string => {
  if (hours === 0) return t('common.unlimited');
  if (format === GoalDurationFormat.Hours) {
    return `${hours} ${hours === 1 ? t('durations.hourOne') : t('durations.hourOther')}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days === 0) return `${hours} ${hours === 1 ? t('durations.hourOne') : t('durations.hourOther')}`;

  return remainingHours === 0
    ? `${days}${t('durations.dayShort')}`
    : `${days}${t('durations.dayShort')} ${remainingHours}${t('durations.hourShort')}`;
};

export const getGoalSelectionId = (
  goals: readonly GoalSelectionOption[],
  durationHoursValue: number,
): string =>
  durationHoursValue === 0
    ? unlimitedGoalId
    : goals.find((goal) => goal.targetDurationHours === durationHoursValue)?.id ?? customGoalId;
