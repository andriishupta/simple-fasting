import {
  customGoalId,
  formatGoalDuration,
  getGoalSelectionId,
  maxCustomDurationHours,
  unlimitedGoalId,
} from '@/utils/fast-goals';

describe('fast goal helpers', () => {
  test.each([
    [0, 'Unlimited'],
    [16, '16 hours'],
    [24, '1d'],
    [49, '2d 1h'],
  ])('formats %s hours', (hours, expected) => {
    expect(formatGoalDuration(hours as number)).toBe(expected);
  });

  test('selects standard, custom, and unlimited goal identifiers', () => {
    const goals = [{ id: 'goal-16', targetDurationHours: 16 }];
    expect(getGoalSelectionId(goals, 16)).toBe('goal-16');
    expect(getGoalSelectionId(goals, 17)).toBe(customGoalId);
    expect(getGoalSelectionId(goals, 0)).toBe(unlimitedGoalId);
    expect(maxCustomDurationHours).toBe(168);
  });
});
