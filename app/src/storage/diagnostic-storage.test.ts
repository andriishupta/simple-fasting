import { Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';

import { DiagnosticEventKind, StorageKey, appStorage } from '@/storage/app-storage';
import {
  createDiagnosticReport,
  getDiagnostics,
  recordDiagnosticError,
  shareDiagnosticReport,
  shouldPromptForRepeatedFailures,
} from '@/storage/diagnostic-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

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

  test('prompts only after three recent app-stopping failures', () => {
    const now = new Date('2026-06-21T12:01:00.000Z');

    expect(shouldPromptForRepeatedFailures({
      now,
      events: [
        {
          id: '1',
          kind: DiagnosticEventKind.Render,
          occurredAt: '2026-06-21T12:00:02.000Z',
          errorName: 'Error',
          message: 'one',
          context: null,
        },
        {
          id: '2',
          kind: DiagnosticEventKind.ReminderReconciliation,
          occurredAt: '2026-06-21T12:00:30.000Z',
          errorName: 'Error',
          message: 'ignored',
          context: null,
        },
        {
          id: '3',
          kind: DiagnosticEventKind.Render,
          occurredAt: '2026-06-21T12:00:45.000Z',
          errorName: 'Error',
          message: 'two',
          context: null,
        },
      ],
    })).toBe(false);

    expect(shouldPromptForRepeatedFailures({
      now,
      events: [
        {
          id: '1',
          kind: DiagnosticEventKind.StorageInitialization,
          occurredAt: '2026-06-21T12:00:05.000Z',
          errorName: 'Error',
          message: 'one',
          context: null,
        },
        {
          id: '2',
          kind: DiagnosticEventKind.Render,
          occurredAt: '2026-06-21T12:00:30.000Z',
          errorName: 'Error',
          message: 'two',
          context: null,
        },
        {
          id: '3',
          kind: DiagnosticEventKind.Render,
          occurredAt: '2026-06-21T12:00:55.000Z',
          errorName: 'Error',
          message: 'three',
          context: null,
        },
      ],
    })).toBe(true);
  });

  test('does not prompt for stale repeated failures', () => {
    expect(shouldPromptForRepeatedFailures({
      now: new Date('2026-06-21T12:03:00.000Z'),
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
