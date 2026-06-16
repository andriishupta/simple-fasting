import {
  appStorage,
  createEmptyActiveFastState,
  StorageKey,
  type ActiveFastState,
  type FastSession,
} from '@/storage/app-storage';

const now = (): string => new Date().toISOString();

export const getActiveFastState = (): ActiveFastState =>
  appStorage.getOrDefault(StorageKey.ActiveFast, createEmptyActiveFastState(now()));

export const saveActiveFastState = (activeFastState: ActiveFastState): void =>
  appStorage.insert(StorageKey.ActiveFast, activeFastState);

export const setActiveFastSession = (session: FastSession | null): ActiveFastState => {
  const activeFastState: ActiveFastState = {
    ...getActiveFastState(),
    session,
    updatedAt: now(),
  };

  saveActiveFastState(activeFastState);

  return activeFastState;
};

export const clearActiveFastSession = (): ActiveFastState => setActiveFastSession(null);
