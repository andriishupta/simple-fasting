type StatisticalFastSession = {
  startedAt: string;
  endedAt: string | null;
  goalDurationHours: number;
};

const padDatePart = (value: number): string => String(value).padStart(2, '0');

export const getLocalDayKey = (date: Date): string =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const getPreviousLocalDayKey = (dayKey: string): string => {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() - 1);
  return getLocalDayKey(date);
};

const getCompletedDurationHours = (session: StatisticalFastSession): number => {
  if (session.endedAt === null) return 0;

  return Math.max(
    0,
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) /
      3_600_000,
  );
};

const getPlannedSessions = (
  sessions: readonly StatisticalFastSession[],
): readonly StatisticalFastSession[] =>
  sessions.filter((session) => session.goalDurationHours > 0 && session.endedAt !== null);

export const getCompletionRate = (sessions: readonly StatisticalFastSession[]): number => {
  const plannedSessions = getPlannedSessions(sessions);

  if (plannedSessions.length === 0) return 0;

  return (
    plannedSessions.reduce(
      (total, session) =>
        total +
        Math.min(1, getCompletedDurationHours(session) / session.goalDurationHours),
      0,
    ) / plannedSessions.length
  );
};
