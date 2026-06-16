import { FastStatus, type FastSession, type HistoryState } from '@/storage/app-storage';

export type HeatmapDay = {
  dateKey: string;
  hours: number;
};

export type BarDatum = {
  label: string;
  value: number;
};

export type GraphData = {
  weeklyHeatmap: readonly HeatmapDay[];
  monthlyHeatmap: readonly HeatmapDay[];
  yearlyHeatmap: readonly HeatmapDay[];
  monthlyHours: readonly BarDatum[];
  durationDistribution: readonly BarDatum[];
  completionRate: number;
  goalAchievementRate: number;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;

const getDayKey = (date: Date): string => date.toISOString().slice(0, 10);

const getMonthKey = (date: Date): string => date.toISOString().slice(0, 7);

const getDurationHours = (session: FastSession): number => {
  if (session.endedAt === null) {
    return 0;
  }

  return Math.max(
    0,
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 3_600_000,
  );
};

const getCompletedSessions = (history: HistoryState): readonly FastSession[] =>
  history.sessions.filter((session) => session.status === FastStatus.Completed);

const getRangeDayKeys = (days: number): readonly string[] => {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  return Array.from({ length: days }, (_, index) => {
    const offset = days - index - 1;

    return getDayKey(new Date(todayUtc - offset * dayMilliseconds));
  });
};

const getHoursByDay = (sessions: readonly FastSession[]): Record<string, number> =>
  sessions.reduce<Record<string, number>>((result, session) => {
    const dayKey = getDayKey(new Date(session.startedAt));

    return {
      ...result,
      [dayKey]: (result[dayKey] ?? 0) + getDurationHours(session),
    };
  }, {});

const getHeatmap = ({
  dayKeys,
  hoursByDay,
}: {
  dayKeys: readonly string[];
  hoursByDay: Record<string, number>;
}): readonly HeatmapDay[] =>
  dayKeys.map((dateKey) => ({
    dateKey,
    hours: hoursByDay[dateKey] ?? 0,
  }));

const getLastMonthKeys = (): readonly string[] => {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));

    return getMonthKey(date);
  });
};

const getMonthlyHours = (sessions: readonly FastSession[]): readonly BarDatum[] => {
  const monthKeys = getLastMonthKeys();
  const hoursByMonth = sessions.reduce<Record<string, number>>((result, session) => {
    const monthKey = getMonthKey(new Date(session.startedAt));

    return {
      ...result,
      [monthKey]: (result[monthKey] ?? 0) + getDurationHours(session),
    };
  }, {});

  return monthKeys.map((monthKey) => ({
    label: monthKey.slice(5),
    value: hoursByMonth[monthKey] ?? 0,
  }));
};

const getDurationDistribution = (sessions: readonly FastSession[]): readonly BarDatum[] => {
  const buckets = [
    { label: '<12h', min: 0, max: 12 },
    { label: '12-16h', min: 12, max: 16 },
    { label: '16-20h', min: 16, max: 20 },
    { label: '20h+', min: 20, max: Number.POSITIVE_INFINITY },
  ];

  return buckets.map((bucket) => ({
    label: bucket.label,
    value: sessions.filter((session) => {
      const hours = getDurationHours(session);

      return hours >= bucket.min && hours < bucket.max;
    }).length,
  }));
};

const getGoalAchievementRate = (sessions: readonly FastSession[]): number => {
  if (sessions.length === 0) {
    return 0;
  }

  const achievedCount = sessions.filter(
    (session) => getDurationHours(session) >= session.goalDurationHours,
  ).length;

  return achievedCount / sessions.length;
};

export const getGraphData = (history: HistoryState): GraphData => {
  const completedSessions = getCompletedSessions(history);
  const hoursByDay = getHoursByDay(completedSessions);

  return {
    weeklyHeatmap: getHeatmap({
      dayKeys: getRangeDayKeys(7),
      hoursByDay,
    }),
    monthlyHeatmap: getHeatmap({
      dayKeys: getRangeDayKeys(30),
      hoursByDay,
    }),
    yearlyHeatmap: getHeatmap({
      dayKeys: getRangeDayKeys(365),
      hoursByDay,
    }),
    monthlyHours: getMonthlyHours(completedSessions),
    durationDistribution: getDurationDistribution(completedSessions),
    completionRate:
      history.sessions.length === 0 ? 0 : completedSessions.length / history.sessions.length,
    goalAchievementRate: getGoalAchievementRate(completedSessions),
  };
};

export const formatGraphHours = (hours: number): string =>
  hours < 10 ? hours.toFixed(1) : Math.round(hours).toString();

export const formatGraphPercent = (value: number): string => `${Math.round(value * 100)}%`;
