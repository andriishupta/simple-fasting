import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  FastSavedNoticeProvider,
  useFastSavedNotice,
} from '@/components/fast-saved-notice-context';
import { FastStatus, StorageKey, type HistoryState } from '@/storage/app-storage';
import { createSession } from '../../test/fixtures';

let mockStorageListener: ((key: StorageKey) => void) | undefined;
let mockHistoryState: HistoryState;

jest.mock('@/storage/app-storage', () => {
  const actual = jest.requireActual('@/storage/app-storage');

  return {
    ...actual,
    appStorage: {
      subscribe: jest.fn((listener: (key: StorageKey) => void) => {
        mockStorageListener = listener;
        return () => undefined;
      }),
    },
  };
});

jest.mock('@/storage/fasting-storage', () => ({
  getHistoryState: () => mockHistoryState,
}));

function NoticeProbe() {
  const { notice, remainingSeconds } = useFastSavedNotice();
  return <Text>{notice === null ? 'hidden' : `${notice.sessionId}:${remainingSeconds}`}</Text>;
}

describe('FastSavedNoticeProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-22T12:00:00.000Z'));
    mockStorageListener = undefined;
    mockHistoryState = {
      schemaVersion: 1,
      sessions: [],
      updatedAt: '2026-06-22T11:00:00.000Z',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows a completed fast for five seconds with a countdown', async () => {
    const screen = await render(
      <FastSavedNoticeProvider>
        <NoticeProbe />
      </FastSavedNoticeProvider>,
    );

    const endedAt = new Date().toISOString();
    mockHistoryState = {
      ...mockHistoryState,
      updatedAt: endedAt,
      sessions: [
        createSession({
          id: 'completed-fast',
          startedAt: '2026-06-22T08:00:00.000Z',
          endedAt,
          status: FastStatus.Completed,
        }),
      ],
    };

    await act(() => mockStorageListener?.(StorageKey.History));
    expect(screen.getByText('completed-fast:5')).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(4000));
    expect(screen.getByText('completed-fast:1')).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText('hidden')).toBeOnTheScreen();
  });
});
