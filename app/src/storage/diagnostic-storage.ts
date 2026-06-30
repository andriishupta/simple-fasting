import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import {
  DiagnosticEventKind,
  StorageKey,
  appStorage,
  createEmptyDiagnosticsState,
  type DiagnosticEvent,
  type DiagnosticsState,
} from '@/storage/app-storage';

const maximumDiagnosticEvents = 50;
const maximumMessageLength = 1_000;
const maximumContextLength = 2_000;
const repeatedFailureWindowMs = 60_000;
const repeatedFailurePromptFreshnessMs = 10_000;
const repeatedFailureThreshold = 3;

const promptableFailureKinds = new Set<DiagnosticEventKind>([
  DiagnosticEventKind.FatalJs,
  DiagnosticEventKind.StorageInitialization,
  DiagnosticEventKind.Render,
]);

const redactDiagnosticText = (value: string, maximumLength: number): string =>
  value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '<email>')
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/\/(?:Users|home)\/[^\s)]+/g, '<path>')
    .replace(/[A-Za-z]:\\[^\s)]+/g, '<path>')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maximumLength);

const describeError = (error: unknown): { errorName: string; message: string } => {
  if (error instanceof Error) {
    return {
      errorName: redactDiagnosticText(error.name || 'Error', 100),
      message: redactDiagnosticText(error.message || 'Unknown error', maximumMessageLength),
    };
  }

  return {
    errorName: 'UnknownError',
    message: redactDiagnosticText(String(error), maximumMessageLength),
  };
};

export const getDiagnostics = (): DiagnosticsState => {
  const timestamp = new Date().toISOString();
  return appStorage.getOrDefault(
    StorageKey.Diagnostics,
    createEmptyDiagnosticsState(timestamp),
  );
};

export const recordDiagnosticError = ({
  kind,
  error,
  context = null,
  occurredAt = new Date().toISOString(),
}: {
  kind: DiagnosticEventKind;
  error: unknown;
  context?: string | null;
  occurredAt?: string;
}): void => {
  try {
    const current = getDiagnostics();
    const description = describeError(error);
    const event: DiagnosticEvent = {
      id: `${occurredAt}:${kind}:${current.events.length}`,
      kind,
      occurredAt,
      ...description,
      context:
        context === null ? null : redactDiagnosticText(context, maximumContextLength) || null,
    };
    const nextEvents = [...current.events, event].slice(-maximumDiagnosticEvents);

    appStorage.insert(StorageKey.Diagnostics, {
      ...current,
      events: nextEvents,
      updatedAt: occurredAt,
    });
  } catch {
    // Diagnostics must never create a second failure or block normal app recovery.
  }
};

export const shouldPromptForRepeatedFailures = ({
  events,
  now = new Date(),
}: {
  events: readonly DiagnosticEvent[];
  now?: Date;
}): boolean => {
  const nowMs = now.getTime();
  const promptableEvents = events
    .map((event) => ({ event, occurredAtMs: Date.parse(event.occurredAt) }))
    .filter(({ event, occurredAtMs }) =>
      promptableFailureKinds.has(event.kind) &&
      Number.isFinite(occurredAtMs) &&
      nowMs - occurredAtMs >= 0 &&
      nowMs - occurredAtMs <= repeatedFailureWindowMs,
    );
  const latestFailureMs = promptableEvents.at(-1)?.occurredAtMs;

  return (
    promptableEvents.length >= repeatedFailureThreshold &&
    latestFailureMs !== undefined &&
    nowMs - latestFailureMs <= repeatedFailurePromptFreshnessMs
  );
};

export const createDiagnosticReport = (): string =>
  JSON.stringify(
    {
      notice:
        'Created locally by Simple Fasting and shared only after explicit user action. No fasting history, notes, settings, account data, or device identifiers are included.',
      app: {
        version: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0',
        buildVersion: Constants.nativeBuildVersion ?? null,
        platform: Platform.OS,
      },
      diagnostics: getDiagnostics().events,
    },
    null,
    2,
  );

export const shareDiagnosticReport = async (): Promise<void> => {
  const filename = `simple-fasting-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
  const content = createDiagnosticReport();

  if (Platform.OS === 'web') {
    await Share.share({ title: filename, message: content });
    return;
  }

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Share Simple Fasting diagnostics',
      mimeType: 'application/json',
      UTI: 'public.json',
    });
    return;
  }

  await Share.share({ title: filename, message: content });
};
