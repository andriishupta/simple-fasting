import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInUp, FadingTransition } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { AppButton } from '@/components/app-button';
import { FeedbackState } from '@/components/feedback-state';
import { useFastSavedNotice } from '@/components/fast-saved-notice-context';
import { ScreenHeading } from '@/components/screen-heading';
import { TabScreenShell } from '@/components/tab-screen-shell';
import {
  customGoalId,
  FastGoalSelector,
  FastNoteEditor,
  formatGoalDuration,
  getGoalSelectionId,
  unlimitedGoalId,
} from '@/components/fast-setup-controls';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  cancelFast,
  endFast,
  formatDuration,
  getElapsedSeconds,
  getGoalSeconds,
  setActiveFastEndReminderEnabled,
  setActiveFastTimerView,
  startFast,
  useActiveFastState,
} from '@/storage/fasting-storage';
import { TimerViewPreference, type GoalDurationFormat } from '@/storage/app-storage';
import {
  setLastUsedGoalDurationHours,
  useSettings,
} from '@/storage/settings-storage';

const getInitialGoalId = (
  goals: readonly { id: string; targetDurationHours: number }[],
  lastUsedGoalDurationHours: number,
): string =>
  getGoalSelectionId(goals, lastUsedGoalDurationHours);

const formatDateTime = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);

export default function HomeScreen() {
  const { height } = useWindowDimensions();
  const settings = useSettings();
  const activeFastState = useActiveFastState();
  const {
    notice: savedFastNotice,
    remainingSeconds: savedNoticeSeconds,
    dismiss: dismissSavedFastNotice,
  } = useFastSavedNotice();
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
  const [customDurationExpanded, setCustomDurationExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [operationError, setOperationError] = useState<string | null>(null);
  const activeSession = activeFastState.session;
  const shouldScroll =
    height < (activeSession === null ? 700 : 760) ||
    operationError !== null ||
    noteVisible ||
    customDurationExpanded;
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
    if (goalId !== customGoalId) setCustomDurationExpanded(false);
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
      dismissSavedFastNotice();
    } catch {
      setOperationError('The fast could not be started. Your local data was not changed.');
    }
  };

  const endActiveFast = async (): Promise<void> => {
    try {
      const completedSession = await endFast();
      setOperationError(null);
      if (completedSession !== null) setCurrentTime(Date.now());
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
    <TabScreenShell
      scrollEnabled={shouldScroll}
      keyboardShouldPersistTaps="handled"
      maxWidth={Math.min(MaxContentWidth, 560)}>
        <ScreenHeading align="center">Simple Fasting</ScreenHeading>
        {operationError !== null ? (
          <FeedbackState
            kind="error"
            title="Fast action failed"
            description={operationError}
            action={{ label: 'Dismiss', onPress: () => setOperationError(null) }}
          />
        ) : null}
        <Animated.View layout={FadingTransition.duration(180)} style={styles.stateContent}>
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
              customDurationExpanded={customDurationExpanded}
              onCustomDurationExpandedChange={setCustomDurationExpanded}
              savedSessionId={savedFastNotice?.sessionId ?? null}
              savedNoticeSeconds={savedNoticeSeconds}
              onStart={() => void startSelectedFast()}
            />
          ) : (
            <ActiveFast
              goalDurationHours={activeSession.goalDurationHours}
              goalName={
                settings.goals.find(
                  (goal) => goal.targetDurationHours === activeSession.goalDurationHours,
                )?.name ?? (activeSession.goalDurationHours > 0 ? 'This Time' : 'Open-ended fast')
              }
              goalDurationFormat={settings.goalDurationFormat}
              startedAt={activeSession.startedAt}
              reason={activeSession.reason}
              elapsedSeconds={getElapsedSeconds(activeSession, currentTime)}
              goalSeconds={
                activeSession.goalDurationHours > 0 ? getGoalSeconds(activeSession) : null
              }
              reminderEnabled={activeFastState.fastEndReminderEnabled}
              timerView={activeFastState.timerViewPreference}
              onTimerViewChange={setActiveFastTimerView}
              onReminderChange={(enabled) => {
                void setActiveFastEndReminderEnabled(enabled).catch(() =>
                  setOperationError('The fast reminder could not be updated.'),
                );
              }}
              onEnd={() => {
                void endActiveFast();
              }}
              onCancel={cancelActiveFast}
            />
          )}
        </Animated.View>
    </TabScreenShell>
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
  customDurationExpanded,
  onCustomDurationExpandedChange,
  savedSessionId,
  savedNoticeSeconds,
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
  customDurationExpanded: boolean;
  onCustomDurationExpandedChange: (expanded: boolean) => void;
  savedSessionId: string | null;
  savedNoticeSeconds: number;
  onStart: () => void;
}) {
  const theme = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.ready}>
      <FastGoalSelector
        goals={goals}
        selectedGoalId={selectedGoalId}
        customDurationHours={customDurationHours}
        customDurationExpanded={customDurationExpanded}
        onSelectGoal={onSelectGoal}
        onCustomDurationChange={onCustomDurationChange}
        onCustomDurationExpandedChange={onCustomDurationExpandedChange}
      />
      <FastNoteEditor
        enabled={noteVisible}
        value={reason}
        onEnabledChange={(visible) => {
          onNoteVisibilityChange(visible);
          if (!visible) onReasonChange('');
        }}
        onChangeText={onReasonChange}
      />

      <View style={styles.readyFooter}>
        <AppButton label="Start fast" onPress={onStart} style={styles.primaryAction} />
      </View>
      {savedSessionId !== null ? (
        <Animated.View entering={FadeInUp.duration(200)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Fast saved. View fast. Closing in ${savedNoticeSeconds} seconds.`}
            onPress={() => router.push(`/history/${savedSessionId}`)}
            style={({ pressed }) => [
              styles.savedNotice,
              {
                backgroundColor: theme.accentBackground,
                borderColor: theme.accentBorder,
              },
              pressed && styles.pressed,
            ]}>
            <CheckCircle2 size={21} color={theme.accent} />
            <View style={styles.savedNoticeText}>
              <ThemedText type="smallBold">Fast saved</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                View fast · closes in {savedNoticeSeconds}s
              </ThemedText>
            </View>
            <ChevronRight size={18} color={theme.accent} />
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function ActiveFast({
  goalDurationHours,
  goalName,
  goalDurationFormat,
  startedAt,
  reason,
  elapsedSeconds,
  goalSeconds,
  reminderEnabled,
  timerView,
  onTimerViewChange,
  onReminderChange,
  onEnd,
  onCancel,
}: {
  goalDurationHours: number;
  goalName: string;
  goalDurationFormat: GoalDurationFormat;
  startedAt: string;
  reason: string | null;
  elapsedSeconds: number;
  goalSeconds: number | null;
  reminderEnabled: boolean;
  timerView: TimerViewPreference;
  onTimerViewChange: (timerView: TimerViewPreference) => void;
  onReminderChange: (enabled: boolean) => void;
  onEnd: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const ringSize = Math.min(244, width - Spacing.four * 2);
  const progress = goalSeconds === null ? 1 : Math.min(1, elapsedSeconds / goalSeconds);
  const remainingSeconds = goalSeconds === null ? null : Math.max(0, goalSeconds - elapsedSeconds);
  const shownSeconds =
    timerView === TimerViewPreference.Remaining && remainingSeconds !== null
      ? remainingSeconds
      : elapsedSeconds;
  const startedDate = new Date(startedAt);
  const endDate = goalSeconds === null ? null : new Date(startedDate.getTime() + goalSeconds * 1000);
  const goalTitle = goalDurationHours > 0 ? goalName : 'Open-ended fast';
  const goalSubtitle =
    goalDurationHours > 0 ? formatGoalDuration(goalDurationHours, goalDurationFormat) : 'No time limit';

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.active}>
      <View style={styles.activeHeading}>
        <ThemedText
          selectable
          style={styles.activeGoalName}>
          {goalTitle}
        </ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary" selectable style={styles.activeGoalDuration}>
          {goalSubtitle}
        </ThemedText>
      </View>
      <ProgressRing
        size={ringSize}
        progress={progress}
        color={theme.accent}
        trackColor={theme.backgroundSelected}>
        <View style={styles.timerContent}>
          <View style={styles.timerLabelRow}>
            <ThemedText themeColor="textSecondary">
            {timerView === TimerViewPreference.Elapsed ? 'Elapsed' : 'Remaining'}
            </ThemedText>
            {goalSeconds !== null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Show ${timerView === TimerViewPreference.Elapsed ? 'remaining' : 'elapsed'} time`}
                onPress={() =>
                  onTimerViewChange(
                    timerView === TimerViewPreference.Elapsed
                      ? TimerViewPreference.Remaining
                      : TimerViewPreference.Elapsed,
                  )
                }
                hitSlop={10}
                style={({ pressed }) => [
                  styles.timerViewButton,
                  { backgroundColor: theme.accentBackground },
                  pressed && styles.pressed,
                ]}>
                {timerView === TimerViewPreference.Elapsed ? (
                  <ArrowUp size={17} color={theme.accent} strokeWidth={2.4} />
                ) : (
                  <ArrowDown size={17} color={theme.accent} strokeWidth={2.4} />
                )}
              </Pressable>
            ) : null}
          </View>
          <ThemedText type="title" selectable style={styles.timer}>
            {formatDuration(shownSeconds)}
          </ThemedText>
        </View>
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
            <ThemedText>Reminder</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Optional notification when your fasting goal is reached.
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="Reminder"
            value={reminderEnabled}
            onValueChange={onReminderChange}
            trackColor={{ true: theme.accent }}
          />
        </View>
      ) : null}

      <View style={styles.activeActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            Cancel fast
          </ThemedText>
        </Pressable>
        <View style={styles.activeAction}>
          <AppButton label="End fast" onPress={onEnd} style={styles.primaryAction} />
        </View>
      </View>
    </Animated.View>
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

const styles = StyleSheet.create({
  stateContent: { flex: 1 },
  savedNotice: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  savedNoticeText: { flex: 1, gap: Spacing.half },
  ready: { flex: 1, gap: Spacing.three },
  centeredText: { textAlign: 'center' },
  readyFooter: { minHeight: 56 },
  primaryAction: {
    width: '100%',
    minHeight: 56,
  },
  active: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.two },
  activeHeading: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  activeGoalName: {
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  activeGoalDuration: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  timerViewButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  timerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
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
  activeActions: { width: '100%', flexDirection: 'row', gap: Spacing.two },
  activeAction: { flex: 1 },
  cancelButton: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.68 },
});
