import { t } from '@/locales/i18n';
import { FastStatus, type FastSession } from '@/storage/app-storage';
import { repairHistory } from '@/storage/storage-validation';

export type ParsedImportData = {
  sessions: readonly FastSession[];
  settings: unknown | null;
};

const requiredCsvColumns = [
  'id',
  'status',
  'startedAt',
  'endedAt',
  'goalDurationHours',
  'createdAt',
  'updatedAt',
] as const;

const parseCsvRows = (content: string): readonly (readonly string[])[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error(t('imports.unfinishedCsv'));
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
};

const parseCsvSessions = (content: string): readonly unknown[] => {
  const [headerRow, ...rows] = parseCsvRows(content);
  if (headerRow === undefined) throw new Error(t('imports.emptyCsv'));
  const indexes = new Map(headerRow.map((column, index) => [column.trim(), index]));
  if (requiredCsvColumns.some((column) => !indexes.has(column)) || (!indexes.has('note') && !indexes.has('reason'))) {
    throw new Error(t('imports.invalidCsv'));
  }
  const get = (row: readonly string[], column: string): string => {
    const index = indexes.get(column);
    return index === undefined ? '' : row[index] ?? '';
  };

  return rows.map((row) => ({
    id: get(row, 'id'),
    status: get(row, 'status'),
    startedAt: get(row, 'startedAt'),
    endedAt: get(row, 'endedAt') || null,
    goalDurationHours: Number(get(row, 'goalDurationHours')),
    reason: get(row, 'note') || get(row, 'reason') || null,
    createdAt: get(row, 'createdAt'),
    updatedAt: get(row, 'updatedAt'),
  }));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const assertImportTimesArePossible = (source: readonly unknown[]): void => {
  const currentTime = Date.now();
  const hasImpossibleTime = source.some((value) => {
    if (!isRecord(value) || value.status !== FastStatus.Completed || typeof value.startedAt !== 'string') {
      return false;
    }

    const startedAt = Date.parse(value.startedAt);
    const endedAt = typeof value.endedAt === 'string' ? Date.parse(value.endedAt) : Number.NaN;

    return (
      !Number.isFinite(startedAt) ||
      !Number.isFinite(endedAt) ||
      startedAt > currentTime ||
      endedAt > currentTime ||
      endedAt <= startedAt
    );
  });

  if (hasImpossibleTime) {
    throw new Error(t('imports.impossibleTime'));
  }
};

export const parseImportData = ({
  content,
  filename,
}: {
  content: string;
  filename: string;
}): ParsedImportData => {
  let source: unknown;
  let settings: unknown | null = null;

  if (filename.toLowerCase().endsWith('.csv')) {
    source = parseCsvSessions(content);
  } else {
    const parsed: unknown = JSON.parse(content);
    if (isRecord(parsed)) {
      settings = 'settings' in parsed ? parsed.settings : null;
      source = 'sessions' in parsed
        ? parsed.sessions
        : 'data' in parsed
          ? parsed.data
          : parsed;
    } else {
      source = parsed;
    }
  }

  if (!Array.isArray(source)) throw new Error(t('imports.invalidJson'));
  assertImportTimesArePossible(source);
  const repaired = repairHistory({ sessions: source }, new Date().toISOString()).value?.sessions ?? [];
  const sessions = repaired.filter(
    (session) => session.status === FastStatus.Completed && session.endedAt !== null,
  );
  if (source.length > 0 && sessions.length === 0) {
    throw new Error(t('imports.noSessions'));
  }
  return { sessions, settings };
};

export const parseImportSessions = ({
  content,
  filename,
}: {
  content: string;
  filename: string;
}): readonly FastSession[] => parseImportData({ content, filename }).sessions;
