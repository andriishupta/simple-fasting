import {
  GoalDurationFormat,
  TimerViewPreference,
  type ActiveFastState,
} from '@/storage/app-storage';
import { t } from '@/locales/i18n';
import { formatGoalDuration } from '@/utils/fast-goals';
import { formatDuration } from '@/utils/fasting-duration';

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
      goalDurationLabel: string;
      headline: string;
      goalDurationHours: number;
      goalEndsAt: number;
      hasGoal: boolean;
      goalName: string;
      progress: number;
      startedAt: number;
      subtitle: string;
      timerView: TimerViewPreference;
    };

export const createFastingWidgetModel = (
  state: ActiveFastState,
  currentTime = Date.now(),
  goalName?: string,
  goalDurationFormat: GoalDurationFormat = GoalDurationFormat.Hours,
): FastingWidgetModel => {
  const { session, timerViewPreference } = state;

  if (session === null) {
    return {
      status: 'inactive',
      accessibilityLabel: t('widgets.readyAccessibility'),
      headline: t('widgets.readyHeadline'),
      subtitle: t('widgets.readySubtitle'),
    };
  }

  const startedAt = Date.parse(session.startedAt);
  const elapsedSeconds = Math.max(0, Math.floor((currentTime - startedAt) / 1000));
  const goalSeconds = session.goalDurationHours * 3600;
  const hasGoal = goalSeconds > 0;
  const showsRemaining =
    timerViewPreference === TimerViewPreference.Remaining && hasGoal && elapsedSeconds < goalSeconds;
  const shownSeconds =
    showsRemaining
      ? goalSeconds - elapsedSeconds
      : elapsedSeconds;
  const displayTime = formatDuration(shownSeconds);
  const goalDurationLabel = hasGoal
    ? formatGoalDuration(session.goalDurationHours, goalDurationFormat)
    : t('common.noTimeLimit');
  const displayGoalName = hasGoal ? (goalName ?? t('widgets.goalFallback')) : t('widgets.openEndedFast');

  return {
    status: 'active',
    accessibilityLabel: `${displayGoalName} ${displayTime}`,
    displayTime,
    goalDurationLabel,
    headline: hasGoal ? `${displayGoalName} · ${goalDurationLabel}` : displayGoalName,
    goalDurationHours: session.goalDurationHours,
    goalEndsAt: startedAt + goalSeconds * 1000,
    goalName: displayGoalName,
    hasGoal,
    progress: hasGoal ? Math.min(1, elapsedSeconds / goalSeconds) : 0,
    startedAt,
    subtitle:
      showsRemaining
        ? t('common.remaining')
        : t('common.elapsed'),
    timerView: showsRemaining ? TimerViewPreference.Remaining : TimerViewPreference.Elapsed,
  };
};
