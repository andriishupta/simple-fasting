import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FeedbackState } from '@/components/feedback-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  endFast,
  formatDuration,
  getElapsedSeconds,
  getGoalSeconds,
  startFast,
  useActiveFastState,
} from '@/storage/fasting-storage';
import { getDefaultGoal, useSettings } from '@/storage/settings-storage';
import { type FastingGoal } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';

const customGoalId = 'custom-duration';
const maxCustomDurationDays = 40;
const maxCustomDurationHours = maxCustomDurationDays * 24;

const parsePositiveInteger = (value: string): number => {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 0;
};

export default function HomeScreen() {
  const settings = useSettings();
  const activeFastState = useActiveFastState();
  const theme = useTheme();
  const defaultGoal = getDefaultGoal(settings);
  const [selectedGoalId, setSelectedGoalId] = useState(defaultGoal.id);
  const [customDays, setCustomDays] = useState('0');
  const [customHours, setCustomHours] = useState('16');
  const [reason, setReason] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [operationError, setOperationError] = useState<string | null>(null);
  const activeSession = activeFastState.session;

  useEffect(() => {
    setSelectedGoalId(defaultGoal.id);
  }, [defaultGoal.id]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  const selectedGoal =
    settings.goals.find((goal) => goal.id === selectedGoalId) ?? defaultGoal;
  const customDurationHours =
    parsePositiveInteger(customDays) * 24 + parsePositiveInteger(customHours);
  const selectedDurationHours =
    selectedGoalId === customGoalId ? customDurationHours : selectedGoal.targetDurationHours;
  const startSelectedFast = async (): Promise<void> => {
    if (selectedDurationHours <= 0) {
      Alert.alert('Choose a duration', 'Set at least 1 hour for a custom fast.');
      return;
    }

    if (selectedGoalId === customGoalId && selectedDurationHours > maxCustomDurationHours) {
      Alert.alert(
        'Duration is too long',
        `Custom fasts can be up to ${maxCustomDurationDays} days.`,
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
      await endFast();
      setOperationError(null);
    } catch {
      setOperationError('The fast could not be ended. Your active fast is still saved locally.');
      Alert.alert('Unable to end fast', 'Please try again.');
    }
  };

  return (
    <ScreenScaffold title="Fast" eyebrow="Current fast">
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

          <GoalButton
            label="Custom"
            selected={selectedGoalId === customGoalId}
            onPress={() => setSelectedGoalId(customGoalId)}
          />

          {selectedGoalId === customGoalId && (
            <ThemedView style={styles.customGoal}>
              <View style={styles.customInputs}>
                <DurationInput
                  label="Days"
                  value={customDays}
                  onChangeText={setCustomDays}
                />
                <DurationInput
                  label="Hours"
                  value={customHours}
                  onChangeText={setCustomHours}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Maximum custom fast: {maxCustomDurationDays} days.
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
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                color: theme.text,
                backgroundColor: theme.background,
              },
            ]}
          />

          <AppButton label="Start Fast" onPress={startSelectedFast} />
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
            currentTime={currentTime}
            goalName={`${activeSession.goalDurationHours} hour goal`}
            onEnd={endActiveFast}
            startedAt={activeSession.startedAt}
            reason={activeSession.reason}
            elapsedSeconds={getElapsedSeconds(activeSession, currentTime)}
            goalSeconds={getGoalSeconds(activeSession)}
          />
        </>
      )}
    </ScreenScaffold>
  );
}

function ActiveFastPanel({
  currentTime,
  goalName,
  startedAt,
  reason,
  elapsedSeconds,
  goalSeconds,
  onEnd,
}: {
  currentTime: number;
  goalName: string;
  startedAt: string;
  reason: string | null;
  elapsedSeconds: number;
  goalSeconds: number;
  onEnd: () => void;
}) {
  const progress = Math.min(1, elapsedSeconds / goalSeconds);
  const remainingSeconds = Math.max(0, goalSeconds - elapsedSeconds);

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {goalName}
      </ThemedText>
      <ThemedText type="title" style={styles.timer}>
        {formatDuration(elapsedSeconds)}
      </ThemedText>
      <ProgressBar progress={progress} />
      <View style={styles.metrics}>
        <Metric label="Started" value={new Date(startedAt).toLocaleTimeString()} />
        <Metric label="Remaining" value={formatDuration(remainingSeconds)} />
      </View>
      {reason !== null && (
        <ThemedText type="small" themeColor="textSecondary">
          {reason}
        </ThemedText>
      )}
      {elapsedSeconds >= goalSeconds && (
        <ThemedText type="smallBold" themeColor="accent">
          Goal reached
        </ThemedText>
      )}
      <AppButton label="End Fast" onPress={onEnd} />
      <ThemedText type="small" themeColor="textSecondary">
        Updated {new Date(currentTime).toLocaleTimeString()}
      </ThemedText>
    </ThemedView>
  );
}

function DurationInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();
  const updateValue = (nextValue: string): void => {
    onChangeText(nextValue.replaceAll(/\D/g, ''));
  };

  return (
    <ThemedView style={styles.durationInputGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={updateValue}
        keyboardType="number-pad"
        maxLength={label === 'Days' ? 2 : 3}
        style={[
          styles.input,
          styles.durationInput,
          {
            borderColor: theme.backgroundSelected,
            color: theme.text,
            backgroundColor: theme.background,
          },
        ]}
      />
    </ThemedView>
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
  return (
    <View style={styles.goalRow}>
      {goals.map((goal) => (
        <GoalButton
          key={goal.id}
          label={goal.name}
          selected={goal.id === selectedGoalId}
          onPress={() => onSelect(goal.id)}
        />
      ))}
    </View>
  );
}

function GoalButton({
  label,
  selected,
  onPress,
}: {
  label: string;
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
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  customGoal: {
    gap: Spacing.two,
  },
  customInputs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  durationInputGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  durationInput: {
    textAlign: 'center',
  },
  goalButton: {
    minHeight: 40,
    minWidth: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  input: {
    minHeight: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  timer: {
    textAlign: 'center',
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
  pressed: {
    opacity: 0.72,
  },
});
