import { FastStatus } from '@/storage/app-storage';
import {
  formatDuration,
  formatDurationWorklet,
  formatHours,
  getElapsedSeconds,
  getGoalSeconds,
  getSessionDurationHours,
  getSessionDurationSeconds,
} from '@/utils/fasting-duration';
import { createSession } from '../../test/fixtures';

describe('fasting duration helpers', () => {
  const completed = createSession({
    id: 'session',
    startedAt: '2026-06-21T00:00:00.000Z',
    endedAt: '2026-06-21T16:30:00.000Z',
    goalDurationHours: 16,
  });

  test('calculates completed and active durations safely', () => {
    expect(getSessionDurationSeconds(completed)).toBe(59_400);
    expect(getSessionDurationHours(completed)).toBe(16.5);
    expect(getElapsedSeconds(completed, new Date('2026-06-20T00:00:00.000Z').getTime())).toBe(0);

    const active = { ...completed, status: FastStatus.Active, endedAt: null };
    expect(getSessionDurationSeconds(active, new Date('2026-06-21T01:00:00.000Z').getTime())).toBe(3_600);
  });

  test('formats duration and hours consistently', () => {
    expect(formatDuration(3661.9)).toBe('01:01:01');
    expect(formatDuration(-5)).toBe('00:00:00');
    expect(formatDurationWorklet(3661.9)).toBe('01:01:01');
    expect(formatDurationWorklet(-5)).toBe('00:00:00');
    expect(formatHours(9.25)).toBe('9.3');
    expect(formatHours(10.4)).toBe('10');
    expect(getGoalSeconds(completed)).toBe(57_600);
    expect(getGoalSeconds({ ...completed, goalDurationHours: 0 })).toBe(1);
  });
});
