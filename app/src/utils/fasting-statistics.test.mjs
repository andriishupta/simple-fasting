import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCompletionRate,
  getLocalDayKey,
  getPreviousLocalDayKey,
  getRecentLocalDayKeys,
  getRecentLocalMonthKeys,
} from './fasting-statistics.ts';

const createSession = ({ id, hours, goalDurationHours }) => ({
  id,
  status: 'completed',
  startedAt: '2026-01-01T08:00:00.000Z',
  endedAt: new Date(Date.parse('2026-01-01T08:00:00.000Z') + hours * 3_600_000).toISOString(),
  goalDurationHours,
  reason: null,
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-01T08:00:00.000Z',
});

test('uses local calendar dates across day, month, and year boundaries', () => {
  assert.equal(getLocalDayKey(new Date(2026, 0, 2, 23, 30)), '2026-01-02');
  assert.equal(getPreviousLocalDayKey('2026-01-01'), '2025-12-31');
  assert.deepEqual(getRecentLocalDayKeys(3, new Date(2026, 0, 2, 12)), [
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
  ]);
  assert.deepEqual(getRecentLocalMonthKeys(3, new Date(2026, 0, 15)), [
    '2025-11',
    '2025-12',
    '2026-01',
  ]);
});

test('completion is averaged per planned fast and capped at 100 percent', () => {
  const sessions = [
    createSession({ id: 'half', hours: 8, goalDurationHours: 16 }),
    createSession({ id: 'over', hours: 20, goalDurationHours: 16 }),
    createSession({ id: 'unlimited', hours: 5, goalDurationHours: 0 }),
  ];

  assert.equal(getCompletionRate(sessions), 0.75);
});
