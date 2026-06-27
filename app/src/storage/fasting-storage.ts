import { useSyncExternalStore } from 'react';

import {
  appStorage,
  createEmptyActiveFastState,
  createEmptyHistoryState,
  FastStatus,
  StorageKey,
  TimerViewPreference,
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
import { formatGoalDuration } from '@/utils/fast-goals';
import { updateFastingWidget } from '@/widgets/fasting-widget';
import { syncFastingLiveActivity as syncFastingLiveActivityState } from '@/widgets/fasting-live-activity';

const now = (): string => new Date().toISOString();

const readActiveFastState = (): ActiveFastState =>
  appStorage.getOrDefault(StorageKey.ActiveFast, createEmptyActiveFastState(now()));

const readHistoryState = (): HistoryState =>
  appStorage.getOrDefault(StorageKey.History, createEmptyHistoryState(now()));

let activeFastSnapshot = createEmptyActiveFastState(now());
let historySnapshot = createEmptyHistoryState(now());
const activeFastSubscribers = new Set<() => void>();

const createSessionId = (): string =>
  `fast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const saveActiveFastState = (activeFastState: ActiveFastState): ActiveFastState => {
  activeFastSnapshot = activeFastState;
  appStorage.insert(StorageKey.ActiveFast, activeFastState);
  updateFastingWidget(activeFastState);
  void syncFastingLiveActivityState(activeFastState);

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
  updateFastingWidget(activeFastSnapshot);
};

export const syncActiveFastingLiveActivity = async (): Promise<void> => {
  if (activeFastSnapshot.session === null) return;
  await syncFastingLiveActivityState(activeFastSnapshot);
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
  setLastUsedGoalDurationHours(goalDurationHours);
  const activeFastState = saveActiveFastState({
    schemaVersion: activeFastSnapshot.schemaVersion,
    session,
    fastEndNotificationId: null,
    fastEndReminderEnabled,
    timerViewPreference: activeFastSnapshot.timerViewPreference,
    updatedAt: timestamp,
  });

  const fastEndNotificationId = await scheduleFastEndNotification({
    session,
    enabled: fastEndReminderEnabled,
    goalDurationLabel: formatGoalDuration(goalDurationHours, settings.goalDurationFormat),
  }).catch(() => null);
  await cancelDailyReminderNotification().catch(() => undefined);

  const savedState = fastEndNotificationId === null
    ? activeFastState
    : saveActiveFastState({ ...activeFastState, fastEndNotificationId, updatedAt: now() });
  return savedState;
};

export const endFast = async (): Promise<FastSession | null> => {
  const activeFastState = getActiveFastState();

  if (activeFastState.session === null) {
    return null;
  }

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
  await Promise.all([
    cancelScheduledNotification(activeFastState.fastEndNotificationId),
    reconcileDailyReminderNotification(),
  ]).catch(() => undefined);

  return completedSession;
};

export const cancelFast = async (): Promise<ActiveFastState> => {
  const activeFastState = getActiveFastState();

  const nextActiveFastState = saveActiveFastState({
    ...activeFastState,
    session: null,
    fastEndNotificationId: null,
    fastEndReminderEnabled: true,
    updatedAt: now(),
  });

  await Promise.all([
    cancelScheduledNotification(activeFastState.fastEndNotificationId),
    reconcileDailyReminderNotification(),
  ]).catch(() => undefined);

  return nextActiveFastState;
};

export const deleteFastSession = (sessionId: string): HistoryState => {
  return deleteFastSessions([sessionId]);
};

export const deleteFastSessions = (sessionIds: readonly string[]): HistoryState => {
  const historyState = getHistoryState();
  const ids = new Set(sessionIds);

  return saveHistoryState({
    ...historyState,
    sessions: historyState.sessions.filter((session) => !ids.has(session.id)),
    updatedAt: now(),
  });
};

export type ImportMergeResult = { saved: number; skipped: number };
export type ActiveFastStartUpdateResult =
  | { status: 'updated'; activeFastState: ActiveFastState }
  | { status: 'inactive' }
  | { status: 'future' }
  | { status: 'overlap'; session: FastSession };

export const sessionsOverlap = (first: FastSession, second: FastSession): boolean => {
  if (first.id === second.id) return true;
  if (first.endedAt === null || second.endedAt === null) return false;

  return first.startedAt < second.endedAt && second.startedAt < first.endedAt;
};

export const getOverlappingFastSession = ({
  excludedSessionId,
  session,
}: {
  excludedSessionId?: string;
  session: FastSession;
}): FastSession | undefined =>
  getHistoryState().sessions.find(
    (candidate) =>
      candidate.id !== excludedSessionId &&
      candidate.id !== session.id &&
      sessionsOverlap(candidate, session),
  );

const getOverlappingActiveFastStartSession = ({
  session,
  nowTimestamp,
}: {
  session: FastSession;
  nowTimestamp: string;
}): FastSession | undefined =>
  getOverlappingFastSession({
    excludedSessionId: session.id,
    session: {
      ...session,
      endedAt: nowTimestamp,
    },
  });

export const mergeImportedFastSessions = (
  sessions: readonly FastSession[],
): ImportMergeResult => {
  if (getActiveFastState().session !== null) {
    return { saved: 0, skipped: sessions.length };
  }

  const historyState = getHistoryState();
  const additions: FastSession[] = [];
  let skipped = 0;

  sessions.forEach((session) => {
    const acceptedSessions = [...historyState.sessions, ...additions];
    if (acceptedSessions.some((existing) => sessionsOverlap(existing, session))) {
      skipped += 1;
    } else {
      additions.push(session);
    }
  });

  if (additions.length === 0) return { saved: 0, skipped };

  saveHistoryState({
    ...historyState,
    sessions: [...historyState.sessions, ...additions].sort((first, second) =>
      second.startedAt.localeCompare(first.startedAt),
    ),
    updatedAt: now(),
  });
  return { saved: additions.length, skipped };
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

  if (getOverlappingFastSession({ excludedSessionId: sessionId, session: updatedSession })) {
    return undefined;
  }

  saveHistoryState({
    ...historyState,
    sessions: historyState.sessions
      .map((session) => (session.id === sessionId ? updatedSession : session))
      .sort((first, second) => second.startedAt.localeCompare(first.startedAt)),
    updatedAt: timestamp,
  });

  return updatedSession;
};

export const updateActiveFastStart = async (
  startedAt: string,
): Promise<ActiveFastStartUpdateResult> => {
  const activeFastState = getActiveFastState();

  if (activeFastState.session === null) {
    return { status: 'inactive' };
  }

  const timestamp = now();
  const startedAtTime = new Date(startedAt).getTime();

  if (!Number.isFinite(startedAtTime) || startedAtTime > new Date(timestamp).getTime()) {
    return { status: 'future' };
  }

  const updatedSession: FastSession = {
    ...activeFastState.session,
    startedAt,
    updatedAt: timestamp,
  };
  const overlappingSession = getOverlappingActiveFastStartSession({
    session: updatedSession,
    nowTimestamp: timestamp,
  });

  if (overlappingSession !== undefined) {
    return { status: 'overlap', session: overlappingSession };
  }

  await cancelScheduledNotification(activeFastState.fastEndNotificationId);

  const fastEndNotificationId = await scheduleFastEndNotification({
    session: updatedSession,
    enabled: activeFastState.fastEndReminderEnabled,
    goalDurationLabel: formatGoalDuration(
      updatedSession.goalDurationHours,
      getSettings().goalDurationFormat,
    ),
  });

  return {
    status: 'updated',
    activeFastState: saveActiveFastState({
      ...activeFastState,
      session: updatedSession,
      fastEndNotificationId,
      updatedAt: timestamp,
    }),
  };
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
    goalDurationLabel: formatGoalDuration(
      activeFastState.session.goalDurationHours,
      settings.goalDurationFormat,
    ),
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
    goalDurationLabel: formatGoalDuration(
      activeFastState.session.goalDurationHours,
      getSettings().goalDurationFormat,
    ),
  });

  return saveActiveFastState({
    ...activeFastState,
    fastEndNotificationId,
    fastEndReminderEnabled,
    updatedAt: now(),
  });
};

export const setActiveFastTimerView = (
  timerViewPreference: TimerViewPreference,
): ActiveFastState => {
  const activeFastState = getActiveFastState();

  if (activeFastState.timerViewPreference === timerViewPreference) {
    return activeFastState;
  }

  return saveActiveFastState({
    ...activeFastState,
    timerViewPreference,
    updatedAt: now(),
  });
};

const subscribeToActiveFast = (onStoreChange: () => void): (() => void) =>
  {
    activeFastSubscribers.add(onStoreChange);
    const unsubscribeStorage = appStorage.subscribe((key) => {
    if (key === StorageKey.ActiveFast) {
      activeFastSnapshot = readActiveFastState();
      onStoreChange();
    }
  });

    return () => {
      activeFastSubscribers.delete(onStoreChange);
      unsubscribeStorage();
    };
  };

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

export {
  formatDuration,
  formatHours,
  getElapsedSeconds,
  getGoalSeconds,
  getSessionDurationHours,
  getSessionDurationSeconds,
} from '@/utils/fasting-duration';
