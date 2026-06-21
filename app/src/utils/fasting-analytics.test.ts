import { createHistory, createSession } from '../../test/fixtures';
import {
  getChartData,
  getCompletedDayKeys,
  getCompletedSessions,
  getCurrentStreakDays,
  getDurationDistribution,
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

  test('calculates totals, averages, goals, and distribution buckets', () => {
    const completed = getCompletedSessions(createHistory(sessions));
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
    expect(getDurationDistribution(completed).map(({ value }) => value)).toEqual([1, 1, 1, 1]);
  });

  test('builds bounded chart series using the supplied clock and locale', () => {
    const charts = getChartData(createHistory(sessions), referenceDate, 'en-US');

    expect(charts.weeklyHeatmap).toHaveLength(7);
    expect(charts.monthlyHeatmap).toHaveLength(30);
    expect(charts.yearlyHeatmap).toHaveLength(365);
    expect(charts.monthlyHours).toHaveLength(6);
    expect(charts.recentDurations).toHaveLength(4);
    expect(charts.weeklyHeatmap.at(-1)).toEqual({ id: '2026-06-21', value: 20 });
    expect(charts.monthlyHours.at(-1)).toEqual({ label: '06', value: 56 });
    expect(charts.completionRate).toBeCloseTo((1 + 0.75 + 1) / 3);
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
