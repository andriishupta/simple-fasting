import { FastStatus, type FastSession } from '@/storage/app-storage';
import { repairHistory } from '@/storage/storage-validation';

const requiredCsvColumns = [
  'id',
  'status',
  'startedAt',
  'endedAt',
  'goalDurationHours',
  'reason',
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

  if (quoted) throw new Error('The CSV file contains an unfinished quoted value.');
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
};

const parseCsvSessions = (content: string): readonly unknown[] => {
  const [headerRow, ...rows] = parseCsvRows(content);
  if (headerRow === undefined) throw new Error('The CSV file is empty.');
  const indexes = new Map(headerRow.map((column, index) => [column.trim(), index]));
  if (requiredCsvColumns.some((column) => !indexes.has(column))) {
    throw new Error('The CSV file is not a Simple Fasting export.');
  }
  const get = (row: readonly string[], column: string): string => row[indexes.get(column)!] ?? '';

  return rows.map((row) => ({
    id: get(row, 'id'),
    status: get(row, 'status'),
    startedAt: get(row, 'startedAt'),
    endedAt: get(row, 'endedAt') || null,
    goalDurationHours: Number(get(row, 'goalDurationHours')),
    reason: get(row, 'reason') || null,
    createdAt: get(row, 'createdAt'),
    updatedAt: get(row, 'updatedAt'),
  }));
};

export const parseImportSessions = ({
  content,
  filename,
}: {
  content: string;
  filename: string;
}): readonly FastSession[] => {
  let source: unknown;
  if (filename.toLowerCase().endsWith('.csv')) {
    source = parseCsvSessions(content);
  } else {
    const parsed: unknown = JSON.parse(content);
    source =
      typeof parsed === 'object' && parsed !== null && 'data' in parsed
        ? (parsed as { data: unknown }).data
        : parsed;
  }

  if (!Array.isArray(source)) throw new Error('The file does not contain a session list.');
  const repaired = repairHistory({ sessions: source }, new Date().toISOString()).value?.sessions ?? [];
  const sessions = repaired.filter(
    (session) => session.status === FastStatus.Completed && session.endedAt !== null,
  );
  if (source.length > 0 && sessions.length === 0) {
    throw new Error('No valid completed fasting sessions were found.');
  }
  return sessions;
};
