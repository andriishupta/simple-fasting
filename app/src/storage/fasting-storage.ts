import { useSyncExternalStore } from 'react';

import {
  appStorage,
  createEmptyActiveFastState,
  createEmptyHistoryState,
  FastStatus,
  StorageKey,
  type ActiveFastState,
  type FastSession,
  type HistoryState,
} from '@/storage/app-storage';
import {
  cancelDailyReminderNotification,
  getSettings,
  reconcileDailyReminderNotification,
  setLastUsedGoalDurationHours,
} from '@/storage/settings-storage';
import {
  cancelScheduledNotification,
  scheduleFastEndNotification,
} from '@/storage/notification-storage';
import { updateFastingWidget } from '@/widgets/fasting-widget';

const now = (): string => new Date().toISOString();

const readActiveFastState = (): ActiveFastState =>
  appStorage.getOrDefault(StorageKey.ActiveFast, createEmptyActiveFastState(now()));

const readHistoryState = (): HistoryState =>
  appStorage.getOrDefault(StorageKey.History, createEmptyHistoryState(now()));

let activeFastSnapshot = createEmptyActiveFastState(now());
let historySnapshot = createEmptyHistoryState(now());

const createSessionId = (): string =>
  `fast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const saveActiveFastState = (activeFastState: ActiveFastState): ActiveFastState => {
  activeFastSnapshot = activeFastState;
  appStorage.insert(StorageKey.ActiveFast, activeFastState);
  updateFastingWidget(activeFastState.session);

  return activeFastState;
};

const saveHistoryState = (historyState: HistoryState): HistoryState => {
  historySnapshot = historyState;
  appStorage.insert(StorageKey.History, historyState);

  return historyState;
};

export const refreshFastSnapshots = (): void => {
  activeFastSnapshot = readActiveFastState();
  historySnapshot = readHistoryState();
  updateFastingWidget(activeFastSnapshot.session);
};

export const getActiveFastState = (): ActiveFastState => activeFastSnapshot;

export const getHistoryState = (): HistoryState => historySnapshot;

export const getFastSession = (sessionId: string): FastSession | undefined =>
  getHistoryState().sessions.find((session) => session.id === sessionId);

export const startFast = async ({
  goalDurationHours,
  reason,
}: {
  goalDurationHours: number;
  reason: string | null;
}): Promise<ActiveFastState> => {
  const timestamp = now();
  const session: FastSession = {
    id: createSessionId(),
    status: FastStatus.Active,
    startedAt: timestamp,
    endedAt: null,
    goalDurationHours,
    reason,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const settings = getSettings();
  const fastEndReminderEnabled = settings.notifications.fastEndReminderEnabled;
  const fastEndNotificationId = await scheduleFastEndNotification({
    session,
    enabled: fastEndReminderEnabled,
  });
  setLastUsedGoalDurationHours(goalDurationHours);
  await cancelDailyReminderNotification();

  return saveActiveFastState({
    schemaVersion: activeFastSnapshot.schemaVersion,
    session,
    fastEndNotificationId,
    fastEndReminderEnabled,
    updatedAt: timestamp,
  });
};

export const endFast = async (): Promise<FastSession | null> => {
  const activeFastState = getActiveFastState();

  if (activeFastState.session === null) {
    return null;
  }

  await cancelScheduledNotification(activeFastState.fastEndNotificationId);

  const timestamp = now();
  const completedSession: FastSession = {
    ...activeFastState.session,
    status: FastStatus.Completed,
    endedAt: timestamp,
    updatedAt: timestamp,
  };
  const historyState = getHistoryState();
  const sessionsWithoutCurrent = historyState.sessions.filter(
    (session) => session.id !== completedSession.id,
  );

  saveHistoryState({
    ...historyState,
    sessions: [completedSession, ...sessionsWithoutCurrent].sort((first, second) =>
      second.startedAt.localeCompare(first.startedAt),
    ),
    updatedAt: timestamp,
  });

  saveActiveFastState({
    ...activeFastState,
    session: null,
    fastEndNotificationId: null,
    fastEndReminderEnabled: true,
    updatedAt: timestamp,
  });
  await reconcileDailyReminderNotification();

  return completedSession;
};

export const cancelFast = async (): Promise<ActiveFastState> => {
  const activeFastState = getActiveFastState();

  await cancelScheduledNotification(activeFastState.fastEndNotificationId);

  const nextActiveFastState = saveActiveFastState({
    ...activeFastState,
    session: null,
    fastEndNotificationId: null,
    fastEndReminderEnabled: true,
    updatedAt: now(),
  });

  await reconcileDailyReminderNotification();

  return nextActiveFastState;
};

export const deleteFastSession = (sessionId: string): HistoryState => {
  const historyState = getHistoryState();

  return saveHistoryState({
    ...historyState,
    sessions: historyState.sessions.filter((session) => session.id !== sessionId),
    updatedAt: now(),
  });
};

export const updateFastSession = ({
  sessionId,
  update,
}: {
  sessionId: string;
  update: (session: FastSession) => FastSession;
}): FastSession | undefined => {
  const historyState = getHistoryState();
  const currentSession = historyState.sessions.find((session) => session.id === sessionId);

  if (currentSession === undefined) {
    return undefined;
  }

  const timestamp = now();
  const updatedSession = {
    ...update(currentSession),
    updatedAt: timestamp,
  };

  saveHistoryState({
    ...historyState,
    sessions: historyState.sessions
      .map((session) => (session.id === sessionId ? updatedSession : session))
      .sort((first, second) => second.startedAt.localeCompare(first.startedAt)),
    updatedAt: timestamp,
  });

  return updatedSession;
};

export const reconcileActiveFastEndNotification = async (): Promise<ActiveFastState> => {
  const activeFastState = getActiveFastState();

  if (activeFastState.session === null) {
    await cancelScheduledNotification(activeFastState.fastEndNotificationId);

    return saveActiveFastState({
      ...activeFastState,
      fastEndNotificationId: null,
      updatedAt: now(),
    });
  }

  const settings = getSettings();

  await cancelScheduledNotification(activeFastState.fastEndNotificationId);

  const fastEndNotificationId = await scheduleFastEndNotification({
    session: activeFastState.session,
    enabled:
      settings.notifications.fastEndReminderEnabled && activeFastState.fastEndReminderEnabled,
  });

  return saveActiveFastState({
    ...activeFastState,
    fastEndNotificationId,
    updatedAt: now(),
  });
};

export const setActiveFastEndReminderEnabled = async (
  fastEndReminderEnabled: boolean,
): Promise<ActiveFastState> => {
  const activeFastState = getActiveFastState();

  await cancelScheduledNotification(activeFastState.fastEndNotificationId);

  if (activeFastState.session === null) {
    return saveActiveFastState({
      ...activeFastState,
      fastEndNotificationId: null,
      fastEndReminderEnabled,
      updatedAt: now(),
    });
  }

  const fastEndNotificationId = await scheduleFastEndNotification({
    session: activeFastState.session,
    enabled: fastEndReminderEnabled,
  });

  return saveActiveFastState({
    ...activeFastState,
    fastEndNotificationId,
    fastEndReminderEnabled,
    updatedAt: now(),
  });
};

const subscribeToActiveFast = (onStoreChange: () => void): (() => void) =>
  appStorage.subscribe((key) => {
    if (key === StorageKey.ActiveFast) {
      activeFastSnapshot = readActiveFastState();
      onStoreChange();
    }
  });

const subscribeToHistory = (onStoreChange: () => void): (() => void) =>
  appStorage.subscribe((key) => {
    if (key === StorageKey.History) {
      historySnapshot = readHistoryState();
      onStoreChange();
    }
  });

export const useActiveFastState = (): ActiveFastState =>
  useSyncExternalStore(subscribeToActiveFast, getActiveFastState, getActiveFastState);

export const useHistoryState = (): HistoryState =>
  useSyncExternalStore(subscribeToHistory, getHistoryState, getHistoryState);

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
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;
};
