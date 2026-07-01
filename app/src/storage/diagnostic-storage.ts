import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
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
const bugReportEmail = 'bugs@simplefasting.app';

const repeatedFailurePromptRules = [
  { threshold: 3, windowMs: 60_000 },
  { threshold: 5, windowMs: 3_600_000 },
  { threshold: 10, windowMs: 86_400_000 },
] as const;
const repeatedFailurePromptMaximumAgeMs = Math.max(
  ...repeatedFailurePromptRules.map(({ windowMs }) => windowMs),
);

const promptableFailureKinds = new Set<DiagnosticEventKind>([
  DiagnosticEventKind.FatalJs,
  DiagnosticEventKind.StorageInitialization,
  DiagnosticEventKind.Render,
  DiagnosticEventKind.UnhandledJs,
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

export const getRepeatedFailurePromptEventId = ({
  events,
  lastPromptedEventId = null,
  now = new Date(),
}: {
  events: readonly DiagnosticEvent[];
  lastPromptedEventId?: string | null;
  now?: Date;
}): string | null => {
  const nowMs = now.getTime();
  const promptableEvents = events
    .map((event) => ({ event, occurredAtMs: Date.parse(event.occurredAt) }))
    .filter(({ event, occurredAtMs }) =>
      promptableFailureKinds.has(event.kind) &&
      Number.isFinite(occurredAtMs) &&
      nowMs - occurredAtMs >= 0,
    )
    .sort((left, right) => left.occurredAtMs - right.occurredAtMs);

  const latestFailure = promptableEvents.at(-1);
  if (
    latestFailure === undefined ||
    latestFailure.event.id === lastPromptedEventId ||
    nowMs - latestFailure.occurredAtMs > repeatedFailurePromptMaximumAgeMs
  ) {
    return null;
  }

  const shouldPrompt = repeatedFailurePromptRules.some(
    (rule) =>
      promptableEvents.filter(
        ({ occurredAtMs }) =>
          latestFailure.occurredAtMs - occurredAtMs >= 0 &&
          latestFailure.occurredAtMs - occurredAtMs <= rule.windowMs,
      ).length >= rule.threshold,
  );

  return shouldPrompt ? latestFailure.event.id : null;
};

export const shouldPromptForRepeatedFailures = ({
  events,
  lastPromptedEventId = null,
  now = new Date(),
}: {
  events: readonly DiagnosticEvent[];
  lastPromptedEventId?: string | null;
  now?: Date;
}): boolean => getRepeatedFailurePromptEventId({
  events,
  lastPromptedEventId,
  now,
}) !== null;

export const markRepeatedFailurePromptShown = (eventId: string): void => {
  try {
    const current = getDiagnostics();
    appStorage.insert(StorageKey.Diagnostics, {
      ...current,
      lastRepeatedFailurePromptEventId: eventId,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Prompt bookkeeping must never block the app.
  }
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

const createDiagnosticReportFile = (): File => {
  const filename = `simple-fasting-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
  const content = createDiagnosticReport();
  const file = new File(Paths.cache, filename);

  file.create({ overwrite: true });
  file.write(content);

  return file;
};

export const isDiagnosticEmailAvailable = async (): Promise<boolean> =>
  Platform.OS !== 'web' && MailComposer.isAvailableAsync();

export const emailDiagnosticReport = async (): Promise<void> => {
  const file = createDiagnosticReportFile();

  await MailComposer.composeAsync({
    recipients: [bugReportEmail],
    subject: 'Simple Fasting bug report',
    body:
      'Describe what happened and what you expected.\n\n' +
      'A local diagnostic JSON file is attached. It is created only after your action and does not intentionally include fasting history, notes, settings, account data, or device identifiers.',
    attachments: [file.uri],
  });
};

export const shareDiagnosticReport = async (): Promise<void> => {
  const filename = `simple-fasting-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
  const content = createDiagnosticReport();

  if (Platform.OS === 'web') {
    await Share.share({ title: filename, message: content });
    return;
  }

  const file = createDiagnosticReportFile();

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
