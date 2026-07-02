import {
  getCompletionRate,
  getLocalDayKey,
  getPreviousLocalDayKey,
} from '@/utils/fasting-statistics';

describe('fasting statistics date helpers', () => {
  test('use local calendar dates across day and year boundaries', () => {
    expect(getLocalDayKey(new Date(2026, 0, 2, 23, 30))).toBe('2026-01-02');
    expect(getPreviousLocalDayKey('2026-01-01')).toBe('2025-12-31');
  });
});

describe('completion rate', () => {
  test('averages planned completed fasts and caps each fast at 100 percent', () => {
    expect(
      getCompletionRate([
        { startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-01T08:00:00.000Z', goalDurationHours: 16 },
        { startedAt: '2026-01-02T00:00:00.000Z', endedAt: '2026-01-03T00:00:00.000Z', goalDurationHours: 12 },
        { startedAt: '2026-01-04T00:00:00.000Z', endedAt: null, goalDurationHours: 16 },
        { startedAt: '2026-01-05T00:00:00.000Z', endedAt: '2026-01-05T04:00:00.000Z', goalDurationHours: 0 },
      ]),
    ).toBe(0.75);
  });

  test('returns zero without planned completed fasts and clamps negative durations', () => {
    expect(getCompletionRate([])).toBe(0);
    expect(
      getCompletionRate([
        { startedAt: '2026-01-02T00:00:00.000Z', endedAt: '2026-01-01T00:00:00.000Z', goalDurationHours: 12 },
      ]),
    ).toBe(0);
  });
});
