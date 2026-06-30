import { FastStatus } from '@/storage/app-storage';
import { parseImportSessions } from '@/storage/data-import';

const session = {
  id: 'fast-1',
  status: FastStatus.Completed,
  startedAt: '2026-06-20T08:00:00.000Z',
  endedAt: '2026-06-21T00:00:00.000Z',
  goalDurationHours: 16,
  reason: 'Routine, "easy"',
  createdAt: '2026-06-20T08:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
};

describe('data import', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-24T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('reads the current JSON export shape', () => {
    expect(
      parseImportSessions({ content: JSON.stringify({ metadata: {}, data: [session] }), filename: 'backup.json' }),
    ).toEqual([session]);
  });

  it('reads quoted values from the current CSV export shape', () => {
    const content = [
      'exportedAt,appVersion,buildVersion,id,status,startedAt,endedAt,goalDurationHours,reason,createdAt,updatedAt',
      '2026-06-21,1.0.0,,fast-1,completed,2026-06-20T08:00:00.000Z,2026-06-21T00:00:00.000Z,16,"Routine, ""easy""",2026-06-20T08:00:00.000Z,2026-06-21T00:00:00.000Z',
    ].join('\n');

    expect(parseImportSessions({ content, filename: 'backup.csv' })).toEqual([session]);
  });

  it('rejects files without valid completed sessions', () => {
    expect(() =>
      parseImportSessions({
        content: 'id,status\nfast-1,completed',
        filename: 'backup.csv',
      }),
    ).toThrow('not a Simple Fasting export');

    expect(() =>
      parseImportSessions({
        content: JSON.stringify([{ ...session, status: FastStatus.Active, endedAt: null }]),
        filename: 'backup.json',
      }),
    ).toThrow('No valid completed fasting sessions');
  });

  it('rejects impossible imported session times', () => {
    expect(() =>
      parseImportSessions({
        content: JSON.stringify([
          {
            ...session,
            id: 'future',
            startedAt: '2099-06-20T08:00:00.000Z',
            endedAt: '2099-06-21T00:00:00.000Z',
          },
        ]),
        filename: 'backup.json',
      }),
    ).toThrow('cannot be in the future');

    expect(() =>
      parseImportSessions({
        content: JSON.stringify([
          {
            ...session,
            id: 'backwards',
            startedAt: '2026-06-21T08:00:00.000Z',
            endedAt: '2026-06-21T08:00:00.000Z',
          },
        ]),
        filename: 'backup.json',
      }),
    ).toThrow('end before they start');
  });
});
