import { useState } from 'react';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { FeedbackState } from '@/components/feedback-state';
import { FastingSummaryCard } from '@/components/fasting-summary-card';
import {
  customGoalId,
  FastGoalSelector,
  getGoalSelectionId,
  maxCustomDurationHours,
  unlimitedGoalId,
} from '@/components/fast-setup-controls';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppThemeColorScheme, useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';
import {
  deleteFastSession,
  formatDuration,
  getFastSession,
  getOverlappingFastSession,
  getSessionDurationSeconds,
  updateFastSession,
  useHistoryState,
} from '@/storage/fasting-storage';
import { type FastSession } from '@/storage/app-storage';
import { useSettings } from '@/storage/settings-storage';
import { formatGoalDuration } from '@/utils/fast-goals';

type EditState = {
  startedAt: Date | null;
  endedAt: Date | null;
  goalDurationHours: string;
  reason: string;
};

const toDateValue = (timestamp: string | null): Date | null => {
  if (timestamp === null) {
    return null;
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date;
};

const mergeDatePart = ({ current, selected }: { current: Date | null; selected: Date }): Date => {
  const next = current === null ? new Date() : new Date(current);

  next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return next;
};

const mergeTimePart = ({ current, selected }: { current: Date | null; selected: Date }): Date => {
  const next = current === null ? new Date() : new Date(current);

  next.setHours(selected.getHours(), selected.getMinutes());
  return next;
};

const createEditState = (session: FastSession): EditState => ({
  startedAt: toDateValue(session.startedAt),
  endedAt: toDateValue(session.endedAt),
  goalDurationHours: `${session.goalDurationHours}`,
  reason: session.reason ?? '',
});

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useHistoryState();
  const session = typeof id === 'string' ? getFastSession(id) : undefined;

  if (session === undefined) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.screen}>
        <FeedbackState
          kind="error"
          title={t('historyEdit.missingTitle')}
          description={t('historyEdit.missingDescription')}
          action={{ label: t('historyEdit.backAction'), onPress: () => router.replace('/history') }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screen}>
      <DetailContent session={session} />
    </ScrollView>
  );
}

function DetailContent({ session }: { session: FastSession }) {
  const settings = useSettings();
  const enabledGoals = settings.goals.filter((goal) => goal.isEnabled);
  const [editState, setEditState] = useState<EditState>(() => createEditState(session));
  const [editError, setEditError] = useState<string | null>(null);
  const [customDurationExpanded, setCustomDurationExpanded] = useState(false);
  const [noteEnabled, setNoteEnabled] = useState(session.reason !== null);
  const goalDurationHours = Number(editState.goalDurationHours);
  const editedDurationSeconds =
    editState.startedAt !== null && editState.endedAt !== null
      ? Math.max(0, (editState.endedAt.getTime() - editState.startedAt.getTime()) / 1000)
      : getSessionDurationSeconds(session);
  const editedProgress =
    goalDurationHours > 0 ? editedDurationSeconds / (goalDurationHours * 3600) : null;
  const [selectedGoalId, setSelectedGoalId] = useState(() =>
    getGoalSelectionId(enabledGoals, goalDurationHours),
  );

  const deleteSession = (): void => {
    Alert.alert(t('historyEdit.deleteTitle'), t('historyEdit.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteFastSession(session.id);
          router.back();
        },
      },
    ]);
  };
  const saveEdits = (): void => {
    const startedAt = editState.startedAt;
    const endedAt = editState.endedAt;
    const goalDurationText = editState.goalDurationHours.trim();
    const goalDurationHours = Number(goalDurationText);
    const currentTime = Date.now();

    if (startedAt === null) {
      setEditError(t('historyEdit.startRequired'));
      return;
    }

    if (startedAt.getTime() > currentTime) {
      setEditError(t('historyEdit.startFuture'));
      return;
    }

    if (endedAt === null) {
      setEditError(t('historyEdit.endRequired'));
      return;
    }

    if (endedAt.getTime() > currentTime) {
      setEditError(t('historyEdit.endFuture'));
      return;
    }

    if (selectedGoalId === customGoalId && goalDurationText === '') {
      setEditError(t('historyEdit.goalRequired'));
      return;
    }

    if (!Number.isInteger(goalDurationHours) || goalDurationHours < 0) {
      setEditError(t('historyEdit.goalRequired'));
      return;
    }

    if (goalDurationHours > maxCustomDurationHours) {
      setEditError(t('historyEdit.goalMax'));
      return;
    }

    if (endedAt.getTime() <= startedAt.getTime()) {
      setEditError(t('historyEdit.dateInvalidMessage'));
      return;
    }

    const nextSession = {
      ...session,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    };
    const overlappingSession = getOverlappingFastSession({
      excludedSessionId: session.id,
      session: nextSession,
    });

    if (overlappingSession !== undefined) {
      setEditError(
        t('historyEdit.overlapMessage'),
      );
      return;
    }

    const updatedSession = updateFastSession({
      sessionId: session.id,
      update: (currentSession) => ({
        ...currentSession,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        goalDurationHours,
        reason: noteEnabled && editState.reason.trim() !== '' ? editState.reason.trim() : null,
      }),
    });

    if (updatedSession === undefined) {
      setEditError(t('historyEdit.missingSaveTarget'));
      return;
    }

    setEditError(null);
    router.back();
  };

  return (
    <View style={styles.content}>
      <FastGoalSelector
        goals={enabledGoals}
        selectedGoalId={selectedGoalId}
        customDurationHours={Math.max(1, goalDurationHours || 1)}
        customDurationExpanded={customDurationExpanded}
        noteEnabled={noteEnabled}
        noteValue={editState.reason}
        onSelectGoal={(goalId) => {
          setSelectedGoalId(goalId);
          if (goalId === unlimitedGoalId) {
            setEditState((state) => ({ ...state, goalDurationHours: '0' }));
            setCustomDurationExpanded(false);
            return;
          }

          if (goalId === customGoalId) return;

          const goal = enabledGoals.find((goalOption) => goalOption.id === goalId);
          if (goal !== undefined) {
            setEditState((state) => ({
              ...state,
              goalDurationHours: String(goal.targetDurationHours),
            }));
            setCustomDurationExpanded(false);
          }
        }}
        onCustomDurationChange={(hours) =>
          setEditState((state) => ({ ...state, goalDurationHours: String(hours) }))
        }
        onCustomDurationExpandedChange={setCustomDurationExpanded}
        onNoteEnabledChange={(enabled: boolean) => {
          setNoteEnabled(enabled);
          if (!enabled) setEditState((state) => ({ ...state, reason: '' }));
        }}
        onNoteChangeText={(reason: string) => setEditState((state) => ({ ...state, reason }))}
      />

      {editError !== null && (
        <FeedbackState
          kind="error"
          title={t('historyEdit.saveFailedTitle')}
          description={editError}
          action={{ label: t('common.dismiss'), onPress: () => setEditError(null) }}
        />
      )}

      <FastingSummaryCard
        duration={formatDuration(editedDurationSeconds)}
        goalLabel={
          goalDurationHours <= 0
            ? t('common.unlimited')
            : formatGoalDuration(goalDurationHours, settings.goalDurationFormat)
        }
        progress={editedProgress}
        started={
          <NativeDateTimeField
            value={editState.startedAt}
            onChange={(startedAt) => setEditState((state) => ({ ...state, startedAt }))}
          />
        }
        ended={
          <NativeDateTimeField
            value={editState.endedAt}
            fallbackDate={editState.startedAt ?? undefined}
            onChange={(endedAt) => setEditState((state) => ({ ...state, endedAt }))}
          />
        }
      />

      <View style={styles.actions}>
        <AppButton label={t('historyEdit.deleteAction')} onPress={deleteSession} variant="dangerGhost" fullWidth />
        <AppButton label={t('historyEdit.saveAction')} onPress={saveEdits} fullWidth />
      </View>
    </View>
  );
}

function NativeDateTimeField({
  value,
  fallbackDate,
  onChange,
}: {
  value: Date | null;
  fallbackDate?: Date;
  onChange: (value: Date | null) => void;
}) {
  const theme = useTheme();
  const colorScheme = useAppThemeColorScheme();
  const pickerValue = value ?? fallbackDate ?? new Date();
  const updateDate = (_event: DateTimePickerEvent, selectedDate?: Date): void => {
    if (selectedDate !== undefined) {
      onChange(mergeDatePart({ current: value, selected: selectedDate }));
    }
  };
  const updateTime = (_event: DateTimePickerEvent, selectedDate?: Date): void => {
    if (selectedDate !== undefined) {
      onChange(mergeTimePart({ current: value, selected: selectedDate }));
    }
  };

  return (
    <View style={styles.timeField}>
      <View style={styles.dateTimeControls}>
        <DateTimePicker
          mode="date"
          display={process.env.EXPO_OS === 'ios' ? 'compact' : 'default'}
          value={pickerValue}
          maximumDate={new Date()}
          themeVariant={colorScheme}
          accentColor={theme.accent}
          textColor={theme.text}
          onChange={updateDate}
        />
        <DateTimePicker
          mode="time"
          display={process.env.EXPO_OS === 'ios' ? 'compact' : 'default'}
          value={pickerValue}
          maximumDate={new Date()}
          themeVariant={colorScheme}
          accentColor={theme.accent}
          textColor={theme.text}
          onChange={updateTime}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 640),
    alignSelf: 'center',
    padding: Spacing.four,
  },
  content: {
    gap: Spacing.three,
  },
  timeField: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateTimeControls: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
