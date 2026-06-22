export const customGoalId = 'custom-duration';
export const unlimitedGoalId = 'unlimited-duration';
export const maxCustomDurationHours = 7 * 24;

type GoalSelectionOption = {
  id: string;
  targetDurationHours: number;
};

export const formatGoalDuration = (hours: number): string => {
  if (hours === 0) return 'Unlimited';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
};

export const getGoalSelectionId = (
  goals: readonly GoalSelectionOption[],
  durationHoursValue: number,
): string =>
  durationHoursValue === 0
    ? unlimitedGoalId
    : goals.find((goal) => goal.targetDurationHours === durationHoursValue)?.id ?? customGoalId;
