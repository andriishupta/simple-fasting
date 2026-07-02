import { t } from '@/locales/i18n';
import { FastStatus, type FastSession } from '@/storage/app-storage';
import { repairHistory } from '@/storage/storage-validation';

export type ParsedImportData = {
  sessions: readonly FastSession[];
  skippedSessions: number;
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
          : settings === null
            ? parsed
            : [];
    } else {
      source = parsed;
    }
  }

  if (!Array.isArray(source)) throw new Error(t('imports.invalidJson'));
  const repaired = repairHistory({ sessions: source }, new Date().toISOString()).value?.sessions ?? [];
  const currentTime = Date.now();
  const sessions = repaired.filter(
    (session) =>
      session.status === FastStatus.Completed &&
      session.endedAt !== null &&
      Date.parse(session.startedAt) <= currentTime &&
      Date.parse(session.endedAt) <= currentTime,
  );
  return {
    sessions,
    skippedSessions: Math.max(0, source.length - sessions.length),
    settings,
  };
};

export const parseImportSessions = ({
  content,
  filename,
}: {
  content: string;
  filename: string;
}): readonly FastSession[] => parseImportData({ content, filename }).sessions;
