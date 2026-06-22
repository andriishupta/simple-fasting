import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { appStorage, StorageKey } from '@/storage/app-storage';
import { getHistoryState } from '@/storage/fasting-storage';

type FastSavedNotice = { sessionId: string; expiresAt: number } | null;

type FastSavedNoticeContextValue = {
  notice: FastSavedNotice;
  remainingSeconds: number;
  dismiss: () => void;
};

const FastSavedNoticeContext = createContext<FastSavedNoticeContextValue | null>(null);

export function FastSavedNoticeProvider({ children }: { children: ReactNode }) {
  const previousHistoryUpdatedAt = useRef(getHistoryState().updatedAt);
  const [notice, setNotice] = useState<FastSavedNotice>(null);
  const [now, setNow] = useState(() => Date.now());
  const dismiss = useCallback(() => setNotice(null), []);
  const show = useCallback((sessionId: string) => {
    const timestamp = Date.now();
    setNow(timestamp);
    setNotice({ sessionId, expiresAt: timestamp + 5000 });
  }, []);

  useEffect(() => {
    return appStorage.subscribe((key) => {
      if (key !== StorageKey.History) return;

      const historyState = getHistoryState();
      if (historyState.updatedAt === previousHistoryUpdatedAt.current) return;

      previousHistoryUpdatedAt.current = historyState.updatedAt;
      const completedSession = historyState.sessions.find(
        (session) => session.endedAt === historyState.updatedAt,
      );
      if (completedSession !== undefined) show(completedSession.id);
    });
  }, [show]);

  useEffect(() => {
    if (notice === null) return;

    const interval = setInterval(() => setNow(Date.now()), 250);
    const timeout = setTimeout(dismiss, Math.max(0, notice.expiresAt - Date.now()));
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [dismiss, notice]);

  const value = useMemo<FastSavedNoticeContextValue>(
    () => ({
      notice,
      remainingSeconds:
        notice === null ? 0 : Math.max(0, Math.ceil((notice.expiresAt - now) / 1000)),
      dismiss,
    }),
    [dismiss, notice, now],
  );

  return (
    <FastSavedNoticeContext.Provider value={value}>
      {children}
    </FastSavedNoticeContext.Provider>
  );
}

export function useFastSavedNotice(): FastSavedNoticeContextValue {
  const context = useContext(FastSavedNoticeContext);
  if (context === null) throw new Error('useFastSavedNotice must be used inside its provider.');
  return context;
}
