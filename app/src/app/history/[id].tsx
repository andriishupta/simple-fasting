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
import { AppSurface } from '@/components/app-surface';
import { FeedbackState } from '@/components/feedback-state';
import {
  customGoalId,
  FastGoalSelector,
  FastNoteEditor,
  getGoalSelectionId,
  maxCustomDurationHours,
  unlimitedGoalId,
} from '@/components/fast-setup-controls';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppThemeColorScheme, useTheme } from '@/hooks/use-theme';
import {
  deleteFastSession,
  formatDuration,
  getFastSession,
  getSessionDurationSeconds,
  updateFastSession,
  useHistoryState,
} from '@/storage/fasting-storage';
import { type FastSession } from '@/storage/app-storage';
import { useSettings } from '@/storage/settings-storage';

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

const formatLocaleDateTime = (timestamp: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(timestamp));

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
          title="Fast not found"
          description="This session may have been deleted from local history."
          action={{ label: 'Back to History', onPress: () => router.replace('/history') }}
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
  const [selectedGoalId, setSelectedGoalId] = useState(() =>
    getGoalSelectionId(enabledGoals, goalDurationHours),
  );

  const deleteSession = (): void => {
    Alert.alert('Delete fast?', 'This removes the session from local history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
      setEditError('Start time is required.');
      return;
    }

    if (startedAt.getTime() > currentTime) {
      setEditError('Start time cannot be in the future.');
      return;
    }

    if (endedAt === null) {
      setEditError('End time is required.');
      return;
    }

    if (endedAt.getTime() > currentTime) {
      setEditError('End time cannot be in the future.');
      return;
    }

    if (selectedGoalId === customGoalId && goalDurationText === '') {
      setEditError('Goal must be unlimited or a positive number of hours.');
      return;
    }

    if (!Number.isInteger(goalDurationHours) || goalDurationHours < 0) {
      setEditError('Goal must be unlimited or a positive number of hours.');
      return;
    }

    if (goalDurationHours > maxCustomDurationHours) {
      setEditError('Goal can be up to 7 days.');
      return;
    }

    if (endedAt.getTime() <= startedAt.getTime()) {
      setEditError('End time must be after start time.');
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
      setEditError('This fast could not be found in local history.');
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
      />

      <View style={styles.summary}>
        <ThemedText type="title" style={styles.duration}>
          {formatDuration(editedDurationSeconds)}
        </ThemedText>
      </View>

      {editError !== null && (
        <FeedbackState
          kind="error"
          title="Could not save changes"
          description={editError}
          action={{ label: 'Dismiss', onPress: () => setEditError(null) }}
        />
      )}

      <View style={styles.timeFields}>
        <NativeDateTimeField
          label="Start time"
          value={editState.startedAt}
          onChange={(startedAt) => setEditState((state) => ({ ...state, startedAt }))}
        />
        <NativeDateTimeField
          label="End time"
          value={editState.endedAt}
          fallbackDate={editState.startedAt ?? undefined}
          onChange={(endedAt) => setEditState((state) => ({ ...state, endedAt }))}
        />
      </View>

      <FastNoteEditor
        enabled={noteEnabled}
        value={editState.reason}
        onEnabledChange={(enabled) => {
          setNoteEnabled(enabled);
          if (!enabled) setEditState((state) => ({ ...state, reason: '' }));
        }}
        onChangeText={(reason) => setEditState((state) => ({ ...state, reason }))}
      />

      <View style={styles.actions}>
        <AppButton label="Delete" onPress={deleteSession} variant="danger" fullWidth />
        <AppButton label="Save" onPress={saveEdits} fullWidth />
      </View>
    </View>
  );
}

function NativeDateTimeField({
  label,
  value,
  fallbackDate,
  onChange,
}: {
  label: string;
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
    <AppSurface style={styles.timeField}>
      <ThemedText type="smallBold">{label}</ThemedText>
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
      {value !== null && (
        <ThemedText type="small" themeColor="textSecondary" selectable>
          {formatLocaleDateTime(value.toISOString())}
        </ThemedText>
      )}
    </AppSurface>
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
  summary: {
    alignItems: 'center',
  },
  duration: {
    textAlign: 'center',
  },
  timeFields: { gap: Spacing.two },
  timeField: { gap: Spacing.two },
  dateTimeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
