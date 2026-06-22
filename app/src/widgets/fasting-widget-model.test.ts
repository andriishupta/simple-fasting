import { TimerViewPreference, createEmptyActiveFastState } from '@/storage/app-storage';
import { createFastingWidgetModel } from '@/widgets/fasting-widget-model';
import { createSession } from '../../test/fixtures';

const now = Date.parse('2026-06-21T12:30:00.000Z');

describe('fasting widget model', () => {
  test('describes the inactive widget', () => {
    expect(createFastingWidgetModel(createEmptyActiveFastState(new Date(now).toISOString()), now))
      .toEqual(expect.objectContaining({
        status: 'inactive',
        headline: 'Ready to fast?',
        accessibilityLabel: 'Open Simple Fasting to start a fast',
      }));
  });

  test('shows elapsed time and capped progress for a planned fast', () => {
    const model = createFastingWidgetModel({
      ...createEmptyActiveFastState(new Date(now).toISOString()),
      session: createSession({
        id: 'elapsed',
        startedAt: '2026-06-21T10:00:00.000Z',
        endedAt: null,
        goalDurationHours: 2,
      }),
    }, now);

    expect(model).toEqual(expect.objectContaining({
      status: 'active',
      displayTime: '2h 30m',
      headline: '2h goal · 2h',
      subtitle: 'Elapsed',
      progress: 1,
      goalEndsAt: Date.parse('2026-06-21T12:00:00.000Z'),
    }));
  });

  test('shows remaining time without going below zero', () => {
    const state = {
      ...createEmptyActiveFastState(new Date(now).toISOString()),
      timerViewPreference: TimerViewPreference.Remaining,
      session: createSession({
        id: 'remaining',
        startedAt: '2026-06-21T10:00:00.000Z',
        endedAt: null,
        goalDurationHours: 4,
      }),
    };

    expect(createFastingWidgetModel(state, now, '18:6')).toEqual(
      expect.objectContaining({ displayTime: '1h 30m', headline: '18:6 · 4h', subtitle: 'Remaining', progress: 0.625 }),
    );
    expect(createFastingWidgetModel(state, Date.parse('2026-06-22T10:00:00.000Z'))).toEqual(
      expect.objectContaining({ displayTime: '0h 00m', progress: 1 }),
    );
  });

  test('keeps open-ended fasts elapsed-only', () => {
    const model = createFastingWidgetModel({
      ...createEmptyActiveFastState(new Date(now).toISOString()),
      timerViewPreference: TimerViewPreference.Remaining,
      session: createSession({
        id: 'open-ended',
        startedAt: '2026-06-21T12:45:00.000Z',
        endedAt: null,
        goalDurationHours: 0,
      }),
    }, now);

    expect(model).toEqual(expect.objectContaining({
      status: 'active',
      displayTime: '0h 00m',
      hasGoal: false,
      progress: 0,
      headline: 'Open-ended fast',
      subtitle: 'Elapsed',
    }));
  });
});
