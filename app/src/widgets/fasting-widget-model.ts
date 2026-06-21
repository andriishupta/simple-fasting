import {
  TimerViewPreference,
  type ActiveFastState,
} from '@/storage/app-storage';

export type FastingWidgetModel =
  | {
      status: 'inactive';
      accessibilityLabel: string;
      headline: string;
      subtitle: string;
    }
  | {
      status: 'active';
      accessibilityLabel: string;
      displayTime: string;
      goalDurationHours: number;
      goalEndsAt: number;
      hasGoal: boolean;
      progress: number;
      startedAt: number;
      subtitle: string;
      timerView: TimerViewPreference;
    };

const formatTimerMinutes = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);

  return `${hours}h ${String(safeMinutes % 60).padStart(2, '0')}m`;
};

export const createFastingWidgetModel = (
  state: ActiveFastState,
  currentTime = Date.now(),
): FastingWidgetModel => {
  const { session, timerViewPreference } = state;

  if (session === null) {
    return {
      status: 'inactive',
      accessibilityLabel: 'Open Simple Fasting to start a fast',
      headline: 'Ready to fast?',
      subtitle: 'Tap to start',
    };
  }

  const startedAt = Date.parse(session.startedAt);
  const elapsedMinutes = Math.max(0, Math.floor((currentTime - startedAt) / 60_000));
  const goalMinutes = session.goalDurationHours * 60;
  const hasGoal = goalMinutes > 0;
  const shownMinutes =
    timerViewPreference === TimerViewPreference.Remaining && hasGoal
      ? Math.max(0, goalMinutes - elapsedMinutes)
      : elapsedMinutes;
  const displayTime = formatTimerMinutes(shownMinutes);

  return {
    status: 'active',
    accessibilityLabel: `Fasting timer ${displayTime}`,
    displayTime,
    goalDurationHours: session.goalDurationHours,
    goalEndsAt: startedAt + goalMinutes * 60_000,
    hasGoal,
    progress: hasGoal ? Math.min(1, elapsedMinutes / goalMinutes) : 0,
    startedAt,
    subtitle: hasGoal ? `${session.goalDurationHours}h goal` : 'Open-ended fast',
    timerView: timerViewPreference,
  };
};
