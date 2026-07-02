import { createHistory, createSession } from '../../test/fixtures';
import {
  getCompletedDayKeys,
  getCompletedSessions,
  getCurrentStreakDays,
  getFastingStats,
  getLongestStreakDays,
} from '@/utils/fasting-analytics';
import { FastStatus } from '@/storage/app-storage';

const referenceDate = new Date(2026, 5, 21, 12);
const sessions = [
  createSession({ id: 'today', startedAt: '2026-06-21T00:00:00.000Z', endedAt: '2026-06-21T20:00:00.000Z', goalDurationHours: 16 }),
  createSession({ id: 'yesterday-a', startedAt: '2026-06-20T00:00:00.000Z', endedAt: '2026-06-20T12:00:00.000Z', goalDurationHours: 16 }),
  createSession({ id: 'yesterday-b', startedAt: '2026-06-20T13:00:00.000Z', endedAt: '2026-06-20T21:00:00.000Z', goalDurationHours: 0 }),
  createSession({ id: 'old', startedAt: '2026-06-18T00:00:00.000Z', endedAt: '2026-06-18T16:00:00.000Z', goalDurationHours: 16 }),
  createSession({ id: 'active', startedAt: '2026-06-21T10:00:00.000Z', endedAt: null, status: FastStatus.Active }),
];

describe('fasting analytics', () => {
  test('filters completed sessions and deduplicates completed days', () => {
    const completed = getCompletedSessions(createHistory(sessions));
    expect(completed).toHaveLength(4);
    expect(getCompletedDayKeys(completed)).toEqual(['2026-06-21', '2026-06-20', '2026-06-18']);
  });

  test('calculates current and longest streaks deterministically', () => {
    expect(getCurrentStreakDays(['2026-06-21', '2026-06-20'], referenceDate)).toBe(2);
    expect(getCurrentStreakDays(['2026-06-20', '2026-06-19'], referenceDate)).toBe(2);
    expect(getCurrentStreakDays(['2026-06-18'], referenceDate)).toBe(0);
    expect(getLongestStreakDays(['2026-06-21', '2026-06-20', '2026-06-18'])).toBe(2);
    expect(getLongestStreakDays([])).toBe(0);
  });

  test('calculates totals, averages, and goals', () => {
    const stats = getFastingStats(createHistory(sessions), referenceDate);

    expect(stats).toEqual({
      currentStreakDays: 2,
      longestStreakDays: 2,
      longestFastHours: 20,
      averageDurationHours: 14,
      completionRate: (1 + 0.75 + 1) / 3,
      totalHours: 56,
      totalFasts: 4,
    });
  });

  test('returns safe empty analytics', () => {
    const history = createHistory([]);
    expect(getFastingStats(history, referenceDate)).toEqual({
      currentStreakDays: 0,
      longestStreakDays: 0,
      longestFastHours: 0,
      averageDurationHours: 0,
      completionRate: 0,
      totalHours: 0,
      totalFasts: 0,
    });
  });
});
