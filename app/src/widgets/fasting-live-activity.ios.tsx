import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  padding,
  progressViewStyle,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import {
  appStorage,
  StorageKey,
  TimerViewPreference,
  type ActiveFastState,
} from '@/storage/app-storage';
import { accentColorValues } from '@/storage/settings-storage';
import { createFastingWidgetModel } from '@/widgets/fasting-widget-model';

type FastingLiveActivityProps = {
  accentColor: string;
  goalDurationLabel: string;
  goalDurationHours: number;
  goalEndsAt: number;
  goalLabel: string;
  goalName: string;
  progress: number;
  startedAt: number;
  timerView: TimerViewPreference;
};

function FastingLiveActivityView(
  props: FastingLiveActivityProps,
  environment: LiveActivityEnvironment,
) {
  'widget';

  const isDark = environment.colorScheme === 'dark';
  const backgroundColor = isDark ? '#15171C' : '#F7F8FC';
  const primaryColor = isDark ? '#F5F7FF' : '#17191F';
  const secondaryColor = isDark ? '#A9AFBD' : '#626979';
  const islandPrimaryColor = '#F5F7FF';
  const islandSecondaryColor = '#A9AFBD';
  const distantFuture = new Date('2100-01-01T00:00:00.000Z');
  const startedAt = new Date(props.startedAt);
  const hasGoal = props.goalDurationHours > 0;
  const goalEndsAt = new Date(props.goalEndsAt);
  const showingRemaining = props.timerView === 'remaining' && hasGoal;
  const icon = showingRemaining ? '↓' : '↑';
  const compactGoalLabel = hasGoal ? props.goalDurationLabel : 'Fast';

  const banner = (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ all: 14 }),
        activityBackgroundTint(backgroundColor),
      ]}>
      <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(props.accentColor)]}>
            SIMPLE FASTING
          </Text>
          <HStack spacing={4}>
            <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(primaryColor)]}>
              {props.goalName}
            </Text>
            <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(secondaryColor)]}>
              ·
            </Text>
            <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(props.accentColor)]}>
              {props.goalDurationLabel}
            </Text>
          </HStack>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={3}>
          <HStack spacing={5}>
            <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(props.accentColor)]}>
              {icon}
            </Text>
            <Text
              timerInterval={{
                lower: showingRemaining ? new Date() : startedAt,
                upper: showingRemaining ? goalEndsAt : distantFuture,
              }}
              countsDown={showingRemaining}
              modifiers={[
                font({ size: 22, weight: 'bold', design: 'rounded' }),
                foregroundStyle(primaryColor),
              ]}
            />
          </HStack>
        </VStack>
      </HStack>
      {props.goalDurationHours > 0 ? (
        <ProgressView
          value={props.progress}
          modifiers={[progressViewStyle('linear'), foregroundStyle(props.accentColor)]}
        />
      ) : null}
    </VStack>
  );

  return {
    banner,
    compactLeading: (
      <HStack spacing={3}>
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(islandPrimaryColor)]}>
          {compactGoalLabel}
        </Text>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(props.accentColor)]}>
          {icon}
        </Text>
      </HStack>
    ),
    compactTrailing: (
      <Text
        timerInterval={{
          lower: showingRemaining ? new Date() : startedAt,
          upper: showingRemaining ? goalEndsAt : distantFuture,
        }}
        countsDown={showingRemaining}
        modifiers={[
          font({ size: 16, weight: 'bold', design: 'rounded' }),
          foregroundStyle(islandPrimaryColor),
        ]}
      />
    ),
    minimal: (
      <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(props.accentColor)]}>
        SF
      </Text>
    ),
    expandedLeading: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(props.accentColor)]}>
          Simple
        </Text>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(props.accentColor)]}>
          Fasting
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={4} modifiers={[padding({ all: 8 })]}>
        <HStack spacing={5}>
          <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(props.accentColor)]}>
            {icon}
          </Text>
          <Text
            timerInterval={{
              lower: showingRemaining ? new Date() : startedAt,
              upper: showingRemaining ? goalEndsAt : distantFuture,
            }}
            countsDown={showingRemaining}
            modifiers={[
              font({ size: 20, weight: 'bold', design: 'rounded' }),
              foregroundStyle(islandPrimaryColor),
            ]}
          />
        </HStack>
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={7} modifiers={[padding({ horizontal: 8, bottom: 8 })]}>
        <HStack spacing={4}>
          <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(islandPrimaryColor)]}>
            {props.goalName}
          </Text>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(islandSecondaryColor)]}>
            ·
          </Text>
          <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(props.accentColor)]}>
            {props.goalDurationLabel}
          </Text>
        </HStack>
        {props.goalDurationHours > 0 ? (
          <ProgressView
            value={props.progress}
            modifiers={[progressViewStyle('linear'), foregroundStyle(props.accentColor)]}
          />
        ) : (
          <Spacer />
        )}
      </VStack>
    ),
  };
}

const fastingLiveActivity = createLiveActivity<FastingLiveActivityProps>(
  'FastingWidget',
  FastingLiveActivityView,
);

const createProps = (state: ActiveFastState): FastingLiveActivityProps | null => {
  const settings = appStorage.get(StorageKey.Settings);

  if (state.session === null || settings?.liveActivitiesEnabled !== true) {
    return null;
  }

  const accentColor =
    settings.accentColorName === undefined
      ? '#526FE8'
      : accentColorValues[settings.accentColorName];
  const goalName = settings.goals.find(
    (goal) => goal.targetDurationHours === state.session?.goalDurationHours,
  )?.name;
  const model = createFastingWidgetModel(
    state,
    Date.now(),
    goalName,
    settings.goalDurationFormat,
  );

  if (model.status !== 'active') {
    return null;
  }

  return {
    accentColor,
    goalDurationLabel: model.goalDurationLabel,
    goalDurationHours: model.goalDurationHours,
    goalEndsAt: model.goalEndsAt,
    goalLabel: model.headline,
    goalName: model.goalName,
    progress: model.progress,
    startedAt: model.startedAt,
    timerView: model.timerView,
  };
};

export const syncFastingLiveActivity = async (state: ActiveFastState): Promise<void> => {
  try {
    const props = createProps(state);
    const instances = fastingLiveActivity.getInstances();

    if (props === null) {
      await Promise.all(instances.map((instance) => instance.end('immediate')));
      return;
    }

    if (instances.length === 0) {
      fastingLiveActivity.start(props, 'simple-fasting://');
      return;
    }

    await Promise.all(instances.map((instance) => instance.update(props)));
  } catch {
    // Live Activities are optional and must never block local fasting state updates.
  }
};
