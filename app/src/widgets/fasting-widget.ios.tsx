import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  progressViewStyle,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import {
  appStorage,
  StorageKey,
  TimerViewPreference,
  type ActiveFastState,
} from '@/storage/app-storage';
import { accentColorValues } from '@/storage/settings-storage';
import { createFastingWidgetModel } from '@/widgets/fasting-widget-model';

type FastingWidgetProps = {
  accentColor: string;
  goalDurationLabel: string;
  goalDurationHours: number;
  goalEndsAt: number;
  goalLabel: string;
  goalName: string;
  progress: number;
  startedAt: number;
  status: 'active' | 'inactive';
  timerView: TimerViewPreference;
};

function FastingWidgetView(props: FastingWidgetProps, environment: WidgetEnvironment) {
  'widget';

  // Widget views are serialized and evaluated outside the app's JS module scope.
  // Keep every runtime value inside this function so WidgetKit can resolve it.
  const appUrl = 'simple-fasting://';
  const distantFuture = new Date('2100-01-01T00:00:00.000Z');
  const isDark = environment.colorScheme === 'dark';
  const backgroundColor = isDark ? '#15171C' : '#F7F8FC';
  const primaryColor = isDark ? '#F5F7FF' : '#17191F';
  const secondaryColor = isDark ? '#A9AFBD' : '#626979';
  const accentColor = props.accentColor || (isDark ? '#8EA5FF' : '#526FE8');

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
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(accentColor)]}>
        SIMPLE FASTING
      </Text>
      <HStack spacing={4}>
        <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(primaryColor)]}>
          {props.goalName}
        </Text>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(secondaryColor)]}>
          ·
        </Text>
        <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(accentColor)]}>
          {props.goalDurationLabel}
        </Text>
      </HStack>
      <Spacer />
      <HStack spacing={4}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(secondaryColor)]}>
          {props.timerView === 'remaining' && hasGoal ? 'REMAINING' : 'ELAPSED'}
        </Text>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accentColor)]}>
          {props.timerView === 'remaining' && hasGoal ? '↓' : '↑'}
        </Text>
      </HStack>
      <Text
        timerInterval={{
          lower: props.timerView === 'remaining' && hasGoal ? new Date() : startedAt,
          upper: props.timerView === 'remaining' && hasGoal ? goalEndsAt : distantFuture,
        }}
        countsDown={hasGoal && props.timerView === 'remaining'}
        modifiers={[
          font({ size: 27, weight: 'bold', design: 'rounded' }),
          foregroundStyle(primaryColor),
        ]}
      />
      {hasGoal ? (
        <ProgressView
          value={props.progress}
          modifiers={[progressViewStyle('linear'), foregroundStyle(accentColor)]}
        />
      ) : null}
    </VStack>
  );
}

const fastingWidget = createWidget<FastingWidgetProps>('FastingWidget', FastingWidgetView);

export const updateFastingWidget = (state: ActiveFastState): void => {
  const settings = appStorage.get(StorageKey.Settings);
  const accentColor =
    settings?.accentColorName === undefined
      ? '#526FE8'
      : accentColorValues[settings.accentColorName];
  const goalName = settings?.goals.find(
    (goal) => goal.targetDurationHours === state.session?.goalDurationHours,
  )?.name;
  const model = createFastingWidgetModel(
    state,
    Date.now(),
    goalName,
    settings?.goalDurationFormat,
  );
  const props: FastingWidgetProps =
    model.status === 'inactive'
      ? {
          accentColor,
          goalDurationLabel: '',
          goalDurationHours: 0,
          goalEndsAt: 0,
          goalLabel: '',
          goalName: '',
          progress: 0,
          startedAt: 0,
          status: 'inactive',
          timerView: TimerViewPreference.Elapsed,
        }
      : {
          accentColor,
          goalDurationLabel: model.goalDurationLabel,
          goalDurationHours: model.goalDurationHours,
          goalEndsAt: model.goalEndsAt,
          goalLabel: model.headline,
          goalName: model.goalName,
          progress: model.progress,
          startedAt: model.startedAt,
          status: 'active',
          timerView: model.timerView,
        };

  try {
    fastingWidget.updateSnapshot(props);
  } catch {
    // Widget availability must never block local fasting state updates.
  }
};
