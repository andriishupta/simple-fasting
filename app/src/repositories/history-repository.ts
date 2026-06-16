import {
  appStorage,
  createEmptyHistoryState,
  StorageKey,
  type FastSession,
  type HistoryState,
} from '@/storage/app-storage';

const now = (): string => new Date().toISOString();

export const getHistoryState = (): HistoryState =>
  appStorage.getOrDefault(StorageKey.History, createEmptyHistoryState(now()));

export const saveHistoryState = (historyState: HistoryState): void =>
  appStorage.insert(StorageKey.History, historyState);

export const listFastSessions = (): readonly FastSession[] => getHistoryState().sessions;

export const upsertFastSession = (session: FastSession): HistoryState => {
  const historyState = getHistoryState();
  const sessionsWithoutCurrent = historyState.sessions.filter(
    (storedSession) => storedSession.id !== session.id,
  );
  const updatedHistoryState: HistoryState = {
    ...historyState,
    sessions: [...sessionsWithoutCurrent, session].sort((first, second) =>
      second.startedAt.localeCompare(first.startedAt),
    ),
    updatedAt: now(),
  };

  saveHistoryState(updatedHistoryState);

  return updatedHistoryState;
};

export const deleteFastSession = (sessionId: string): HistoryState => {
  const historyState = getHistoryState();
  const updatedHistoryState: HistoryState = {
    ...historyState,
    sessions: historyState.sessions.filter((session) => session.id !== sessionId),
    updatedAt: now(),
  };

  saveHistoryState(updatedHistoryState);

  return updatedHistoryState;
};
