import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  labelsHidden,
  progressViewStyle,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import {
  AccentColorName,
  appStorage,
  GoalDurationFormat,
  StorageKey,
  TimerViewPreference,
  type ActiveFastState,
} from '@/storage/app-storage';
import { getAccentPalette } from '@/storage/settings-storage';
import { createFastingWidgetModel } from '@/widgets/fasting-widget-model';

type FastingWidgetProps = {
  accentColorDark: string;
  accentColorLight: string;
  durationFormat: GoalDurationFormat;
  goalDurationLabel: string;
  goalDurationHours: number;
  goalEndsAt: number;
  goalLabel: string;
  goalName: string;
  hasReachedGoal: boolean;
  progress: number;
  startedAt: number;
  status: 'active' | 'inactive';
  timerView: TimerViewPreference;
};

function FastingWidgetView(props: FastingWidgetProps, environment: WidgetEnvironment) {
  'widget';

  // Widget views are serialized and evaluated outside the app's JS module scope.
  // Keep every runtime value inside this function so WidgetKit can resolve it.
  const appUrl = 'simple-fasting://fast';
  const distantFuture = new Date('2100-01-01T00:00:00.000Z');
  const isDark = environment.colorScheme === 'dark';
  const backgroundColor = isDark ? '#15171C' : '#F7F8FC';
  const primaryColor = isDark ? '#F5F7FF' : '#17191F';
  const secondaryColor = isDark ? '#A9AFBD' : '#626979';
  const accentColor = isDark
    ? props.accentColorDark || '#D97706'
    : props.accentColorLight || '#F59E0B';
  const isMedium = environment.widgetFamily === 'systemMedium';
  const stoppedTimerText = props.durationFormat === 'days' ? '0s' : '00:00:00';

  if (props.status !== 'active') {
    if (isMedium) {
      return (
        <HStack
          alignment="center"
          spacing={16}
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
            containerBackground(backgroundColor, 'widget'),
            widgetURL(appUrl),
          ]}>
          <VStack alignment="leading" spacing={5} modifiers={[frame({ maxWidth: Infinity })]}>
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(accentColor)]}>
              SIMPLE FASTING
            </Text>
            <Text
              modifiers={[
                font({ size: 24, weight: 'bold', design: 'rounded' }),
                foregroundStyle(primaryColor),
              ]}>
              Ready to fast?
            </Text>
            <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(secondaryColor)]}>
              Open to start
            </Text>
          </VStack>
          <Text modifiers={[font({ size: 28, weight: 'bold' }), foregroundStyle(accentColor)]}>
            +
          </Text>
        </HStack>
      );
    }

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
  const showingRemaining = props.timerView === 'remaining' && hasGoal;
  const remainingReachedGoal = showingRemaining && goalEndsAt.getTime() <= Date.now();

  if (isMedium) {
    return (
      <HStack
        alignment="center"
        spacing={18}
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
          containerBackground(backgroundColor, 'widget'),
          widgetURL(appUrl),
        ]}>
        <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: Infinity })]}>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(accentColor)]}>
            SIMPLE FASTING
          </Text>
          <HStack spacing={4}>
            {props.goalName ? (
              <>
                <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(primaryColor)]}>
                  {props.goalName}
                </Text>
                <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(secondaryColor)]}>
                  ·
                </Text>
              </>
            ) : null}
            <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accentColor)]}>
              {props.goalDurationLabel}
            </Text>
          </HStack>
          <HStack spacing={4}>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(secondaryColor)]}>
              {showingRemaining ? 'REMAINING' : 'ELAPSED'}
            </Text>
            {props.hasReachedGoal ? (
              <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(accentColor)]}>
                ✓
              </Text>
            ) : null}
          </HStack>
          {hasGoal ? (
            <ProgressView
              timerInterval={{ lower: startedAt, upper: goalEndsAt }}
              countsDown={false}
              modifiers={[progressViewStyle('linear'), tint(accentColor), labelsHidden()]}
            />
          ) : null}
        </VStack>
        <VStack alignment="trailing" spacing={4}>
          <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accentColor)]}>
            {showingRemaining ? '↓' : '↑'}
          </Text>
          {remainingReachedGoal ? (
            <Text
              modifiers={[
                font({ size: 32, weight: 'bold', design: 'rounded' }),
                foregroundStyle(primaryColor),
              ]}>
              {stoppedTimerText}
            </Text>
          ) : (
            <Text
              timerInterval={{
                lower: showingRemaining ? new Date() : startedAt,
                upper: showingRemaining ? goalEndsAt : distantFuture,
              }}
              countsDown={showingRemaining}
              modifiers={[
                font({ size: 32, weight: 'bold', design: 'rounded' }),
                foregroundStyle(primaryColor),
              ]}
            />
          )}
        </VStack>
      </HStack>
    );
  }

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
        {props.goalName ? (
          <>
            <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(primaryColor)]}>
              {props.goalName}
            </Text>
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(secondaryColor)]}>
              ·
            </Text>
          </>
        ) : null}
        <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(accentColor)]}>
          {props.goalDurationLabel}
        </Text>
      </HStack>
      <Spacer />
      <HStack spacing={4} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(secondaryColor)]}>
          {showingRemaining ? 'REMAINING' : 'ELAPSED'}
        </Text>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accentColor)]}>
          {showingRemaining ? '↓' : '↑'}
        </Text>
        <Spacer />
        {props.hasReachedGoal ? (
          <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(accentColor)]}>
            ✓
          </Text>
        ) : null}
      </HStack>
      {remainingReachedGoal ? (
        <Text
          modifiers={[
            font({ size: 24, weight: 'bold', design: 'rounded' }),
            foregroundStyle(primaryColor),
          ]}>
          {stoppedTimerText}
        </Text>
      ) : (
        <Text
          timerInterval={{
            lower: showingRemaining ? new Date() : startedAt,
            upper: showingRemaining ? goalEndsAt : distantFuture,
          }}
          countsDown={showingRemaining}
          modifiers={[
            font({ size: 24, weight: 'bold', design: 'rounded' }),
            foregroundStyle(primaryColor),
          ]}
        />
      )}
      {hasGoal ? (
        <ProgressView
          timerInterval={{ lower: startedAt, upper: goalEndsAt }}
          countsDown={false}
          modifiers={[progressViewStyle('linear'), tint(accentColor), labelsHidden()]}
        />
      ) : null}
    </VStack>
  );
}

const fastingWidget = createWidget<FastingWidgetProps>('FastingWidget', FastingWidgetView);

export const updateFastingWidget = (state: ActiveFastState): void => {
  const settings = appStorage.get(StorageKey.Settings);
  const accentColorName = settings?.accentColorName ?? AccentColorName.Amber;
  const accentColorDark = getAccentPalette({ accentColorName, colorScheme: 'dark' }).accent;
  const accentColorLight = getAccentPalette({ accentColorName, colorScheme: 'light' }).accent;
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
          accentColorDark,
          accentColorLight,
          durationFormat: settings?.goalDurationFormat ?? GoalDurationFormat.Hours,
          goalDurationLabel: '',
          goalDurationHours: 0,
          goalEndsAt: 0,
          goalLabel: '',
          goalName: '',
          hasReachedGoal: false,
          progress: 0,
          startedAt: 0,
          status: 'inactive',
          timerView: TimerViewPreference.Elapsed,
        }
      : {
          accentColorDark,
          accentColorLight,
          durationFormat: settings?.goalDurationFormat ?? GoalDurationFormat.Hours,
          goalDurationLabel: model.goalDurationLabel,
          goalDurationHours: model.goalDurationHours,
          goalEndsAt: model.goalEndsAt,
          goalLabel: model.headline,
          goalName: model.goalName,
          hasReachedGoal: model.hasReachedGoal,
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
