import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { FeedbackState } from '@/components/feedback-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DataPanel } from '@/app/(tabs)/history';
import {
  cancelFast,
  endFast,
  formatDuration,
  getElapsedSeconds,
  getGoalSeconds,
  setActiveFastEndReminderEnabled,
  startFast,
  useActiveFastState,
} from '@/storage/fasting-storage';
import { getDefaultGoal, useSettings } from '@/storage/settings-storage';
import { type FastingGoal } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';

const customGoalId = 'custom-duration';
const unlimitedGoalId = 'unlimited-duration';
const maxCustomDurationDays = 7;
const maxCustomDurationHours = maxCustomDurationDays * 24 + 24;
const goalRowHeight = 52;
const durationWheelRowHeight = 44;
const logoSource = require('../../../assets/images/icon.png') as number;

const getInitialGoalId = (goals: readonly FastingGoal[], lastUsedGoalDurationHours: number): string =>
  lastUsedGoalDurationHours === 0
    ? unlimitedGoalId
    : goals.find((goal) => goal.targetDurationHours === lastUsedGoalDurationHours)?.id ?? customGoalId;

const getCustomDays = (goalDurationHours: number): number =>
  Math.max(1, Math.min(maxCustomDurationDays, Math.floor(goalDurationHours / 24)));

const getCustomHours = (goalDurationHours: number): number => {
  const remainingHours = Math.max(0, goalDurationHours - Math.floor(goalDurationHours / 24) * 24);

  return Math.max(1, Math.min(24, Math.round(remainingHours) || 24));
};

const formatGoalDuration = (durationHours: number): string => {
  if (durationHours <= 0) {
    return 'Unlimited';
  }

  const days = Math.floor(durationHours / 24);
  const hours = Math.floor(durationHours % 24);
  const minutes = Math.round((durationHours - Math.floor(durationHours)) * 60);
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? '0h' : parts.join(' ');
};

export default function HomeScreen() {
  const settings = useSettings();
  const activeFastState = useActiveFastState();
  const theme = useTheme();
  const defaultGoal = getDefaultGoal(settings);
  const [selectedGoalId, setSelectedGoalId] = useState(() =>
    getInitialGoalId(settings.goals, settings.lastUsedGoalDurationHours),
  );
  const [customDays, setCustomDays] = useState(() =>
    getCustomDays(settings.lastUsedGoalDurationHours),
  );
  const [customHours, setCustomHours] = useState(() =>
    getCustomHours(settings.lastUsedGoalDurationHours),
  );
  const [reason, setReason] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [operationError, setOperationError] = useState<string | null>(null);
  const activeSession = activeFastState.session;
  const fastEndReminderAt =
    activeSession !== null &&
    activeFastState.fastEndNotificationId !== null &&
    activeFastState.fastEndReminderEnabled &&
    settings.notifications.fastEndReminderEnabled
      ? new Date(
          new Date(activeSession.startedAt).getTime() + activeSession.goalDurationHours * 3_600_000,
        )
      : null;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  const selectedGoal =
    settings.goals.find((goal) => goal.id === selectedGoalId) ?? defaultGoal;
  const customDurationHours = customDays * 24 + customHours;
  const selectedDurationHours =
    selectedGoalId === unlimitedGoalId
      ? 0
      : selectedGoalId === customGoalId
        ? customDurationHours
        : selectedGoal.targetDurationHours;
  const startSelectedFast = async (): Promise<void> => {
    if (selectedGoalId !== unlimitedGoalId && selectedDurationHours <= 0) {
      Alert.alert('Choose a duration', 'Set at least 1 minute for a custom fast.');
      return;
    }

    if (selectedGoalId === customGoalId && selectedDurationHours > maxCustomDurationHours) {
      Alert.alert(
        'Duration is too long',
        `Custom fasts can be up to ${maxCustomDurationDays} days and 24 hours.`,
      );
      return;
    }

    try {
      await startFast({
        goalDurationHours: selectedDurationHours,
        reason: reason.trim() === '' ? null : reason.trim(),
      });
      setReason('');
      setOperationError(null);
    } catch {
      setOperationError('The fast could not be started. Check local storage and try again.');
      Alert.alert('Unable to start fast', 'Please try again.');
    }
  };
  const endActiveFast = async (): Promise<void> => {
    try {
      const completedSession = await endFast();
      setOperationError(null);

      if (completedSession !== null) {
        router.push(`/history/${completedSession.id}?edit=1`);
      }
    } catch {
      setOperationError('The fast could not be ended. Your active fast is still saved locally.');
      Alert.alert('Unable to end fast', 'Please try again.');
    }
  };
  const cancelActiveFast = (): void => {
    Alert.alert('Cancel fast?', 'This stops the active fast without saving it to history.', [
      { text: 'Keep Fasting', style: 'cancel' },
      {
        text: 'Cancel Fast',
        style: 'destructive',
        onPress: () => {
          void cancelFast().catch(() => {
            setOperationError('The fast could not be cancelled. Your active fast is still saved locally.');
            Alert.alert('Unable to cancel fast', 'Please try again.');
          });
        },
      },
    ]);
  };
  const setCurrentFastEndReminderEnabled = async (
    fastEndReminderEnabled: boolean,
  ): Promise<void> => {
    try {
      await setActiveFastEndReminderEnabled(fastEndReminderEnabled);
      setOperationError(null);
    } catch {
      setOperationError('The fast reminder could not be updated.');
      Alert.alert('Unable to update reminder', 'Please try again.');
    }
  };

  return (
    <ScreenScaffold
      title="Fast"
      eyebrow="Current fast"
      action={<HeaderIcon label="Settings" onPress={() => router.push('/settings')} />}>
      {activeSession === null ? (
        <ThemedView style={styles.section}>
          {operationError !== null && (
            <FeedbackState
              kind="error"
              title="Fast action failed"
              description={operationError}
              action={{ label: 'Dismiss', onPress: () => setOperationError(null) }}
            />
          )}
          <ThemedText>No active fast yet.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Choose a goal and start when you are ready.
          </ThemedText>

          <GoalPicker
            goals={settings.goals}
            selectedGoalId={selectedGoalId}
            onSelect={setSelectedGoalId}
          />

          {selectedGoalId === customGoalId && (
            <ThemedView style={styles.customGoal}>
              <CustomDurationPicker
                days={customDays}
                hours={customHours}
                onDaysChange={setCustomDays}
                onHoursChange={setCustomHours}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Maximum custom fast: {maxCustomDurationDays} days and 24 hours.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                This app is for tracking only and is not medical advice. Read the policy and terms
                of use for more information.
              </ThemedText>
            </ThemedView>
          )}
          {selectedGoalId === unlimitedGoalId && (
            <ThemedView style={styles.customGoal}>
              <ThemedText type="small" themeColor="textSecondary">
                Unlimited fasts have no planned end time and no fast-end reminder.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                This app is for tracking only and is not medical advice. Read the policy and terms
                of use for more information.
              </ThemedText>
            </ThemedView>
          )}

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (optional)"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.reasonInput,
              {
                color: theme.text,
              },
            ]}
          />

          <LogoActionButton label="Start fast" onPress={startSelectedFast} />
        </ThemedView>
      ) : (
        <>
          {operationError !== null && (
            <FeedbackState
              kind="error"
              title="Fast action failed"
              description={operationError}
              action={{ label: 'Dismiss', onPress: () => setOperationError(null) }}
            />
          )}
          <ActiveFastPanel
            goalName={formatGoalDuration(activeSession.goalDurationHours)}
            onEnd={endActiveFast}
            startedAt={activeSession.startedAt}
            reason={activeSession.reason}
            elapsedSeconds={getElapsedSeconds(activeSession, currentTime)}
            goalSeconds={
              activeSession.goalDurationHours > 0 ? getGoalSeconds(activeSession) : null
            }
            onCancel={cancelActiveFast}
            fastEndReminderAt={fastEndReminderAt}
            fastEndReminderEnabled={activeFastState.fastEndReminderEnabled}
            onFastEndReminderEnabledChange={(fastEndReminderEnabled) => {
              void setCurrentFastEndReminderEnabled(fastEndReminderEnabled);
            }}
          />
        </>
      )}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Data
        </ThemedText>
        <DataPanel />
      </ThemedView>
    </ScreenScaffold>
  );
}

function HeaderIcon({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <ThemedText type="subtitle">⚙</ThemedText>
    </Pressable>
  );
}

function ActiveFastPanel({
  goalName,
  startedAt,
  reason,
  elapsedSeconds,
  goalSeconds,
  onEnd,
  onCancel,
  fastEndReminderAt,
  fastEndReminderEnabled,
  onFastEndReminderEnabledChange,
}: {
  goalName: string;
  startedAt: string;
  reason: string | null;
  elapsedSeconds: number;
  goalSeconds: number | null;
  onEnd: () => void;
  onCancel: () => void;
  fastEndReminderAt: Date | null;
  fastEndReminderEnabled: boolean;
  onFastEndReminderEnabledChange: (enabled: boolean) => void;
}) {
  const [timerView, setTimerView] = useState<'elapsed' | 'remaining'>('elapsed');
  const theme = useTheme();
  const isUnlimited = goalSeconds === null;
  const startedDate = new Date(startedAt);
  const willEndAt =
    goalSeconds === null ? null : new Date(startedDate.getTime() + goalSeconds * 1000);
  const progress = goalSeconds === null ? 0 : Math.min(1, elapsedSeconds / goalSeconds);
  const remainingSeconds = goalSeconds === null ? null : Math.max(0, goalSeconds - elapsedSeconds);
  const shownSeconds =
    timerView === 'remaining' && remainingSeconds !== null ? remainingSeconds : elapsedSeconds;
  const toggleTimerView = (): void => {
    if (!isUnlimited) {
      setTimerView((view) => (view === 'elapsed' ? 'remaining' : 'elapsed'));
    }
  };

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {goalName}
      </ThemedText>
      <Pressable
        accessibilityRole={isUnlimited ? undefined : 'button'}
        onPress={toggleTimerView}
        style={({ pressed }) => [styles.timerBox, pressed && !isUnlimited && styles.pressed]}>
        <View style={styles.timerIndicator}>
          <ThemedText type="smallBold" themeColor={timerView === 'elapsed' ? 'accent' : 'textSecondary'}>
            •
          </ThemedText>
          {!isUnlimited && (
            <ThemedText type="smallBold" themeColor={timerView === 'remaining' ? 'accent' : 'textSecondary'}>
              ×
            </ThemedText>
          )}
        </View>
        {isUnlimited && (
          <ThemedText type="subtitle" themeColor="accent">
            ∞
          </ThemedText>
        )}
        <ThemedText type="title" style={styles.timer}>
          {formatDuration(shownSeconds)}
        </ThemedText>
        {!isUnlimited && (
          <ThemedText type="small" themeColor="textSecondary">
            {timerView === 'elapsed' ? 'Elapsed' : 'Remaining'}
          </ThemedText>
        )}
      </Pressable>
      {goalSeconds !== null && <ProgressBar progress={progress} />}
      <View style={styles.metrics}>
        <Metric label="Started" value={startedDate.toLocaleString()} />
        {willEndAt !== null && (
          <Metric label="Will end on" value={willEndAt.toLocaleString()} />
        )}
      </View>
      {reason !== null && (
        <ThemedText type="small" themeColor="textSecondary">
          {reason}
        </ThemedText>
      )}
      {goalSeconds !== null && elapsedSeconds >= goalSeconds && (
        <ThemedText type="smallBold" themeColor="accent">
          Goal reached
        </ThemedText>
      )}
      {!isUnlimited && (
        <View style={styles.reminderRow}>
          <View style={styles.reminderText}>
            <ThemedText type="smallBold">Fast reminder</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {fastEndReminderAt === null ? 'Off for this fast' : fastEndReminderAt.toLocaleString()}
            </ThemedText>
          </View>
          <Switch
            value={fastEndReminderEnabled}
            onValueChange={onFastEndReminderEnabledChange}
            trackColor={{ true: theme.accent }}
          />
        </View>
      )}
      <LogoActionButton label="End fast" onPress={onEnd} />
      <GhostButton label="Cancel fast" onPress={onCancel} />
    </ThemedView>
  );
}

function CustomDurationPicker({
  days,
  hours,
  onDaysChange,
  onHoursChange,
}: {
  days: number;
  hours: number;
  onDaysChange: (days: number) => void;
  onHoursChange: (hours: number) => void;
}) {
  return (
    <View style={styles.customDuration}>
      <DurationWheel
        label="Days"
        value={days}
        values={Array.from({ length: maxCustomDurationDays }, (_, index) => index + 1)}
        suffix="d"
        onChange={onDaysChange}
      />
      <DurationWheel
        label="Hours"
        value={hours}
        values={Array.from({ length: 24 }, (_, index) => index + 1)}
        suffix="h"
        onChange={onHoursChange}
      />
    </View>
  );
}

function DurationWheel({
  label,
  value,
  values,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  values: readonly number[];
  suffix: string;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const selectedIndex = Math.max(
    0,
    values.findIndex((option) => option === value),
  );
  const selectValueAtOffset = (offsetY: number): void => {
    const index = Math.min(
      values.length - 1,
      Math.max(0, Math.round(offsetY / durationWheelRowHeight)),
    );
    const nextValue = values[index];

    if (nextValue !== undefined) {
      onChange(nextValue);
    }
  };

  return (
    <View style={styles.durationWheelGroup}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ScrollView
        style={[styles.durationWheel, { borderColor: theme.backgroundSelected }]}
        contentContainerStyle={styles.durationWheelContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={durationWheelRowHeight}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: selectedIndex * durationWheelRowHeight }}
        onMomentumScrollEnd={(event) => selectValueAtOffset(event.nativeEvent.contentOffset.y)}>
        {values.map((option) => {
          const selected = option === value;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.durationWheelItem,
                selected && { backgroundColor: theme.accentBackground },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
                {option}
                {suffix}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function GoalPicker({
  goals,
  selectedGoalId,
  onSelect,
}: {
  goals: readonly FastingGoal[];
  selectedGoalId: string;
  onSelect: (goalId: string) => void;
}) {
  const isCustomSelected = selectedGoalId === customGoalId;
  const isUnlimitedSelected = selectedGoalId === unlimitedGoalId;
  const isPresetSelected = !isCustomSelected && !isUnlimitedSelected;
  const selectedIndex = Math.max(
    0,
    goals.findIndex((goal) => goal.id === selectedGoalId),
  );
  const selectGoalAtOffset = (offsetY: number): void => {
    const index = Math.min(goals.length - 1, Math.max(0, Math.round(offsetY / goalRowHeight)));
    const goal = goals[index];

    if (goal !== undefined) {
      onSelect(goal.id);
    }
  };

  return (
    <>
      {isPresetSelected && (
        <>
          <ScrollView
            style={styles.goalWheel}
            contentContainerStyle={styles.goalWheelContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={goalRowHeight}
            decelerationRate="fast"
            contentOffset={{ x: 0, y: selectedIndex * goalRowHeight }}
            onMomentumScrollEnd={(event) => selectGoalAtOffset(event.nativeEvent.contentOffset.y)}>
            {goals.map((goal) => (
              <GoalButton
                key={goal.id}
                label={goal.name}
                value={formatGoalDuration(goal.targetDurationHours)}
                selected={goal.id === selectedGoalId}
                onPress={() => onSelect(goal.id)}
              />
            ))}
          </ScrollView>
          <GoalButton
            label="Custom"
            value="Choose days and hours"
            selected={false}
            onPress={() => onSelect(customGoalId)}
          />
          <GoalButton
            label="Unlimited"
            value="No planned end time"
            selected={false}
            onPress={() => onSelect(unlimitedGoalId)}
          />
        </>
      )}
      {isCustomSelected && (
        <>
          <GoalButton
            label="Preset fasts"
            value="Choose a saved duration"
            selected={false}
            onPress={() => onSelect(goals[0]?.id ?? customGoalId)}
          />
          <GoalButton
            label="Unlimited"
            value="No planned end time"
            selected={false}
            onPress={() => onSelect(unlimitedGoalId)}
          />
        </>
      )}
      {isUnlimitedSelected && (
        <>
          <GoalButton
            label="Preset fasts"
            value="Choose a saved duration"
            selected={false}
            onPress={() => onSelect(goals[0]?.id ?? customGoalId)}
          />
          <GoalButton
            label="Custom"
            value="Choose days and hours"
            selected={false}
            onPress={() => onSelect(customGoalId)}
          />
        </>
      )}
    </>
  );
}

function GoalButton({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.goalButton,
        { borderColor: selected ? theme.accentBorder : theme.backgroundSelected },
        selected && { backgroundColor: theme.accentBackground },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {value}
      </ThemedText>
    </Pressable>
  );
}

function LogoActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.logoButton,
        { backgroundColor: theme.accent, borderColor: theme.accentBorder },
        pressed && styles.pressed,
      ]}>
      <Image source={logoSource} style={styles.logoImage} />
    </Pressable>
  );
}

function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const theme = useTheme();

  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.progressFill,
          {
            backgroundColor: theme.accent,
            width: `${Math.round(progress * 100)}%`,
          },
        ]}
      />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  customGoal: {
    gap: Spacing.two,
  },
  customDuration: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  durationWheelGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  durationWheel: {
    maxHeight: durationWheelRowHeight * 3,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  durationWheelContent: {
    paddingVertical: durationWheelRowHeight,
  },
  durationWheelItem: {
    height: durationWheelRowHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalButton: {
    height: goalRowHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  goalWheel: {
    maxHeight: goalRowHeight * 3,
  },
  goalWheelContent: {
    gap: Spacing.one,
  },
  reasonInput: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    textAlign: 'center',
  },
  timer: {
    textAlign: 'center',
  },
  timerBox: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  timerIndicator: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metric: {
    flex: 1,
    gap: Spacing.one,
  },
  reminderRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  reminderText: {
    flex: 1,
    gap: Spacing.one,
  },
  logoButton: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  ghostButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
