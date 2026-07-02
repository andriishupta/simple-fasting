import { FastStatus, type FastSession, type HistoryState } from '@/storage/app-storage';
import { getSessionDurationHours } from '@/utils/fasting-duration';
import {
  getCompletionRate,
  getLocalDayKey,
  getPreviousLocalDayKey,
} from '@/utils/fasting-statistics';

export type FastingStats = {
  currentStreakDays: number;
  longestStreakDays: number;
  longestFastHours: number;
  averageDurationHours: number;
  completionRate: number;
  totalHours: number;
  totalFasts: number;
};

export const getCompletedSessions = (history: HistoryState): readonly FastSession[] =>
  history.sessions.filter((session) => session.status === FastStatus.Completed);

export const getCompletedDayKeys = (
  completedSessions: readonly FastSession[],
): readonly string[] =>
  Array.from(
    new Set(completedSessions.map((session) => getLocalDayKey(new Date(session.startedAt)))),
  )
    .sort()
    .reverse();

export const getCurrentStreakDays = (
  completedDayKeys: readonly string[],
  referenceDate = new Date(),
): number => {
  const completedDaySet = new Set(completedDayKeys);
  const todayKey = getLocalDayKey(referenceDate);
  const yesterdayKey = getPreviousLocalDayKey(todayKey);
  const streakStartKey = completedDaySet.has(todayKey) ? todayKey : yesterdayKey;
  let streak = 0;
  let cursor = streakStartKey;

  while (completedDaySet.has(cursor)) {
    streak += 1;
    cursor = getPreviousLocalDayKey(cursor);
  }

  return streak;
};

export const getLongestStreakDays = (completedDayKeys: readonly string[]): number => {
  let longestStreak = 0;
  let currentStreak = 0;
  let previousDayKey: string | null = null;

  [...completedDayKeys].reverse().forEach((dayKey) => {
    currentStreak =
      previousDayKey !== null && getPreviousLocalDayKey(dayKey) === previousDayKey
        ? currentStreak + 1
        : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDayKey = dayKey;
  });

  return longestStreak;
};

export const getFastingStats = (
  history: HistoryState,
  referenceDate = new Date(),
): FastingStats => {
  const completedSessions = getCompletedSessions(history);
  const durations = completedSessions.map(getSessionDurationHours);
  const totalHours = durations.reduce((total, duration) => total + duration, 0);
  const completedDayKeys = getCompletedDayKeys(completedSessions);

  return {
    currentStreakDays: getCurrentStreakDays(completedDayKeys, referenceDate),
    longestStreakDays: getLongestStreakDays(completedDayKeys),
    longestFastHours: durations.length === 0 ? 0 : Math.max(...durations),
    averageDurationHours:
      completedSessions.length === 0 ? 0 : totalHours / completedSessions.length,
    completionRate: getCompletionRate(completedSessions),
    totalHours,
    totalFasts: completedSessions.length,
  };
};
