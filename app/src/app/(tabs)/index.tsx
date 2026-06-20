import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

import { AppButton } from '@/components/app-button';
import { AppSurface } from '@/components/app-surface';
import { FeedbackState } from '@/components/feedback-state';
import {
  customGoalId,
  FastGoalSelector,
  FastNoteEditor,
  formatGoalDuration,
  getGoalSelectionId,
  unlimitedGoalId,
} from '@/components/fast-setup-controls';
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

const bottomActionInset = process.env.EXPO_OS === 'ios' ? 152 : 96;

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
  const [recentlyCompletedSessionId, setRecentlyCompletedSessionId] = useState<string | null>(null);
  const [savedNoticeSeconds, setSavedNoticeSeconds] = useState(5);
  const activeSession = activeFastState.session;
  const shouldScroll =
    height < 700 ||
    activeSession !== null ||
    operationError !== null ||
    noteVisible ||
    customDurationExpanded ||
    recentlyCompletedSessionId !== null;
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

  useEffect(() => {
    if (recentlyCompletedSessionId === null) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      setSavedNoticeSeconds(Math.max(1, 5 - Math.floor((Date.now() - startedAt) / 1000)));
    }, 250);
    const timeout = setTimeout(() => setRecentlyCompletedSessionId(null), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [recentlyCompletedSessionId]);

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
      setRecentlyCompletedSessionId(null);
    } catch {
      setOperationError('The fast could not be started. Your local data was not changed.');
    }
  };

  const endActiveFast = async (): Promise<void> => {
    try {
      const completedSession = await endFast();
      setOperationError(null);
      if (completedSession !== null) {
        setSavedNoticeSeconds(5);
        setRecentlyCompletedSessionId(completedSession.id);
      }
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
            customDurationExpanded={customDurationExpanded}
            onCustomDurationExpandedChange={setCustomDurationExpanded}
            footerAnchored
            savedSessionId={recentlyCompletedSessionId}
            savedNoticeSeconds={savedNoticeSeconds}
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
  customDurationExpanded,
  onCustomDurationExpandedChange,
  footerAnchored,
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
  footerAnchored: boolean;
  savedSessionId: string | null;
  savedNoticeSeconds: number;
  onStart: () => void;
}) {
  const { height } = useWindowDimensions();

  return (
    <View style={styles.ready}>
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

      <View
        style={[
          styles.readyFooter,
          height >= 700 &&
            !noteVisible &&
            !customDurationExpanded &&
            footerAnchored &&
            styles.readyFooterAnchored,
        ]}>
        <ActionButton label="Start fast" onPress={onStart} />
      </View>
      {savedSessionId !== null ? (
        <AppSurface style={[styles.savedNotice, styles.savedNoticeAnchored]}>
          <View style={styles.savedNoticeText}>
            <ThemedText type="smallBold">Fast saved</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Added to History.
            </ThemedText>
          </View>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.savedNoticeTimer}>
            {savedNoticeSeconds}s
          </ThemedText>
          <AppButton
            label="View fast"
            variant="secondary"
            onPress={() => router.push(`/history/${savedSessionId}`)}
          />
        </AppSurface>
      ) : null}
    </View>
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
  const ringSize = Math.min(268, width - Spacing.four * 2);
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
          <ActionButton label="End fast" onPress={onEnd} />
        </View>
      </View>
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
      <ThemedText
        type="default"
        style={{
          color: variant === 'danger' ? theme.dangerForeground : theme.accentForeground,
          fontWeight: '700',
        }}>
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
  savedNotice: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  savedNoticeAnchored: { position: 'absolute', right: 0, bottom: 76, left: 0 },
  savedNoticeText: { flex: 1, gap: Spacing.one },
  savedNoticeTimer: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  ready: { flex: 1, gap: Spacing.three },
  centeredText: { textAlign: 'center' },
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
