import { ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  progressViewStyle,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import { TimerViewPreference, type ActiveFastState } from '@/storage/app-storage';

type FastingWidgetProps = {
  goalDurationHours: number;
  goalEndsAt: number;
  startedAt: number;
  status: 'active' | 'inactive';
  timerView: TimerViewPreference;
};

const appUrl = 'simple-fasting://';
const distantFuture = new Date('2100-01-01T00:00:00.000Z');

function FastingWidgetView(props: FastingWidgetProps, environment: WidgetEnvironment) {
  'widget';

  const isDark = environment.colorScheme === 'dark';
  const backgroundColor = isDark ? '#15171C' : '#F7F8FC';
  const primaryColor = isDark ? '#F5F7FF' : '#17191F';
  const secondaryColor = isDark ? '#A9AFBD' : '#626979';
  const accentColor = isDark ? '#8EA5FF' : '#526FE8';

  if (props.status !== 'active') {
    return (
      <VStack
        alignment="leading"
        spacing={5}
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
          containerBackground(backgroundColor, 'widget'),
          widgetURL(appUrl),
        ]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(accentColor)]}>
          SIMPLE FASTING
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 22, weight: 'bold', design: 'rounded' }),
            foregroundStyle(primaryColor),
          ]}>
          Ready to fast?
        </Text>
        <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(secondaryColor)]}>
          Open to start
        </Text>
      </VStack>
    );
  }

  const startedAt = new Date(props.startedAt);
  const hasGoal = props.goalDurationHours > 0;
  const goalEndsAt = new Date(props.goalEndsAt);

  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        containerBackground(backgroundColor, 'widget'),
        widgetURL(appUrl),
      ]}>
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(accentColor)]}>
        FASTING
      </Text>
      <Spacer />
      <Text
        timerInterval={{ lower: startedAt, upper: hasGoal ? goalEndsAt : distantFuture }}
        countsDown={hasGoal && props.timerView === TimerViewPreference.Remaining}
        modifiers={[
          font({ size: 29, weight: 'bold', design: 'rounded' }),
          foregroundStyle(primaryColor),
        ]}
      />
      {hasGoal ? (
        <ProgressView
          timerInterval={{ lower: startedAt, upper: goalEndsAt }}
          countsDown={false}
          modifiers={[progressViewStyle('linear'), foregroundStyle(accentColor)]}
        />
      ) : null}
      <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(secondaryColor)]}>
        {hasGoal ? `${props.goalDurationHours}h goal` : 'Open-ended fast'}
      </Text>
    </VStack>
  );
}

const fastingWidget = createWidget<FastingWidgetProps>('FastingWidget', FastingWidgetView);

export const updateFastingWidget = (state: ActiveFastState): void => {
  const { session, timerViewPreference } = state;
  const startedAt = session === null ? 0 : new Date(session.startedAt).getTime();
  const props: FastingWidgetProps =
    session === null
      ? {
          goalDurationHours: 0,
          goalEndsAt: 0,
          startedAt: 0,
          status: 'inactive',
          timerView: TimerViewPreference.Elapsed,
        }
      : {
          goalDurationHours: session.goalDurationHours,
          goalEndsAt: startedAt + session.goalDurationHours * 3_600_000,
          startedAt,
          status: 'active',
          timerView: timerViewPreference,
        };

  try {
    fastingWidget.updateSnapshot(props);
  } catch {
    // Widget availability must never block local fasting state updates.
  }
};
