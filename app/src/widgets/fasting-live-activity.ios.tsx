import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  allowsTightening,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  progressViewStyle,
  tint,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import {
  AccentColorName,
  appStorage,
  StorageKey,
  TimerViewPreference,
  type ActiveFastState,
} from '@/storage/app-storage';
import { getAccentPalette } from '@/storage/settings-storage';
import { createFastingWidgetModel } from '@/widgets/fasting-widget-model';

type FastingLiveActivityProps = {
  accentColorDark: string;
  accentColorLight: string;
  goalDurationLabel: string;
  goalDurationHours: number;
  goalEndsAt: number;
  goalLabel: string;
  goalName: string;
  hasReachedGoal: boolean;
  progress: number;
  startedAt: number;
  timerView: TimerViewPreference;
};

function FastingLiveActivityView(
  props: FastingLiveActivityProps,
  _environment: LiveActivityEnvironment,
) {
  'widget';

  const primaryColor = '#F5F7FF';
  const secondaryColor = '#A9AFBD';
  const accentColor = props.accentColorDark || '#D97706';
  const islandPrimaryColor = '#F5F7FF';
  const islandSecondaryColor = '#A9AFBD';
  const distantFuture = new Date('2100-01-01T00:00:00.000Z');
  const startedAt = new Date(props.startedAt);
  const hasGoal = props.goalDurationHours > 0;
  const goalEndsAt = new Date(props.goalEndsAt);
  const showingRemaining = props.timerView === 'remaining' && hasGoal;
  const remainingReachedGoal = showingRemaining && goalEndsAt.getTime() <= Date.now();
  const icon = showingRemaining ? '↓' : '↑';
  const compactGoalLabel = hasGoal ? props.goalDurationLabel : 'Fast';

  const banner = (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ all: 14 }),
      ]}>
      <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
        <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(accentColor)]}>
            SIMPLE FASTING
          </Text>
          <HStack spacing={4} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
            {props.goalName ? (
              <>
                <Text
                  modifiers={[
                    font({ size: 16, weight: 'bold' }),
                    foregroundStyle(primaryColor),
                    lineLimit(1),
                    truncationMode('tail'),
                    allowsTightening(true),
                  ]}>
                  {props.goalName}
                </Text>
                <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(secondaryColor)]}>
                  ·
                </Text>
              </>
            ) : null}
            <Text
              modifiers={[
                font({ size: 16, weight: 'bold' }),
                foregroundStyle(accentColor),
                lineLimit(1),
              ]}>
              {props.goalDurationLabel}
            </Text>
          </HStack>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={3}>
          <HStack spacing={5}>
            <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accentColor)]}>
              {icon}
            </Text>
            {remainingReachedGoal ? (
              <Text
                modifiers={[
                  font({ size: 22, weight: 'bold', design: 'rounded' }),
                  foregroundStyle(primaryColor),
                  minimumScaleFactor(0.82),
                  lineLimit(1),
                ]}>
                00:00:00
              </Text>
            ) : (
              <Text
                timerInterval={{
                  lower: showingRemaining ? new Date() : startedAt,
                  upper: showingRemaining ? goalEndsAt : distantFuture,
                }}
                countsDown={showingRemaining}
                modifiers={[
                  font({ size: 22, weight: 'bold', design: 'rounded' }),
                  foregroundStyle(primaryColor),
                  minimumScaleFactor(0.82),
                  lineLimit(1),
                ]}
              />
            )}
            {props.hasReachedGoal ? (
              <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(accentColor)]}>
                ✓
              </Text>
            ) : null}
          </HStack>
        </VStack>
      </HStack>
      {props.goalDurationHours > 0 ? (
        <ProgressView
          timerInterval={{ lower: startedAt, upper: goalEndsAt }}
          countsDown={false}
          modifiers={[progressViewStyle('linear'), tint(accentColor)]}
        />
      ) : null}
    </VStack>
  );

  return {
    banner,
    compactLeading: (
      <HStack spacing={3}>
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(islandPrimaryColor), lineLimit(1)]}>
          {compactGoalLabel}
        </Text>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accentColor)]}>
          {icon}
        </Text>
      </HStack>
    ),
    compactTrailing: (
      <HStack spacing={4}>
        {remainingReachedGoal ? (
          <Text
            modifiers={[
              font({ size: 16, weight: 'bold', design: 'rounded' }),
              foregroundStyle(islandPrimaryColor),
              minimumScaleFactor(0.82),
              lineLimit(1),
            ]}>
            00:00:00
          </Text>
        ) : (
          <Text
            timerInterval={{
              lower: showingRemaining ? new Date() : startedAt,
              upper: showingRemaining ? goalEndsAt : distantFuture,
            }}
            countsDown={showingRemaining}
            modifiers={[
              font({ size: 16, weight: 'bold', design: 'rounded' }),
              foregroundStyle(islandPrimaryColor),
              minimumScaleFactor(0.82),
              lineLimit(1),
            ]}
          />
        )}
        {props.hasReachedGoal ? (
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(accentColor)]}>
            ✓
          </Text>
        ) : null}
      </HStack>
    ),
    minimal: (
      <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(accentColor)]}>
        SF
      </Text>
    ),
    expandedLeading: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(accentColor)]}>
          Simple
        </Text>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(accentColor)]}>
          Fasting
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={4} modifiers={[padding({ all: 8 })]}>
        <HStack spacing={5}>
          <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(accentColor)]}>
            {icon}
          </Text>
          {remainingReachedGoal ? (
            <Text
              modifiers={[
                font({ size: 20, weight: 'bold', design: 'rounded' }),
                foregroundStyle(islandPrimaryColor),
                minimumScaleFactor(0.82),
                lineLimit(1),
              ]}>
              00:00:00
            </Text>
          ) : (
            <Text
              timerInterval={{
                lower: showingRemaining ? new Date() : startedAt,
                upper: showingRemaining ? goalEndsAt : distantFuture,
              }}
              countsDown={showingRemaining}
              modifiers={[
                font({ size: 20, weight: 'bold', design: 'rounded' }),
                foregroundStyle(islandPrimaryColor),
                minimumScaleFactor(0.82),
                lineLimit(1),
              ]}
            />
          )}
          {props.hasReachedGoal ? (
            <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(accentColor)]}>
              ✓
            </Text>
          ) : null}
        </HStack>
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={7} modifiers={[padding({ horizontal: 8, bottom: 8 })]}>
        <HStack spacing={4}>
          {props.goalName ? (
            <>
              <Text
                modifiers={[
                  font({ size: 15, weight: 'bold' }),
                  foregroundStyle(islandPrimaryColor),
                  lineLimit(1),
                  truncationMode('tail'),
                  allowsTightening(true),
                ]}>
                {props.goalName}
              </Text>
              <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(islandSecondaryColor)]}>
                ·
              </Text>
            </>
          ) : null}
          <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accentColor)]}>
            {props.goalDurationLabel}
          </Text>
        </HStack>
        {props.goalDurationHours > 0 ? (
          <ProgressView
            timerInterval={{ lower: startedAt, upper: goalEndsAt }}
            countsDown={false}
            modifiers={[progressViewStyle('linear'), tint(accentColor)]}
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

  const accentColorName = settings.accentColorName ?? AccentColorName.Amber;
  const accentColorDark = getAccentPalette({ accentColorName, colorScheme: 'dark' }).accent;
  const accentColorLight = getAccentPalette({ accentColorName, colorScheme: 'light' }).accent;
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
    accentColorDark,
    accentColorLight,
    goalDurationLabel: model.goalDurationLabel,
    goalDurationHours: model.goalDurationHours,
    goalEndsAt: model.goalEndsAt,
    goalLabel: model.headline,
    goalName: model.goalName,
    hasReachedGoal: model.hasReachedGoal,
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
