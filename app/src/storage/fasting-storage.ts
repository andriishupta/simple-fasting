import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

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
import { getSettings } from '@/storage/settings-storage';

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

  return activeFastState;
};

const saveHistoryState = (historyState: HistoryState): HistoryState => {
  historySnapshot = historyState;
  appStorage.insert(StorageKey.History, historyState);

  return historyState;
};

const scheduleFastEndNotification = async (session: FastSession): Promise<string | null> => {
  const settings = getSettings();

  if (!settings.notifications.fastEndReminderEnabled || Platform.OS === 'web') {
    return null;
  }

  const Notifications = await import('expo-notifications');
  const triggerDate = new Date(
    new Date(session.startedAt).getTime() + session.goalDurationHours * 3_600_000,
  );

  if (triggerDate.getTime() <= Date.now()) {
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Fast goal reached',
      body: `${session.goalDurationHours} hour fast complete.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
};

const cancelNotification = async (notificationId: string | null): Promise<void> => {
  if (notificationId === null || Platform.OS === 'web') {
    return;
  }

  const Notifications = await import('expo-notifications');

  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const refreshFastSnapshots = (): void => {
  activeFastSnapshot = readActiveFastState();
  historySnapshot = readHistoryState();
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
  const fastEndNotificationId = await scheduleFastEndNotification(session);

  return saveActiveFastState({
    schemaVersion: activeFastSnapshot.schemaVersion,
    session,
    fastEndNotificationId,
    updatedAt: timestamp,
  });
};

export const endFast = async (): Promise<FastSession | null> => {
  const activeFastState = getActiveFastState();

  if (activeFastState.session === null) {
    return null;
  }

  await cancelNotification(activeFastState.fastEndNotificationId);

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
    updatedAt: timestamp,
  });

  return completedSession;
};

export const deleteFastSession = (sessionId: string): HistoryState => {
  const historyState = getHistoryState();

  return saveHistoryState({
    ...historyState,
    sessions: historyState.sessions.filter((session) => session.id !== sessionId),
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

export const getGoalSeconds = (session: FastSession): number =>
  Math.max(1, session.goalDurationHours * 60 * 60);

export const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;
};
