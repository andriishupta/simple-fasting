import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@expo/ui/community/picker';
import { router } from 'expo-router';
import {
  Check,
  ChevronRight,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  SquarePen,
  type LucideIcon,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { FeedbackState } from '@/components/feedback-state';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
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
import {
  setLastUsedGoalDurationHours,
  useSettings,
} from '@/storage/settings-storage';

const customGoalId = 'custom-duration';
const unlimitedGoalId = 'unlimited-duration';
const maxCustomDurationHours = 7 * 24;
const durationDays = Array.from({ length: 8 }, (_, day) => day);
const durationHours = Array.from({ length: 24 }, (_, hour) => hour);
const durationHoursWithoutZero = durationHours.slice(1);
const bottomActionInset = process.env.EXPO_OS === 'ios' ? 152 : 96;

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
  const { height } = useWindowDimensions();
  const settings = useSettings();
  const activeFastState = useActiveFastState();
  const enabledGoals = settings.goals.filter((goal) => goal.isEnabled);
  const storedGoal =
    enabledGoals.find(
      (goal) => goal.targetDurationHours === settings.lastUsedGoalDurationHours,
    ) ??
    enabledGoals.find((goal) => goal.id === 'goal-16-hours') ??
    enabledGoals[0] ??
    settings.goals[0];
  const [selectedGoalId, setSelectedGoalId] = useState(() =>
    getInitialGoalId(
      settings.goals.filter((goal) => goal.isEnabled),
      settings.lastUsedGoalDurationHours,
    ),
  );
  const [customDurationHours, setCustomDurationHours] = useState(() =>
    Math.max(1, settings.lastUsedGoalDurationHours || 24),
  );
  const [reason, setReason] = useState('');
  const [noteVisible, setNoteVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [operationError, setOperationError] = useState<string | null>(null);
  const activeSession = activeFastState.session;
  const shouldScroll =
    height < 700 || activeSession !== null || operationError !== null || noteVisible;
  const effectiveSelectedGoalId =
    selectedGoalId === customGoalId ||
    selectedGoalId === unlimitedGoalId ||
    enabledGoals.some((goal) => goal.id === selectedGoalId)
      ? selectedGoalId
      : getInitialGoalId(enabledGoals, settings.lastUsedGoalDurationHours);

  useEffect(() => {
    if (activeSession === null) return;

    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const selectedGoal =
    enabledGoals.find((goal) => goal.id === effectiveSelectedGoalId) ?? storedGoal;
  const selectedDurationHours =
    effectiveSelectedGoalId === unlimitedGoalId
      ? 0
      : effectiveSelectedGoalId === customGoalId
        ? customDurationHours
        : selectedGoal.targetDurationHours;
  const selectGoal = (goalId: string): void => {
    const durationHours =
      goalId === unlimitedGoalId
        ? 0
        : goalId === customGoalId
          ? customDurationHours
          : (enabledGoals.find((goal) => goal.id === goalId)?.targetDurationHours ?? 16);

    setSelectedGoalId(goalId);
    setLastUsedGoalDurationHours(durationHours);
  };
  const updateCustomDuration = (hours: number): void => {
    setCustomDurationHours(hours);
    setLastUsedGoalDurationHours(hours);
  };

  const startSelectedFast = async (): Promise<void> => {
    try {
      await startFast({
        goalDurationHours: selectedDurationHours,
        reason: reason.trim() || null,
      });
      setReason('');
      setNoteVisible(false);
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
      style={styles.scroll}
      scrollEnabled={shouldScroll}
      bounces={shouldScroll}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle" accessibilityRole="header">
            Simple Fasting
          </ThemedText>
        </View>
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
            goals={enabledGoals}
            selectedGoalId={effectiveSelectedGoalId}
            onSelectGoal={selectGoal}
            customDurationHours={customDurationHours}
            onCustomDurationChange={updateCustomDuration}
            reason={reason}
            onReasonChange={setReason}
            noteVisible={noteVisible}
            onNoteVisibilityChange={setNoteVisible}
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

function ReadyToFast({
  goals,
  selectedGoalId,
  onSelectGoal,
  customDurationHours,
  onCustomDurationChange,
  reason,
  onReasonChange,
  noteVisible,
  onNoteVisibilityChange,
  onStart,
}: {
  goals: readonly { id: string; name: string; targetDurationHours: number }[];
  selectedGoalId: string;
  onSelectGoal: (goalId: string) => void;
  customDurationHours: number;
  onCustomDurationChange: (hours: number) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  noteVisible: boolean;
  onNoteVisibilityChange: (visible: boolean) => void;
  onStart: () => void;
}) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const [durationPickerVisible, setDurationPickerVisible] = useState(false);
  const [draftDurationHours, setDraftDurationHours] = useState(customDurationHours);
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
  const selectedDuration =
    selectedGoalId === unlimitedGoalId
      ? 0
      : selectedGoalId === customGoalId
        ? customDurationHours
        : (selectedGoal?.targetDurationHours ?? customDurationHours);
  const selectedGoalName =
    selectedGoalId === unlimitedGoalId
      ? 'Open-ended Fast'
      : selectedGoalId === customGoalId
        ? 'Custom Duration'
        : (selectedGoal?.name ?? 'Fasting Goal');

  const openDurationPicker = (): void => {
    setDraftDurationHours(customDurationHours);
    setDurationPickerVisible(true);
  };

  return (
    <View style={styles.ready}>
      <View style={styles.hero}>
        <ThemedText type="small" themeColor="textSecondary">
          YOUR FASTING GOAL
        </ThemedText>
        <ThemedText
          selectable
          style={[styles.goalHero, selectedGoalId === customGoalId && styles.customGoalHero]}>
          {selectedGoalName}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.goalDurationLabel}>
          {selectedDuration === 0 ? 'No time limit' : formatGoalDuration(selectedDuration)}
        </ThemedText>
      </View>

      <View style={styles.presetRow}>
        {goals.map((goal) => (
          <GoalButton
            key={goal.id}
            label={goal.name}
            selected={goal.id === selectedGoalId}
            onPress={() => onSelectGoal(goal.id)}
          />
        ))}
      </View>

      <View
        style={[
          styles.options,
          { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
        ]}>
        <CustomDurationRow
          icon={SlidersHorizontal}
          value={formatGoalDuration(customDurationHours)}
          selected={selectedGoalId === customGoalId}
          onSelect={() => onSelectGoal(customGoalId)}
          onEdit={openDurationPicker}
        />
        <View style={[styles.optionDivider, { backgroundColor: theme.backgroundSelected }]} />
        <OptionRow
          icon={InfinityIcon}
          label="Open-ended fast"
          selected={selectedGoalId === unlimitedGoalId}
          showsChevron={false}
          onPress={() => onSelectGoal(unlimitedGoalId)}
        />
        <View style={[styles.optionDivider, { backgroundColor: theme.backgroundSelected }]} />
        <FastNoteToggle
          icon={SquarePen}
          value={noteVisible}
          onValueChange={(visible) => {
            onNoteVisibilityChange(visible);
            if (!visible) onReasonChange('');
          }}
        />
      </View>

      {noteVisible ? (
        <TextInput
          accessibilityLabel="Reason for fasting"
          value={reason}
          onChangeText={onReasonChange}
          placeholder="Why are you fasting?"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          autoFocus={reason.length === 0}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
        />
      ) : null}

      <View style={[styles.readyFooter, height >= 700 && styles.readyFooterAnchored]}>
        <ActionButton label="Start fast" onPress={onStart} />
      </View>

      <DurationPickerSheet
        visible={durationPickerVisible}
        value={draftDurationHours}
        onChange={setDraftDurationHours}
        onCancel={() => setDurationPickerVisible(false)}
        onDone={() => {
          onSelectGoal(customGoalId);
          onCustomDurationChange(draftDurationHours);
          setDurationPickerVisible(false);
        }}
      />
    </View>
  );
}

function CustomDurationRow({
  icon,
  value,
  selected,
  onSelect,
  onEdit,
}: {
  icon: LucideIcon;
  value: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const Icon = icon;

  return (
    <View style={styles.optionRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select custom duration"
        accessibilityState={{ selected }}
        onPress={onSelect}
        style={({ pressed }) => [styles.optionPrimary, pressed && styles.pressed]}>
        <View style={[styles.optionIcon, { backgroundColor: theme.accentBackground }]}>
          <Icon size={18} color={theme.accent} strokeWidth={2} />
        </View>
        <ThemedText style={styles.optionLabel}>Custom duration</ThemedText>
        {selected ? <Check size={16} color={theme.accent} strokeWidth={2.5} /> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit custom duration, currently ${value}`}
        onPress={onEdit}
        hitSlop={8}
        style={({ pressed }) => [styles.optionEdit, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          {value}
        </ThemedText>
        <ChevronRight size={16} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

function FastNoteToggle({
  icon,
  value,
  onValueChange,
}: {
  icon: LucideIcon;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  const Icon = icon;

  return (
    <View style={styles.optionRow}>
      <View style={[styles.optionIcon, { backgroundColor: theme.accentBackground }]}>
        <Icon size={18} color={theme.accent} strokeWidth={2} />
      </View>
      <View style={styles.optionLabel}>
        <ThemedText>Note</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Optional
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel="Note"
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.accent }}
      />
    </View>
  );
}

function OptionRow({
  icon,
  label,
  value,
  selected = false,
  showsChevron = true,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  selected?: boolean;
  showsChevron?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const Icon = icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
      <View style={[styles.optionIcon, { backgroundColor: theme.accentBackground }]}>
        <Icon size={18} color={theme.accent} strokeWidth={2} />
      </View>
      <ThemedText style={styles.optionLabel}>{label}</ThemedText>
      {value !== undefined ? (
        <ThemedText type="small" themeColor="textSecondary">
          {value}
        </ThemedText>
      ) : null}
      {selected ? <Check size={16} color={theme.accent} strokeWidth={2.5} /> : null}
      {showsChevron ? <ChevronRight size={16} color={theme.textSecondary} /> : null}
    </Pressable>
  );
}

function DurationPickerSheet({
  visible,
  value,
  onChange,
  onCancel,
  onDone,
}: {
  visible: boolean;
  value: number;
  onChange: (value: number) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const days = Math.floor(value / 24);
  const hours = value % 24;
  const hourValues =
    days >= 7 ? [0] : days === 0 ? durationHoursWithoutZero : durationHours;

  return (
    <Modal
      animationType="slide"
      presentationStyle="formSheet"
      visible={visible}
      onRequestClose={onCancel}>
      <SafeAreaView style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: theme.backgroundSelected }]}>
          <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={12}>
            <ThemedText style={{ color: theme.accent }}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="smallBold">Custom duration</ThemedText>
          <Pressable accessibilityRole="button" onPress={onDone} hitSlop={12}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              Done
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.pickers}>
          <View style={[styles.pickerColumn, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.pickerLabel}>
              DAYS
            </ThemedText>
            <Picker
              selectedValue={String(days)}
              onValueChange={(nextDays) => {
                const parsedDays = Number(nextDays);
                const nextHours = parsedDays === 7 ? 0 : parsedDays === 0 && hours === 0 ? 1 : hours;
                onChange(Math.min(maxCustomDurationHours, parsedDays * 24 + nextHours));
              }}
              style={styles.picker}>
              {durationDays.map((day) => (
                <Picker.Item key={day} label={String(day)} value={String(day)} />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerColumn, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.pickerLabel}>
              HOURS
            </ThemedText>
            <Picker
              selectedValue={String(hours)}
              onValueChange={(nextHours) =>
                onChange(Math.min(maxCustomDurationHours, days * 24 + Number(nextHours)))
              }
              style={styles.picker}>
              {hourValues.map((hour) => (
                <Picker.Item key={hour} label={String(hour)} value={String(hour)} />
              ))}
            </Picker>
          </View>
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.centeredText}>
          Not medical advice.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
          Maximum duration is 7 days.
        </ThemedText>
      </SafeAreaView>
    </Modal>
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
        styles.goal,
        {
          backgroundColor: selected ? theme.accent : theme.background,
          borderColor: selected ? theme.accent : theme.backgroundSelected,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type="default"
        style={selected ? { color: theme.accentForeground } : undefined}>
        {label}
      </ThemedText>
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
    <View style={styles.active}>
      <View style={[styles.statusPill, { backgroundColor: theme.accentBackground }]}>
        <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          Fasting
        </ThemedText>
      </View>
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

      <View
        style={[
          styles.metrics,
          { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
        ]}>
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
        <View
          style={[
            styles.reminderRow,
            { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
          ]}>
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
    </View>
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
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 560),
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  header: { alignItems: 'flex-start' },
  ready: { flex: 1, gap: Spacing.three },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  goalHero: {
    textAlign: 'center',
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
  },
  customGoalHero: { fontSize: 34, lineHeight: 40 },
  goalDurationLabel: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  centeredText: { textAlign: 'center' },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  goal: {
    minWidth: 56,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
  options: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
  },
  optionRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  optionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderCurve: 'continuous',
  },
  optionLabel: { flex: 1 },
  optionPrimary: {
    minHeight: 60,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  optionEdit: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  optionDivider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  readyFooter: { minHeight: 56, justifyContent: 'flex-end' },
  readyFooterAnchored: {
    position: 'absolute',
    right: 0,
    bottom: bottomActionInset,
    left: 0,
  },
  actionButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderCurve: 'continuous',
  },
  sheet: { flex: 1 },
  sheetHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  pickers: {
    minHeight: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    margin: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  pickerColumn: {
    width: '44%',
    alignItems: 'center',
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  pickerLabel: { textAlign: 'center' },
  picker: { width: '100%', minHeight: 180 },
  active: { alignItems: 'center', gap: Spacing.four, paddingTop: Spacing.three },
  statusPill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  timerContent: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  timer: { fontVariant: ['tabular-nums'], fontSize: 42, lineHeight: 50 },
  metrics: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: Spacing.three,
  },
  metric: { flex: 1, alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two },
  metricDivider: { width: 1 },
  reminderRow: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  reminderText: { flex: 1, gap: Spacing.one },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.68 },
});
