import { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  unstable_batchedUpdates,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  FadeOutDown,
  LinearTransition,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AppSection } from '@/components/app-section';
import { AppButton } from '@/components/app-button';
import { useFastSavedNotice } from '@/components/fast-saved-notice-context';
import { NativeDateTimeField } from '@/components/native-date-time-field';
import { ScreenHeading } from '@/components/screen-heading';
import { TabScreenShell } from '@/components/tab-screen-shell';
import {
  customGoalId,
  FastGoalSelector,
  formatGoalDuration,
  getGoalSelectionId,
  unlimitedGoalId,
} from '@/components/fast-setup-controls';
import { ThemedText } from '@/components/themed-text';
import { TruncatedText } from '@/components/truncated-text';
import { Fonts, MaxContentWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';
import {
  cancelFast,
  endFast,
  getGoalSeconds,
  setActiveFastEndReminderEnabled,
  setActiveFastTimerView,
  startFast,
  updateActiveFastStart,
  useActiveFastState,
} from '@/storage/fasting-storage';
import { GoalDurationFormat, TimerViewPreference } from '@/storage/app-storage';
import {
  setLastUsedGoalDurationHours,
  useSettingsSelector,
} from '@/storage/settings-storage';
import { formatDuration, formatDurationWorklet } from '@/utils/fasting-duration';

const getInitialGoalId = (
  goals: readonly { id: string; targetDurationHours: number }[],
  lastUsedGoalDurationHours: number,
): string =>
  getGoalSelectionId(goals, lastUsedGoalDurationHours);

const formatDateTime = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
type AnimatedTextInputProps = {
  text: string;
  defaultValue: string;
};
const liveTimerHorizonSeconds = 366 * 24 * 60 * 60;

const getElapsedSecondsFromStart = (startedAtMs: number): number =>
  Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

const getShownTimerSecondsWorklet = ({
  elapsedSeconds,
  goalSeconds,
  timerView,
}: {
  elapsedSeconds: number;
  goalSeconds: number | null;
  timerView: TimerViewPreference;
}): number => {
  'worklet';

  if (
    timerView === TimerViewPreference.Remaining &&
    goalSeconds !== null
  ) {
    return Math.max(0, goalSeconds - elapsedSeconds);
  }

  return elapsedSeconds;
};

const useElapsedSecondsValue = (startedAt: string): SharedValue<number> => {
  const startedAtMs = new Date(startedAt).getTime();
  const elapsedSeconds = useSharedValue(getElapsedSecondsFromStart(startedAtMs));

  useEffect(() => {
    const startNativeTimer = (): void => {
      const currentElapsedSeconds = getElapsedSecondsFromStart(startedAtMs);

      cancelAnimation(elapsedSeconds);
      elapsedSeconds.value = currentElapsedSeconds;
      elapsedSeconds.value = withTiming(currentElapsedSeconds + liveTimerHorizonSeconds, {
        duration: liveTimerHorizonSeconds * 1000,
        easing: Easing.linear,
      });
    };

    startNativeTimer();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') startNativeTimer();
    });

    return () => {
      subscription.remove();
      cancelAnimation(elapsedSeconds);
    };
  }, [elapsedSeconds, startedAtMs]);

  return elapsedSeconds;
};

export default function HomeScreen() {
  const goals = useSettingsSelector((settings) => settings.goals);
  const lastUsedGoalDurationHours = useSettingsSelector(
    (settings) => settings.lastUsedGoalDurationHours,
  );
  const goalDurationFormat = useSettingsSelector((settings) => settings.goalDurationFormat);
  const activeFastState = useActiveFastState();
  const {
    notice: savedFastNotice,
    remainingSeconds: savedNoticeSeconds,
    dismiss: dismissSavedFastNotice,
  } = useFastSavedNotice();
  const enabledGoals = goals.filter((goal) => goal.isEnabled);
  const storedGoal =
    enabledGoals.find(
      (goal) => goal.targetDurationHours === lastUsedGoalDurationHours,
    ) ??
    enabledGoals.find((goal) => goal.id === 'goal-16-hours') ??
    enabledGoals[0] ??
    goals[0];
  const [selectedGoalId, setSelectedGoalId] = useState(() =>
    getInitialGoalId(
      goals.filter((goal) => goal.isEnabled),
      lastUsedGoalDurationHours,
    ),
  );
  const [customDurationHours, setCustomDurationHours] = useState(() =>
    Math.max(1, lastUsedGoalDurationHours || 24),
  );
  const [reason, setReason] = useState('');
  const [noteVisible, setNoteVisible] = useState(false);
  const [customDurationExpanded, setCustomDurationExpanded] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [activeReminderUpdating, setActiveReminderUpdating] = useState(false);
  const activeSession = activeFastState.session;
  const effectiveSelectedGoalId =
    selectedGoalId === customGoalId ||
    selectedGoalId === unlimitedGoalId ||
    enabledGoals.some((goal) => goal.id === selectedGoalId)
      ? selectedGoalId
      : getInitialGoalId(enabledGoals, lastUsedGoalDurationHours);

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

    unstable_batchedUpdates(() => {
      setSelectedGoalId((current) => (current === goalId ? current : goalId));
      if (goalId !== customGoalId) {
        setCustomDurationExpanded((current) => (current ? false : current));
      }
    });
    setLastUsedGoalDurationHours(durationHours);
  };
  const updateCustomDuration = (hours: number): void => {
    setCustomDurationHours((current) => (current === hours ? current : hours));
    setLastUsedGoalDurationHours(hours);
  };

  useEffect(() => {
    if (operationError === null) return;

    Alert.alert(
      t('fast.actionFailedTitle'),
      operationError,
      [{ text: t('common.ok'), onPress: () => setOperationError(null) }],
      { cancelable: true, onDismiss: () => setOperationError(null) },
    );
  }, [operationError]);

  const startSelectedFast = async (): Promise<void> => {
    try {
      await startFast({
        goalDurationHours: selectedDurationHours,
        reason: reason.trim() || null,
      });
      setReason('');
      setNoteVisible(false);
      setOperationError(null);
      dismissSavedFastNotice();
    } catch {
      setOperationError(t('fast.startFailed'));
    }
  };

  const endActiveFast = async (): Promise<void> => {
    try {
      const completedSession = await endFast();
      setOperationError(null);
      if (completedSession === null) return;
    } catch {
      setOperationError(t('fast.endFailed'));
    }
  };

  const cancelActiveFast = (): void => {
    Alert.alert(t('fast.cancelTitle'), t('fast.cancelMessage'), [
      { text: t('fast.keepFasting'), style: 'cancel' },
      {
        text: t('fast.cancelFast'),
        style: 'destructive',
        onPress: () => {
          void cancelFast().catch(() =>
            setOperationError(t('fast.cancelFailed')),
          );
        },
      },
    ]);
  };
  const updateActiveFastStartedAt = async (startedAt: Date): Promise<boolean> => {
    try {
      const result = await updateActiveFastStart(startedAt.toISOString());

      if (result.status === 'updated') {
        setOperationError(null);
        return true;
      }

      if (result.status === 'future') {
        setOperationError(t('fast.futureStart'));
        return false;
      }

      if (result.status === 'overlap') {
        setOperationError(
          t('fast.overlapStart'),
        );
        return false;
      }

      setOperationError(t('fast.noActiveFast'));
      return false;
    } catch {
      setOperationError(t('fast.startUpdateFailed'));
      return false;
    }
  };

  return (
    <TabScreenShell
      keyboardShouldPersistTaps="handled"
      maxWidth={Math.min(MaxContentWidth, 560)}
      contentStyle={styles.homeContent}>
        <ScreenHeading align="center">{t('common.appName')}</ScreenHeading>
        <View
          style={[
            styles.fastStateShell,
            activeSession !== null && styles.activeFastStateShell,
          ]}>
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
                goals.find(
                  (goal) => goal.targetDurationHours === activeSession.goalDurationHours,
                )?.name ?? (activeSession.goalDurationHours > 0 ? t('fast.thisTime') : t('common.openEnded'))
              }
              goalDurationFormat={goalDurationFormat}
              startedAt={activeSession.startedAt}
              reason={activeSession.reason}
              goalSeconds={
                activeSession.goalDurationHours > 0 ? getGoalSeconds(activeSession) : null
              }
              reminderEnabled={activeFastState.fastEndReminderEnabled}
              reminderUpdating={activeReminderUpdating}
              timerView={activeFastState.timerViewPreference}
              onTimerViewChange={setActiveFastTimerView}
              onStartedAtChange={updateActiveFastStartedAt}
              onReminderChange={(enabled) => {
                setActiveReminderUpdating(true);
                void setActiveFastEndReminderEnabled(enabled)
                  .catch(() => setOperationError(t('fast.reminderUpdateFailed')))
                  .finally(() => setActiveReminderUpdating(false));
              }}
              onEnd={() => {
                void endActiveFast();
              }}
              onCancel={cancelActiveFast}
            />
          )}
        </View>
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
  const goalDurationFormat = useSettingsSelector((settings) => settings.goalDurationFormat);
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
  const selectedGoalDuration =
    selectedGoalId === unlimitedGoalId
      ? t('common.unlimited')
      : formatGoalDuration(
          selectedGoalId === customGoalId
            ? customDurationHours
            : (selectedGoal?.targetDurationHours ?? customDurationHours),
          goalDurationFormat,
        );
  const startButtonLabel =
    selectedGoalId === unlimitedGoalId
      ? t('fast.startUnlimited')
      : t('fast.startWithDuration', { duration: selectedGoalDuration });
  const startButtonDuration =
    selectedGoalId === unlimitedGoalId ? t('common.unlimited') : selectedGoalDuration;

  return (
    <Animated.View entering={FadeInUp.duration(180)} style={styles.ready}>
      <FastGoalSelector
        goals={goals}
        selectedGoalId={selectedGoalId}
        customDurationHours={customDurationHours}
        customDurationExpanded={customDurationExpanded}
        noteEnabled={noteVisible}
        noteValue={reason}
        onSelectGoal={onSelectGoal}
        onCustomDurationChange={onCustomDurationChange}
        onCustomDurationExpandedChange={onCustomDurationExpandedChange}
        onNoteEnabledChange={(visible) => {
          onNoteVisibilityChange(visible);
          if (!visible) onReasonChange('');
        }}
        onNoteChangeText={onReasonChange}
      />

      <Animated.View layout={LinearTransition.duration(180)} style={styles.readyFooter}>
        <AppButton label={startButtonLabel} onPress={onStart} style={styles.primaryAction}>
          <ThemedText type="small" style={[styles.primaryActionText, { color: theme.accentForeground }]}>
            {t('fast.start')}{' '}
            <ThemedText
              type="smallBold"
              style={[styles.primaryActionText, styles.primaryActionValue, { color: theme.accentForeground }]}>
              {startButtonDuration}
            </ThemedText>{' '}
            {t('fast.fast')}
          </ThemedText>
        </AppButton>
        <View style={styles.savedNoticeSlot}>
          {savedSessionId !== null ? (
            <Animated.View
              entering={FadeInUp.duration(200)}
              exiting={FadeOutDown.duration(160)}
              style={styles.savedNoticeWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('fast.savedAccessibility', { seconds: savedNoticeSeconds })}
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
                  <ThemedText type="smallBold">{t('fast.savedTitle')}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('fast.savedSubtitle', { seconds: savedNoticeSeconds })}
                  </ThemedText>
                </View>
                <ChevronRight size={18} color={theme.accent} />
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function ActiveFast({
  goalDurationHours,
  goalName,
  goalDurationFormat,
  startedAt,
  reason,
  goalSeconds,
  reminderEnabled,
  reminderUpdating,
  timerView,
  onTimerViewChange,
  onStartedAtChange,
  onReminderChange,
  onEnd,
  onCancel,
}: {
  goalDurationHours: number;
  goalName: string;
  goalDurationFormat: GoalDurationFormat;
  startedAt: string;
  reason: string | null;
  goalSeconds: number | null;
  reminderEnabled: boolean;
  reminderUpdating: boolean;
  timerView: TimerViewPreference;
  onTimerViewChange: (timerView: TimerViewPreference) => void;
  onStartedAtChange: (startedAt: Date) => Promise<boolean>;
  onReminderChange: (enabled: boolean) => void;
  onEnd: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const startedDate = new Date(startedAt);
  const endDate = goalSeconds === null ? null : new Date(startedDate.getTime() + goalSeconds * 1000);
  const goalTitle = goalDurationHours > 0 ? goalName : t('common.openEnded');
  const goalSubtitle =
    goalDurationHours > 0 ? formatGoalDuration(goalDurationHours, goalDurationFormat) : t('common.unlimited');
  const initialElapsedSeconds = getElapsedSecondsFromStart(startedDate.getTime());
  const elapsedSeconds = useElapsedSecondsValue(startedAt);
  const [editingStartedAt, setEditingStartedAt] = useState(false);

  return (
    <Animated.View entering={FadeInUp.duration(180)} style={styles.active}>
      <AppSection>
        <View style={styles.activeFastBody}>
          <View style={styles.activeFastTopLine}>
            <View style={styles.activeDurationGroup}>
              <View style={styles.timerLabelRow}>
                <LiveTimerLabel
                  goalSeconds={goalSeconds}
                  timerView={timerView}
                  color={theme.textSecondary}
                />
                {goalSeconds !== null ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('fast.timerShowAccessibility', {
                      timerView: timerView === TimerViewPreference.Elapsed
                        ? t('common.remaining').toLowerCase()
                        : t('common.elapsed').toLowerCase(),
                    })}
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
                      { backgroundColor: theme.accent },
                      pressed && styles.timerViewButtonPressed,
                    ]}>
                    {timerView === TimerViewPreference.Elapsed ? (
                      <ArrowUp size={17} color={theme.accentForeground} strokeWidth={2.6} />
                    ) : (
                      <ArrowDown size={17} color={theme.accentForeground} strokeWidth={2.6} />
                    )}
                  </Pressable>
                ) : null}
              </View>
              <LiveTimerText
                elapsedSeconds={elapsedSeconds}
                goalSeconds={goalSeconds}
                timerView={timerView}
                durationFormat={goalDurationFormat}
                color={theme.text}
                accessibilityLabel={t('fast.timerAccessibility')}
                initialElapsedSeconds={initialElapsedSeconds}
              />
            </View>
            <View style={styles.activeGoalSummary}>
              <TruncatedText value={goalTitle} type="smallBold" style={styles.activeGoalSummaryName} />
              <ThemedText type="smallBold" themeColor="accent" style={styles.activeGoalSummaryDuration}>
                {goalSubtitle}
              </ThemedText>
              <LiveGoalReachedCheck
                elapsedSeconds={elapsedSeconds}
                goalSeconds={goalSeconds}
                color={theme.accent}
                initialElapsedSeconds={initialElapsedSeconds}
              />
            </View>
          </View>
          <LinearTimerProgress
            elapsedSeconds={elapsedSeconds}
            goalSeconds={goalSeconds}
            color={theme.accent}
            trackColor={theme.backgroundSelected}
          />
          <View style={styles.activeFastTimes}>
            <EditableStartedMetric
              value={startedDate}
              editing={editingStartedAt}
              onEditingChange={setEditingStartedAt}
              onSave={onStartedAtChange}
            />
            <View style={[styles.metricDivider, { backgroundColor: theme.backgroundSelected }]} />
            <Metric label={t('fast.ends')} value={endDate === null ? t('fast.noPlannedEnd') : formatDateTime(endDate)} />
          </View>
          {goalSeconds !== null ? (
            <View style={styles.reminderRow}>
              <View style={styles.reminderText}>
                <ThemedText type="smallBold">{t('fast.reminderTitle')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('fast.reminderDescription')}
                </ThemedText>
              </View>
              <View style={styles.reminderSwitchColumn}>
                <Switch
                  accessibilityLabel={t('fast.reminderAccessibility')}
                  value={reminderEnabled}
                  onValueChange={onReminderChange}
                  disabled={reminderUpdating}
                  trackColor={{ true: theme.accent }}
                />
              </View>
            </View>
          ) : null}
          {reason !== null ? (
            <View style={styles.activeNote}>
              <ThemedText type="smallBold">{t('setup.note')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" selectable>
                {reason}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </AppSection>

      <View style={styles.activeActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            {t('fast.cancelAction')}
          </ThemedText>
        </Pressable>
        <View style={styles.activeAction}>
          <AppButton label={t('fast.endAction')} onPress={onEnd} style={styles.primaryAction} />
        </View>
      </View>
    </Animated.View>
  );
}

function LinearTimerProgress({
  elapsedSeconds,
  goalSeconds,
  color,
  trackColor,
}: {
  elapsedSeconds: SharedValue<number>;
  goalSeconds: number | null;
  color: string;
  trackColor: string;
}) {
  const progressStyle = useAnimatedStyle(() => {
    const progress =
      goalSeconds === null ? 1 : Math.min(1, Math.max(0, elapsedSeconds.value / goalSeconds));

    return {
      width: `${progress * 100}%`,
    };
  }, [goalSeconds]);

  return (
    <View
      accessible
      accessibilityLabel={
        goalSeconds === null
          ? t('fast.progressOpenEndedAccessibility')
          : t('fast.progressGoalAccessibility')
      }
      style={[styles.timerProgressTrack, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.timerProgressFill, { backgroundColor: color }, progressStyle]} />
    </View>
  );
}

function LiveTimerLabel({
  goalSeconds,
  timerView,
  color,
}: {
  goalSeconds: number | null;
  timerView: TimerViewPreference;
  color: string;
}) {
  return (
    <ThemedText type="small" style={[styles.timerLabel, { color }]}>
      {timerView === TimerViewPreference.Remaining && goalSeconds !== null
        ? t('common.remaining')
        : t('common.elapsed')}
    </ThemedText>
  );
}

function LiveTimerText({
  elapsedSeconds,
  goalSeconds,
  timerView,
  durationFormat,
  color,
  accessibilityLabel,
  initialElapsedSeconds,
}: {
  elapsedSeconds: SharedValue<number>;
  goalSeconds: number | null;
  timerView: TimerViewPreference;
  durationFormat: GoalDurationFormat;
  color: string;
  accessibilityLabel: string;
  initialElapsedSeconds: number;
}) {
  const getText = (value: number): string =>
    formatDuration(
      getShownTimerSecondsWorklet({ elapsedSeconds: value, goalSeconds, timerView }),
      durationFormat,
    );
  const animatedProps = useAnimatedProps(() => {
    const shownSeconds = getShownTimerSecondsWorklet({
      elapsedSeconds: elapsedSeconds.value,
      goalSeconds,
      timerView,
    });
    const text = formatDurationWorklet(shownSeconds, durationFormat);

    return { text, defaultValue: text } satisfies AnimatedTextInputProps;
  });
  const timerTypographyStyle = useAnimatedStyle(() => {
    if (durationFormat !== 'days') {
      return { fontSize: 38, lineHeight: 44 };
    }

    const shownSeconds = getShownTimerSecondsWorklet({
      elapsedSeconds: elapsedSeconds.value,
      goalSeconds,
      timerView,
    });

    if (shownSeconds >= 86_400) {
      return { fontSize: 24, lineHeight: 32 };
    }
    if (shownSeconds >= 3_600) {
      return { fontSize: 28, lineHeight: 36 };
    }
    return { fontSize: 38, lineHeight: 44 };
  });

  return (
    <AnimatedTextInput
      accessibilityLabel={accessibilityLabel}
      editable={false}
      focusable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      animatedProps={animatedProps as never}
      defaultValue={getText(initialElapsedSeconds)}
      style={[
        styles.timer,
        durationFormat === GoalDurationFormat.Days && styles.timerWithUnits,
        timerTypographyStyle,
        { color },
      ]}
    />
  );
}

function LiveGoalReachedCheck({
  elapsedSeconds,
  goalSeconds,
  color,
  initialElapsedSeconds,
}: {
  elapsedSeconds: SharedValue<number>;
  goalSeconds: number | null;
  color: string;
  initialElapsedSeconds: number;
}) {
  const initialReached = goalSeconds !== null && initialElapsedSeconds >= goalSeconds;
  const checkStyle = useAnimatedStyle(() => ({
    opacity: goalSeconds !== null && elapsedSeconds.value >= goalSeconds ? 1 : 0,
  }), [goalSeconds]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.timerGoalReachedIcon, { opacity: initialReached ? 1 : 0 }, checkStyle]}>
      <CheckCircle2 size={22} color={color} strokeWidth={2.4} />
    </Animated.View>
  );
}

function EditableStartedMetric({
  value,
  editing,
  onEditingChange,
  onSave,
}: {
  value: Date;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSave: (value: Date) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('fast.startedEditAccessibility', { date: formatDateTime(value) })}
        onPress={() => {
          setDraft(value);
          onEditingChange(true);
        }}
        style={({ pressed }) => [styles.metricButton, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">{t('fast.started')}</ThemedText>
        <ThemedText type="smallBold" selectable style={styles.centeredText}>
          {formatDateTime(value)}
        </ThemedText>
        <ThemedText type="small" themeColor="accent">
          {t('common.edit')}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={styles.startedEditor}>
      <ThemedText type="small" themeColor="textSecondary">{t('fast.started')}</ThemedText>
      <NativeDateTimeField
        value={draft}
        maximumDate={new Date()}
        onChange={(nextDraft) => {
          if (nextDraft !== null) setDraft(nextDraft);
        }}
      />
      <View style={styles.startedEditorActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onEditingChange(false)}
          style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">{t('common.cancel')}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void onSave(draft).then((saved) => {
              if (saved) onEditingChange(false);
            });
          }}
          style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="accent">{t('common.save')}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold" selectable style={styles.centeredText}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  homeContent: {
    flex: 1,
  },
  fastStateShell: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.huge,
  },
  activeFastStateShell: {
    paddingBottom: Spacing.xl + Typography.screenTitle.lineHeight + Spacing.three,
  },
  savedNotice: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  savedNoticeWrap: { width: '100%' },
  savedNoticeSlot: {
    minHeight: 64,
    width: '100%',
    justifyContent: 'flex-start',
  },
  savedNoticeText: { flex: 1, gap: Spacing.half },
  ready: { width: '100%', gap: Spacing.md },
  centeredText: { textAlign: 'center' },
  readyFooter: { gap: Spacing.xs, minHeight: 56 },
  primaryAction: {
    width: '100%',
    minHeight: 56,
  },
  primaryActionText: {
    fontSize: 16,
    lineHeight: 22,
  },
  primaryActionValue: {
    fontWeight: '800',
  },
  active: { width: '100%', alignItems: 'center', gap: Spacing.md },
  timerViewButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  timerViewButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.95 }],
  },
  activeFastBody: {
    width: '100%',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  activeFastTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  activeDurationGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  activeGoalSummary: {
    maxWidth: '42%',
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  activeGoalSummaryName: {
    maxWidth: '100%',
    textAlign: 'right',
  },
  activeGoalSummaryDuration: {
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  timerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  timerLabel: {
    padding: 0,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '400',
  },
  timer: {
    minWidth: 190,
    padding: 0,
    textAlign: 'left',
    fontSize: Typography.timer.fontSize,
    lineHeight: Typography.timer.lineHeight,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerWithUnits: {
    minWidth: 0,
  },
  timerGoalReachedIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerProgressTrack: {
    width: '100%',
    height: 7,
    overflow: 'hidden',
    borderRadius: 4,
  },
  timerProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  activeFastTimes: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: Spacing.one,
  },
  metric: { flex: 1, alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs },
  metricButton: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  startedEditor: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
  },
  startedEditorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  textAction: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  metricDivider: { width: 1 },
  reminderRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  reminderText: { flex: 1, justifyContent: 'center', gap: Spacing.xxs },
  reminderSwitchColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNote: {
    gap: Spacing.xxs,
    paddingTop: Spacing.xs,
  },
  activeActions: { width: '100%', flexDirection: 'row', gap: Spacing.xs },
  activeAction: { flex: 1 },
  cancelButton: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.68 },
});
