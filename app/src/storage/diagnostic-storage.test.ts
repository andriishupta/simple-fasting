import { Platform, Share } from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';

import {
  DiagnosticEventKind,
  StorageKey,
  appStorage,
  type DiagnosticEvent,
} from '@/storage/app-storage';
import {
  createDiagnosticReport,
  emailDiagnosticReport,
  getRepeatedFailurePromptEventId,
  getDiagnostics,
  isDiagnosticEmailAvailable,
  markRepeatedFailurePromptShown,
  recordDiagnosticError,
  shareDiagnosticReport,
  shouldPromptForRepeatedFailures,
} from '@/storage/diagnostic-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-mail-composer', () => ({
  composeAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
}));

const createDiagnosticEvent = ({
  id,
  kind = DiagnosticEventKind.Render,
  occurredAt,
}: {
  id: string;
  kind?: DiagnosticEventKind;
  occurredAt: string;
}): DiagnosticEvent => ({
  id,
  kind,
  occurredAt,
  errorName: 'Error',
  message: id,
  context: null,
});

describe('privacy-safe local diagnostics', () => {
  const initialPlatform = Platform.OS;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-21T12:00:00.000Z'));
    initializeAppStorage();
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: initialPlatform });
    jest.restoreAllMocks();
  });

  test('records sanitized error details without app data', () => {
    recordDiagnosticError({
      kind: DiagnosticEventKind.Render,
      error: new Error('Failed for person@example.com at https://example.com/private'),
      context: 'at Screen (/Users/person/project/screen.tsx:12)',
    });

    expect(getDiagnostics().events).toEqual([
      expect.objectContaining({
        kind: DiagnosticEventKind.Render,
        errorName: 'Error',
        message: 'Failed for <email> at <url>',
        context: 'at Screen (<path>)',
      }),
    ]);
    expect(createDiagnosticReport()).not.toContain('person@example.com');
    expect(createDiagnosticReport()).not.toContain('/Users/person');
  });

  test('keeps only the newest fifty events', () => {
    for (let index = 0; index < 55; index += 1) {
      recordDiagnosticError({
        kind: DiagnosticEventKind.ReminderReconciliation,
        error: `failure-${index}`,
        occurredAt: new Date(Date.UTC(2026, 5, 21, 12, 0, index)).toISOString(),
      });
    }

    const events = getDiagnostics().events;
    expect(events).toHaveLength(50);
    expect(events[0].message).toBe('failure-5');
    expect(events.at(-1)?.message).toBe('failure-54');
  });

  test('report excludes fasting storage partitions', () => {
    const report = JSON.parse(createDiagnosticReport()) as Record<string, unknown>;
    expect(report).toHaveProperty('diagnostics');
    expect(report).not.toHaveProperty('history');
    expect(report).not.toHaveProperty('settings');
    expect(report).not.toHaveProperty('activeFast');
    expect(appStorage.get(StorageKey.Diagnostics)?.events).toEqual([]);
  });

  test('shares diagnostics only after an explicit action', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

    await shareDiagnosticReport();

    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'simple-fasting-diagnostics-2026-06-21.json',
      message: expect.stringContaining('shared only after explicit user action'),
    }));
  });

  test('uses the native share sheet for diagnostic files when available', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const isAvailable = jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    const shareAsync = jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);

    await shareDiagnosticReport();

    expect(isAvailable).toHaveBeenCalled();
    expect(shareAsync).toHaveBeenCalledWith(
      expect.stringContaining('simple-fasting-diagnostics-2026-06-21.json'),
      expect.objectContaining({ mimeType: 'application/json' }),
    );
  });

  test('reports diagnostic email availability only when native mail is configured', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const isAvailable = jest.mocked(MailComposer.isAvailableAsync).mockResolvedValue(true);

    await expect(isDiagnosticEmailAvailable()).resolves.toBe(true);
    expect(isAvailable).toHaveBeenCalled();

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    await expect(isDiagnosticEmailAvailable()).resolves.toBe(false);
  });

  test('opens a native email composer with diagnostics attached', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const compose = jest.mocked(MailComposer.composeAsync).mockResolvedValue({
      status: 'sent',
    } as never);

    await emailDiagnosticReport();

    expect(compose).toHaveBeenCalledWith(expect.objectContaining({
      recipients: ['bugs@simplefasting.app'],
      subject: 'Simple Fasting bug report',
      body: expect.stringContaining('A local diagnostic JSON file is attached'),
      attachments: [expect.stringContaining('simple-fasting-diagnostics-2026-06-21.json')],
    }));
  });

  test('remembers the latest repeated failure prompt locally', () => {
    markRepeatedFailurePromptShown('event-1');

    expect(getDiagnostics().lastRepeatedFailurePromptEventId).toBe('event-1');
  });

  test('prompts after repeated app-stopping failures across minute hour or day windows', () => {
    const now = new Date('2026-06-21T12:05:00.000Z');

    expect(shouldPromptForRepeatedFailures({
      now,
      events: [
        createDiagnosticEvent({
          id: '1',
          occurredAt: '2026-06-21T12:00:02.000Z',
        }),
        createDiagnosticEvent({
          id: '2',
          kind: DiagnosticEventKind.ReminderReconciliation,
          occurredAt: '2026-06-21T12:00:30.000Z',
        }),
        createDiagnosticEvent({
          id: '3',
          occurredAt: '2026-06-21T12:00:55.000Z',
        }),
      ],
    })).toBe(false);

    expect(shouldPromptForRepeatedFailures({
      now,
      events: [
        createDiagnosticEvent({
          id: '1',
          kind: DiagnosticEventKind.StorageInitialization,
          occurredAt: '2026-06-21T12:00:05.000Z',
        }),
        createDiagnosticEvent({
          id: '2',
          occurredAt: '2026-06-21T12:00:30.000Z',
        }),
        createDiagnosticEvent({
          id: '3',
          occurredAt: '2026-06-21T12:00:55.000Z',
        }),
      ],
    })).toBe(true);
    expect(getRepeatedFailurePromptEventId({
      now,
      events: [
        createDiagnosticEvent({
          id: 'critical-1',
          kind: DiagnosticEventKind.StorageInitialization,
          occurredAt: '2026-06-21T12:00:05.000Z',
        }),
        createDiagnosticEvent({
          id: 'critical-2',
          occurredAt: '2026-06-21T12:00:30.000Z',
        }),
        createDiagnosticEvent({
          id: 'critical-3',
          occurredAt: '2026-06-21T12:00:55.000Z',
        }),
        createDiagnosticEvent({
          id: 'non-critical-latest',
          kind: DiagnosticEventKind.ReminderReconciliation,
          occurredAt: '2026-06-21T12:00:59.000Z',
        }),
      ],
    })).toBe('critical-3');

    expect(getRepeatedFailurePromptEventId({
      now,
      lastPromptedEventId: 'critical-3',
      events: [
        createDiagnosticEvent({
          id: 'critical-1',
          kind: DiagnosticEventKind.StorageInitialization,
          occurredAt: '2026-06-21T12:00:05.000Z',
        }),
        createDiagnosticEvent({
          id: 'critical-2',
          occurredAt: '2026-06-21T12:00:30.000Z',
        }),
        createDiagnosticEvent({
          id: 'critical-3',
          occurredAt: '2026-06-21T12:00:55.000Z',
        }),
      ],
    })).toBeNull();

    expect(shouldPromptForRepeatedFailures({
      now,
      events: [
        '2026-06-21T11:10:00.000Z',
        '2026-06-21T11:20:00.000Z',
        '2026-06-21T11:30:00.000Z',
        '2026-06-21T11:50:00.000Z',
        '2026-06-21T12:00:55.000Z',
      ].map((occurredAt, index) =>
        createDiagnosticEvent({ id: `hour-${index}`, occurredAt }),
      ),
    })).toBe(true);

    expect(shouldPromptForRepeatedFailures({
      now,
      events: [
        '2026-06-20T13:00:00.000Z',
        '2026-06-20T14:00:00.000Z',
        '2026-06-20T15:00:00.000Z',
        '2026-06-20T16:00:00.000Z',
        '2026-06-20T17:00:00.000Z',
        '2026-06-20T18:00:00.000Z',
        '2026-06-20T19:00:00.000Z',
        '2026-06-20T20:00:00.000Z',
        '2026-06-20T21:00:00.000Z',
        '2026-06-21T12:00:55.000Z',
      ].map((occurredAt, index) =>
        createDiagnosticEvent({ id: `day-${index}`, occurredAt }),
      ),
    })).toBe(true);
  });

  test('does not prompt for old repeated failures outside the diagnostic prompt window', () => {
    expect(shouldPromptForRepeatedFailures({
      now: new Date('2026-06-22T12:00:04.000Z'),
      events: [
        {
          id: '1',
          kind: DiagnosticEventKind.Render,
          occurredAt: '2026-06-21T12:00:01.000Z',
          errorName: 'Error',
          message: 'one',
          context: null,
        },
        {
          id: '2',
          kind: DiagnosticEventKind.Render,
          occurredAt: '2026-06-21T12:00:02.000Z',
          errorName: 'Error',
          message: 'two',
          context: null,
        },
        {
          id: '3',
          kind: DiagnosticEventKind.Render,
          occurredAt: '2026-06-21T12:00:03.000Z',
          errorName: 'Error',
          message: 'three',
          context: null,
        },
      ],
    })).toBe(false);
  });
});
