import { FastStatus, type FastSession, type HistoryState } from '@/storage/app-storage';

export type FastingStats = {
  currentStreakDays: number;
  longestStreakDays: number;
  longestFastHours: number;
  averageDurationHours: number;
  completionRate: number;
  totalHours: number;
  completedSessions: number;
  totalSessions: number;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;

const getDurationHours = (session: FastSession): number => {
  if (session.endedAt === null) {
    return 0;
  }

  return Math.max(
    0,
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 3_600_000,
  );
};

const getDayKey = (date: Date): string => date.toISOString().slice(0, 10);

const getPreviousDayKey = (dayKey: string): string => {
  const date = new Date(`${dayKey}T00:00:00.000Z`);

  return getDayKey(new Date(date.getTime() - dayMilliseconds));
};

const getCompletedSessions = (history: HistoryState): readonly FastSession[] =>
  history.sessions.filter((session) => session.status === FastStatus.Completed);

const getCompletedDayKeys = (completedSessions: readonly FastSession[]): readonly string[] =>
  Array.from(new Set(completedSessions.map((session) => getDayKey(new Date(session.startedAt)))))
    .sort()
    .reverse();

const getCurrentStreakDays = (completedDayKeys: readonly string[]): number => {
  if (completedDayKeys.length === 0) {
    return 0;
  }

  const completedDaySet = new Set(completedDayKeys);
  const todayKey = getDayKey(new Date());
  const yesterdayKey = getPreviousDayKey(todayKey);
  const streakStartKey = completedDaySet.has(todayKey) ? todayKey : yesterdayKey;

  if (!completedDaySet.has(streakStartKey)) {
    return 0;
  }

  let streak = 0;
  let cursor = streakStartKey;

  while (completedDaySet.has(cursor)) {
    streak += 1;
    cursor = getPreviousDayKey(cursor);
  }

  return streak;
};

const getLongestStreakDays = (completedDayKeys: readonly string[]): number => {
  if (completedDayKeys.length === 0) {
    return 0;
  }

  const ascendingDayKeys = [...completedDayKeys].reverse();
  const result = ascendingDayKeys.reduce(
    (state, dayKey) => {
      const currentStreak =
        state.previousDayKey !== null && getPreviousDayKey(dayKey) === state.previousDayKey
          ? state.currentStreak + 1
          : 1;

      return {
        previousDayKey: dayKey,
        currentStreak,
        longestStreak: Math.max(state.longestStreak, currentStreak),
      };
    },
    {
      previousDayKey: null as string | null,
      currentStreak: 0,
      longestStreak: 0,
    },
  );

  return result.longestStreak;
};

export const getFastingStats = (history: HistoryState): FastingStats => {
  const completedSessions = getCompletedSessions(history);
  const durations = completedSessions.map(getDurationHours);
  const totalHours = durations.reduce((total, duration) => total + duration, 0);
  const completedDayKeys = getCompletedDayKeys(completedSessions);

  return {
    currentStreakDays: getCurrentStreakDays(completedDayKeys),
    longestStreakDays: getLongestStreakDays(completedDayKeys),
    longestFastHours: durations.length === 0 ? 0 : Math.max(...durations),
    averageDurationHours:
      completedSessions.length === 0 ? 0 : totalHours / completedSessions.length,
    completionRate:
      history.sessions.length === 0 ? 0 : completedSessions.length / history.sessions.length,
    totalHours,
    completedSessions: completedSessions.length,
    totalSessions: history.sessions.length,
  };
};

export const formatHours = (hours: number): string =>
  hours < 10 ? hours.toFixed(1) : Math.round(hours).toString();

export const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;
