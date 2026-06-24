import {
  GoalDurationFormat,
  TimerViewPreference,
  createEmptyActiveFastState,
} from '@/storage/app-storage';
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
      displayTime: '02:30:00',
      headline: 'Fasting goal · 2 hours',
      subtitle: 'Elapsed',
      progress: 1,
      goalEndsAt: Date.parse('2026-06-21T12:00:00.000Z'),
    }));
  });

  test('shows remaining time before the goal and elapsed time after the goal', () => {
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
      expect.objectContaining({ displayTime: '01:30:00', headline: '18:6 · 4 hours', subtitle: 'Remaining', progress: 0.625 }),
    );
    expect(createFastingWidgetModel({
      ...state,
      session: createSession({
        id: 'day-format',
        startedAt: '2026-06-21T10:00:00.000Z',
        endedAt: null,
        goalDurationHours: 24,
      }),
    }, now, 'Extended', GoalDurationFormat.Days)).toEqual(
      expect.objectContaining({ headline: 'Extended · 1d' }),
    );
    expect(createFastingWidgetModel(state, Date.parse('2026-06-22T10:00:00.000Z'))).toEqual(
      expect.objectContaining({
        displayTime: '24:00:00',
        progress: 1,
        subtitle: 'Elapsed',
        timerView: TimerViewPreference.Elapsed,
      }),
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
      displayTime: '00:00:00',
      hasGoal: false,
      progress: 0,
      headline: 'Open-ended fast',
      subtitle: 'Elapsed',
    }));
  });
});
