import {
  FastStatus,
  StorageSchemaVersion,
  type FastSession,
  type HistoryState,
} from '@/storage/app-storage';

export const createSession = ({
  id,
  startedAt,
  endedAt,
  goalDurationHours = 16,
  status = FastStatus.Completed,
  reason = null,
}: {
  id: string;
  startedAt: string;
  endedAt: string | null;
  goalDurationHours?: number;
  status?: FastStatus;
  reason?: string | null;
}): FastSession => ({
  id,
  status,
  startedAt,
  endedAt,
  goalDurationHours,
  reason,
  createdAt: startedAt,
  updatedAt: endedAt ?? startedAt,
});

export const createHistory = (sessions: readonly FastSession[]): HistoryState => ({
  schemaVersion: StorageSchemaVersion.V1,
  sessions,
  updatedAt: '2026-06-21T12:00:00.000Z',
});
