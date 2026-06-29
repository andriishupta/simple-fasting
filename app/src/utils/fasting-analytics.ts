import type { ChartDatum, HeatmapCell } from '@/components/charts/fasting-charts';
import { FastStatus, type FastSession, type HistoryState } from '@/storage/app-storage';
import { getSessionDurationHours } from '@/utils/fasting-duration';
import {
  getCompletionRate,
  getLocalDayKey,
  getLocalMonthKey,
  getPreviousLocalDayKey,
  getRecentLocalDayKeys,
  getRecentLocalMonthKeys,
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

export type ChartData = {
  weeklyHeatmap: readonly HeatmapCell[];
  monthlyHeatmap: readonly HeatmapCell[];
  yearlyHeatmap: readonly HeatmapCell[];
  monthlyHours: readonly ChartDatum[];
  recentDurations: readonly ChartDatum[];
  durationDistribution: readonly ChartDatum[];
  completionRate: number;
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

const getHoursByDay = (sessions: readonly FastSession[]): Record<string, number> => {
  const hoursByDay: Record<string, number> = {};

  sessions.forEach((session) => {
    const dayKey = getLocalDayKey(new Date(session.startedAt));

    hoursByDay[dayKey] = (hoursByDay[dayKey] ?? 0) + getSessionDurationHours(session);
  });

  return hoursByDay;
};

const getHeatmap = ({
  dayKeys,
  hoursByDay,
}: {
  dayKeys: readonly string[];
  hoursByDay: Record<string, number>;
}): readonly HeatmapCell[] =>
  dayKeys.map((dateKey) => ({ id: dateKey, value: hoursByDay[dateKey] ?? 0 }));

const getMonthlyHours = (
  sessions: readonly FastSession[],
  referenceDate: Date,
): readonly ChartDatum[] => {
  const hoursByMonth: Record<string, number> = {};

  sessions.forEach((session) => {
    const monthKey = getLocalMonthKey(new Date(session.startedAt));

    hoursByMonth[monthKey] = (hoursByMonth[monthKey] ?? 0) + getSessionDurationHours(session);
  });

  return getRecentLocalMonthKeys(6, referenceDate).map((monthKey) => ({
    label: monthKey.slice(5),
    value: hoursByMonth[monthKey] ?? 0,
  }));
};

export const getDurationDistribution = (
  sessions: readonly FastSession[],
): readonly ChartDatum[] => {
  const buckets = [
    { label: '<12h', min: 0, max: 12 },
    { label: '12-16h', min: 12, max: 16 },
    { label: '16-20h', min: 16, max: 20 },
    { label: '20h+', min: 20, max: Number.POSITIVE_INFINITY },
  ];

  return buckets.map((bucket) => ({
    label: bucket.label,
    value: sessions.filter((session) => {
      const hours = getSessionDurationHours(session);
      return hours >= bucket.min && hours < bucket.max;
    }).length,
  }));
};

const getRecentDurations = (
  sessions: readonly FastSession[],
  locale?: string,
): readonly ChartDatum[] =>
  sessions
    .slice(0, 7)
    .reverse()
    .map((session) => ({
      label: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
        new Date(session.startedAt),
      ),
      value: getSessionDurationHours(session),
    }));

export const getChartData = (
  history: HistoryState,
  referenceDate = new Date(),
  locale?: string,
): ChartData => {
  const completedSessions = getCompletedSessions(history);
  const hoursByDay = getHoursByDay(completedSessions);

  return {
    weeklyHeatmap: getHeatmap({
      dayKeys: getRecentLocalDayKeys(7, referenceDate),
      hoursByDay,
    }),
    monthlyHeatmap: getHeatmap({
      dayKeys: getRecentLocalDayKeys(30, referenceDate),
      hoursByDay,
    }),
    yearlyHeatmap: getHeatmap({
      dayKeys: getRecentLocalDayKeys(365, referenceDate),
      hoursByDay,
    }),
    monthlyHours: getMonthlyHours(completedSessions, referenceDate),
    recentDurations: getRecentDurations(completedSessions, locale),
    durationDistribution: getDurationDistribution(completedSessions),
    completionRate: getCompletionRate(completedSessions),
  };
};
