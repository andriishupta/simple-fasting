import { FastStatus, type FastSession, type HistoryState } from '@/storage/app-storage';

export type FastingStats = {
  totalSessions: number;
  completedSessions: number;
  totalHours: number;
  averageDurationHours: number;
  longestFastHours: number;
  completionRate: number;
};

const getDurationHours = (session: FastSession): number => {
  if (session.endedAt === null) {
    return 0;
  }

  return Math.max(
    0,
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 3_600_000,
  );
};

export const getCompletedSessions = (history: HistoryState): readonly FastSession[] =>
  history.sessions.filter((session) => session.status === FastStatus.Completed);

export const getFastingStats = (history: HistoryState): FastingStats => {
  const completedSessions = getCompletedSessions(history);
  const durations = completedSessions.map(getDurationHours);
  const totalHours = durations.reduce((total, duration) => total + duration, 0);
  const completedCount = completedSessions.length;

  return {
    totalSessions: history.sessions.length,
    completedSessions: completedCount,
    totalHours,
    averageDurationHours: completedCount === 0 ? 0 : totalHours / completedCount,
    longestFastHours: durations.length === 0 ? 0 : Math.max(...durations),
    completionRate: history.sessions.length === 0 ? 0 : completedCount / history.sessions.length,
  };
};
