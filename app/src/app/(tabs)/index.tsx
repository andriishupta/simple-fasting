import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Svg, { Circle } from 'react-native-svg';

import { FeedbackState } from '@/components/feedback-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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

const customGoalId = 'custom-duration';
const unlimitedGoalId = 'unlimited-duration';
const maxCustomDurationHours = 7 * 24;

const getInitialGoalId = (
  goals: readonly { id: string; targetDurationHours: number }[],
  lastUsedGoalDurationHours: number,
): string =>
  lastUsedGoalDurationHours === 0
    ? unlimitedGoalId
    : goals.find((goal) => goal.targetDurationHours === lastUsedGoalDurationHours)?.id ??
      customGoalId;

const formatGoalDuration = (hours: number): string => {
  if (hours === 0) return 'Unlimited';
  if (hours < 24) return `${hours} hours`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
};

const formatDateTime = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);

export default function HomeScreen() {
  const settings = useSettings();
  const activeFastState = useActiveFastState();
  const defaultGoal = getDefaultGoal(settings);
  const [selectedGoalId, setSelectedGoalId] = useState(() =>
    getInitialGoalId(settings.goals, settings.lastUsedGoalDurationHours),
  );
  const [customDurationHours, setCustomDurationHours] = useState(() =>
    Math.max(1, settings.lastUsedGoalDurationHours || 24),
  );
  const [reason, setReason] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [operationError, setOperationError] = useState<string | null>(null);
  const activeSession = activeFastState.session;
  const effectiveSelectedGoalId =
    selectedGoalId === customGoalId ||
    selectedGoalId === unlimitedGoalId ||
    settings.goals.some((goal) => goal.id === selectedGoalId)
      ? selectedGoalId
      : getInitialGoalId(settings.goals, settings.lastUsedGoalDurationHours);

  useEffect(() => {
    if (activeSession === null) return;

    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const selectedGoal =
    settings.goals.find((goal) => goal.id === effectiveSelectedGoalId) ?? defaultGoal;
  const selectedDurationHours =
    effectiveSelectedGoalId === unlimitedGoalId
      ? 0
      : effectiveSelectedGoalId === customGoalId
        ? customDurationHours
        : selectedGoal.targetDurationHours;

  const startSelectedFast = async (): Promise<void> => {
    try {
      await startFast({
        goalDurationHours: selectedDurationHours,
        reason: reason.trim() || null,
      });
      setReason('');
      setCurrentTime(Date.now());
      setOperationError(null);
    } catch {
      setOperationError('The fast could not be started. Your local data was not changed.');
    }
  };

  const endActiveFast = async (): Promise<void> => {
    try {
      const completedSession = await endFast();
      setOperationError(null);
      if (completedSession !== null) router.push(`/history/${completedSession.id}?edit=1`);
    } catch {
      setOperationError('The fast could not be ended. Your active fast is still saved locally.');
    }
  };

  const cancelActiveFast = (): void => {
    Alert.alert('Cancel fast?', 'This stops the active fast without saving it to history.', [
      { text: 'Keep Fasting', style: 'cancel' },
      {
        text: 'Cancel Fast',
        style: 'destructive',
        onPress: () => {
          void cancelFast().catch(() =>
            setOperationError('The fast could not be cancelled. Your active fast is still saved.'),
          );
        },
      },
    ]);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Header />

        {operationError !== null ? (
          <FeedbackState
            kind="error"
            title="Fast action failed"
            description={operationError}
            action={{ label: 'Dismiss', onPress: () => setOperationError(null) }}
          />
        ) : null}

        {activeSession === null ? (
          <ReadyToFast
            goals={settings.goals}
            selectedGoalId={effectiveSelectedGoalId}
            onSelectGoal={setSelectedGoalId}
            customDurationHours={customDurationHours}
            onCustomDurationChange={setCustomDurationHours}
            reason={reason}
            onReasonChange={setReason}
            onStart={() => void startSelectedFast()}
          />
        ) : (
          <ActiveFast
            goalDurationHours={activeSession.goalDurationHours}
            startedAt={activeSession.startedAt}
            reason={activeSession.reason}
            elapsedSeconds={getElapsedSeconds(activeSession, currentTime)}
            goalSeconds={activeSession.goalDurationHours > 0 ? getGoalSeconds(activeSession) : null}
            reminderEnabled={activeFastState.fastEndReminderEnabled}
            onReminderChange={(enabled) => {
              void setActiveFastEndReminderEnabled(enabled).catch(() =>
                setOperationError('The fast reminder could not be updated.'),
              );
            }}
            onEnd={() => void endActiveFast()}
            onCancel={cancelActiveFast}
          />
        )}
      </View>
    </ScrollView>
  );
}

function Header() {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <ThemedText type="subtitle" accessibilityRole="header">
        Fast
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={12}
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
        <SymbolView name="gear" size={24} tintColor={theme.text} />
      </Pressable>
    </View>
  );
}

function ReadyToFast({
  goals,
  selectedGoalId,
  onSelectGoal,
  customDurationHours,
  onCustomDurationChange,
  reason,
  onReasonChange,
  onStart,
}: {
  goals: readonly { id: string; name: string; targetDurationHours: number }[];
  selectedGoalId: string;
  onSelectGoal: (goalId: string) => void;
  customDurationHours: number;
  onCustomDurationChange: (hours: number) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  onStart: () => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.ready}>
      <View style={styles.intro}>
        <ThemedText type="subtitle" style={styles.centeredTitle}>
          How long would you like to fast?
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          You can change this anytime.
        </ThemedText>
      </View>

      <View style={styles.goalGrid}>
        {goals.map((goal) => (
          <GoalButton
            key={goal.id}
            label={`${goal.targetDurationHours}h`}
            selected={goal.id === selectedGoalId}
            onPress={() => onSelectGoal(goal.id)}
          />
        ))}
      </View>
      <View style={styles.goalGrid}>
        <GoalButton
          label="Custom"
          icon="slider.horizontal.3"
          wide
          selected={selectedGoalId === customGoalId}
          onPress={() => onSelectGoal(customGoalId)}
        />
        <GoalButton
          label="Unlimited"
          icon="infinity"
          wide
          selected={selectedGoalId === unlimitedGoalId}
          onPress={() => onSelectGoal(unlimitedGoalId)}
        />
      </View>

      {selectedGoalId === customGoalId ? (
        <DurationStepper
          value={customDurationHours}
          onChange={onCustomDurationChange}
        />
      ) : null}

      <View style={styles.fieldGroup}>
        <ThemedText type="small">Why are you fasting? (optional)</ThemedText>
        <TextInput
          accessibilityLabel="Reason for fasting"
          value={reason}
          onChangeText={onReasonChange}
          placeholder="Add a reason…"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.backgroundSelected },
          ]}
        />
      </View>

      <ActionButton label="Start fast" onPress={onStart} />
    </ThemedView>
  );
}

function GoalButton({
  label,
  icon,
  wide = false,
  selected,
  onPress,
}: {
  label: string;
  icon?: 'slider.horizontal.3' | 'infinity';
  wide?: boolean;
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
        styles.goal,
        wide ? styles.goalWide : styles.goalPreset,
        { borderColor: selected ? theme.accent : theme.backgroundSelected },
        selected && { backgroundColor: theme.accent },
        pressed && styles.pressed,
      ]}>
      {icon !== undefined ? (
        <SymbolView
          name={icon}
          size={20}
          tintColor={selected ? theme.accentForeground : theme.textSecondary}
        />
      ) : null}
      <ThemedText
        type="default"
        style={selected ? { color: theme.accentForeground } : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function DurationStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <StepperButton label="−" onPress={() => onChange(Math.max(1, value - 1))} />
      <View style={styles.stepperValue}>
        <ThemedText type="subtitle" selectable>
          {value}h
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Custom duration
        </ThemedText>
      </View>
      <StepperButton
        label="+"
        onPress={() => onChange(Math.min(maxCustomDurationHours, value + 1))}
      />
    </View>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Add one hour' : 'Remove one hour'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepperButton,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="subtitle">{label}</ThemedText>
    </Pressable>
  );
}

function ActiveFast({
  goalDurationHours,
  startedAt,
  reason,
  elapsedSeconds,
  goalSeconds,
  reminderEnabled,
  onReminderChange,
  onEnd,
  onCancel,
}: {
  goalDurationHours: number;
  startedAt: string;
  reason: string | null;
  elapsedSeconds: number;
  goalSeconds: number | null;
  reminderEnabled: boolean;
  onReminderChange: (enabled: boolean) => void;
  onEnd: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [timerView, setTimerView] = useState<'elapsed' | 'remaining'>('elapsed');
  const ringSize = Math.min(292, width - Spacing.four * 2);
  const progress = goalSeconds === null ? 1 : Math.min(1, elapsedSeconds / goalSeconds);
  const remainingSeconds = goalSeconds === null ? null : Math.max(0, goalSeconds - elapsedSeconds);
  const shownSeconds =
    timerView === 'remaining' && remainingSeconds !== null ? remainingSeconds : elapsedSeconds;
  const startedDate = new Date(startedAt);
  const endDate = goalSeconds === null ? null : new Date(startedDate.getTime() + goalSeconds * 1000);

  return (
    <ThemedView style={styles.active}>
      <ProgressRing
        size={ringSize}
        progress={progress}
        color={theme.accent}
        trackColor={theme.backgroundSelected}>
        <Pressable
          accessibilityRole={goalSeconds === null ? undefined : 'button'}
          accessibilityLabel="Toggle elapsed and remaining time"
          onPress={() => {
            if (goalSeconds !== null) {
              setTimerView((current) => (current === 'elapsed' ? 'remaining' : 'elapsed'));
            }
          }}
          style={({ pressed }) => [styles.timerContent, pressed && styles.pressed]}>
          <ThemedText themeColor="textSecondary">
            {timerView === 'elapsed' ? 'Elapsed' : 'Remaining'}
          </ThemedText>
          <ThemedText type="title" selectable style={styles.timer}>
            {formatDuration(shownSeconds)}
          </ThemedText>
          <ThemedText themeColor="textSecondary" selectable>
            {formatGoalDuration(goalDurationHours)}
          </ThemedText>
        </Pressable>
      </ProgressRing>

      <View style={styles.metrics}>
        <Metric label="Started" value={formatDateTime(startedDate)} />
        <View style={[styles.metricDivider, { backgroundColor: theme.backgroundSelected }]} />
        <Metric label="Ends" value={endDate === null ? 'No planned end' : formatDateTime(endDate)} />
      </View>

      {reason !== null ? (
        <ThemedText themeColor="textSecondary" style={styles.centeredText} selectable>
          {reason}
        </ThemedText>
      ) : null}

      {goalSeconds !== null ? (
        <View style={styles.reminderRow}>
          <View style={styles.reminderText}>
            <ThemedText>Fast reminder</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Get a reminder when your fast is about to end.
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="Fast reminder"
            value={reminderEnabled}
            onValueChange={onReminderChange}
            trackColor={{ true: theme.accent }}
          />
        </View>
      ) : null}

      <ActionButton label="End fast" variant="danger" onPress={onEnd} />
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
        <ThemedText style={{ color: theme.accent }}>Cancel fast</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function ProgressRing({
  size,
  progress,
  color,
  trackColor,
  children,
}: {
  size: number;
  progress: number;
  color: string;
  trackColor: string;
  children: React.ReactNode;
}) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold" selectable style={styles.centeredText}>
        {value}
      </ThemedText>
    </View>
  );
}

function ActionButton({
  label,
  variant = 'primary',
  onPress,
}: {
  label: string;
  variant?: 'primary' | 'danger';
  onPress: () => void;
}) {
  const theme = useTheme();
  const backgroundColor = variant === 'danger' ? theme.danger : theme.accent;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, { backgroundColor }, pressed && styles.pressed]}>
      <ThemedText type="default" style={{ color: '#FFFFFF', fontWeight: '700' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: Spacing.four },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 560),
    flex: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ready: { flex: 1, gap: Spacing.four, paddingTop: Spacing.four },
  intro: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four },
  centeredTitle: { textAlign: 'center', fontSize: 28, lineHeight: 34 },
  centeredText: { textAlign: 'center' },
  goalGrid: { flexDirection: 'row', gap: Spacing.two },
  goal: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
  goalPreset: { flex: 1 },
  goalWide: { flex: 1 },
  fieldGroup: { gap: Spacing.two },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepperButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  stepperValue: { flex: 1, alignItems: 'center' },
  actionButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  active: { alignItems: 'center', gap: Spacing.four, paddingTop: Spacing.two },
  timerContent: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  timer: { fontVariant: ['tabular-nums'], fontSize: 42, lineHeight: 50 },
  metrics: { width: '100%', flexDirection: 'row', alignItems: 'stretch' },
  metric: { flex: 1, alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two },
  metricDivider: { width: 1 },
  reminderRow: { width: '100%', minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  reminderText: { flex: 1, gap: Spacing.one },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.68 },
});
