import type { FastSession } from '@/storage/app-storage';

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

export const formatDuration = (totalSeconds: number): string => {
  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;
};

export const formatDurationWorklet = (totalSeconds: number): string => {
  'worklet';

  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;
  const paddedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
};
