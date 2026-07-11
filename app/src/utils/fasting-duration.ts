import { GoalDurationFormat, type FastSession } from '@/storage/app-storage';

export const getElapsedSeconds = (session: FastSession, currentTime: number): number =>
  Math.max(0, Math.floor((currentTime - new Date(session.startedAt).getTime()) / 1000));

export const getSessionDurationSeconds = (
  session: FastSession,
  currentTime = Date.now(),
): number =>
  getElapsedSeconds(
    session,
    session.endedAt === null ? currentTime : new Date(session.endedAt).getTime(),
  );

export const getSessionDurationHours = (session: FastSession): number =>
  getSessionDurationSeconds(session) / 3600;

export const getGoalSeconds = (session: FastSession): number =>
  Math.max(1, session.goalDurationHours * 60 * 60);

export const formatHours = (hours: number): string =>
  hours < 10 ? hours.toFixed(1) : Math.round(hours).toString();

export const formatDuration = (
  totalSeconds: number,
  format: GoalDurationFormat = GoalDurationFormat.Hours,
): string => {
  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  if (format === GoalDurationFormat.Days) {
    const days = Math.floor(wholeSeconds / 86_400);
    const hours = Math.floor((wholeSeconds % 86_400) / 3_600);
    const minutes = Math.floor((wholeSeconds % 3_600) / 60);
    const seconds = wholeSeconds % 60;
    const parts: string[] = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;
};

export const formatDurationWorklet = (
  totalSeconds: number,
  format: GoalDurationFormat,
): string => {
  'worklet';

  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  if (format === 'days') {
    const days = Math.floor(wholeSeconds / 86_400);
    const hours = Math.floor((wholeSeconds % 86_400) / 3_600);
    const minutes = Math.floor((wholeSeconds % 3_600) / 60);
    const seconds = wholeSeconds % 60;
    let result = '';

    if (days > 0) result = `${days}d`;
    if (hours > 0) result = result.length > 0 ? `${result} ${hours}h` : `${hours}h`;
    if (minutes > 0) result = result.length > 0 ? `${result} ${minutes}m` : `${minutes}m`;
    if (seconds > 0 || result.length === 0) {
      result = result.length > 0 ? `${result} ${seconds}s` : `${seconds}s`;
    }

    return result;
  }

  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;
  const paddedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
};
