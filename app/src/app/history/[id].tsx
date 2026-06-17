import { useState } from 'react';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppSurface } from '@/components/app-surface';
import { FeedbackState } from '@/components/feedback-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteFastSession,
  formatDuration,
  getFastSession,
  getSessionDurationSeconds,
  updateFastSession,
  useHistoryState,
} from '@/storage/fasting-storage';
import { type FastSession, type FastingGoal } from '@/storage/app-storage';
import { useSettings } from '@/storage/settings-storage';

type EditState = {
  startedAt: Date | null;
  endedAt: Date | null;
  goalDurationHours: string;
  reason: string;
};

const customGoalId = 'custom-duration';
const maxGoalDurationHours = 40 * 24;

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
      <ScreenScaffold title="Edit Fast" eyebrow="History">
        <FeedbackState
          kind="error"
          title="Fast not found"
          description="This session may have been deleted from local history."
          action={{ label: 'Back to History', onPress: () => router.replace('/history') }}
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Edit Fast" eyebrow="History">
      <DetailContent session={session} />
    </ScreenScaffold>
  );
}

function DetailContent({ session }: { session: FastSession }) {
  const settings = useSettings();
  const [editState, setEditState] = useState<EditState>(() => createEditState(session));
  const [editError, setEditError] = useState<string | null>(null);
  const selectedGoalId =
    settings.goals.find((goal) => `${goal.targetDurationHours}` === editState.goalDurationHours)
      ?.id ?? customGoalId;

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
  const cancelEditing = (): void => {
    router.back();
  };
  const saveEdits = (): void => {
    const startedAt = editState.startedAt;
    const endedAt = editState.endedAt;
    const goalDurationHours = Number(editState.goalDurationHours);
    const currentTime = Date.now();

    if (startedAt === null) {
      setEditError('Start time is required.');
      return;
    }

    if (startedAt.getTime() > currentTime) {
      setEditError('Start time cannot be in the future.');
      return;
    }

    if (endedAt !== null && endedAt.getTime() > currentTime) {
      setEditError('End time cannot be in the future.');
      return;
    }

    if (!Number.isInteger(goalDurationHours) || goalDurationHours <= 0) {
      setEditError('Goal must be a positive number of hours.');
      return;
    }

    if (goalDurationHours > maxGoalDurationHours) {
      setEditError('Goal can be up to 40 days.');
      return;
    }

    if (endedAt !== null && endedAt.getTime() <= startedAt.getTime()) {
      setEditError('End time must be after start time.');
      return;
    }

    const updatedSession = updateFastSession({
      sessionId: session.id,
      update: (currentSession) => ({
        ...currentSession,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt?.toISOString() ?? null,
        goalDurationHours,
        reason: editState.reason.trim() === '' ? null : editState.reason.trim(),
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
      <View style={styles.summary}>
        <ThemedText type="title" style={styles.duration}>
          {formatDuration(getSessionDurationSeconds(session))}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {session.goalDurationHours} hour goal · {session.status}
        </ThemedText>
      </View>

      <AppSurface style={styles.editPanel}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatLocaleDateTime(session.startedAt)}
          {session.endedAt === null ? '' : ` to ${formatLocaleDateTime(session.endedAt)}`}
        </ThemedText>
        {editError !== null && (
          <FeedbackState
            kind="error"
            title="Could not save changes"
            description={editError}
            action={{ label: 'Dismiss', onPress: () => setEditError(null) }}
          />
        )}
        <NativeDateTimeField
          label="Start time"
          value={editState.startedAt}
          onChange={(startedAt) => setEditState((state) => ({ ...state, startedAt }))}
        />
        <NativeDateTimeField
          label="End time"
          value={editState.endedAt}
          canClear
          fallbackDate={editState.startedAt ?? undefined}
          onChange={(endedAt) => setEditState((state) => ({ ...state, endedAt }))}
        />
        <GoalPicker
          goals={settings.goals}
          selectedGoalId={selectedGoalId}
          onSelect={(goalId) => {
            if (goalId === customGoalId) {
              setEditState((state) => ({ ...state, goalDurationHours: '' }));
              return;
            }

            const goal = settings.goals.find((goalOption) => goalOption.id === goalId);

            if (goal !== undefined) {
              setEditState((state) => ({
                ...state,
                goalDurationHours: `${goal.targetDurationHours}`,
              }));
            }
          }}
        />
        {selectedGoalId === customGoalId && (
          <EditField
            label="Custom goal hours"
            value={editState.goalDurationHours}
            keyboardType="number-pad"
            onChangeText={(goalDurationHours) =>
              setEditState((state) => ({
                ...state,
                goalDurationHours: goalDurationHours.replaceAll(/\D/g, ''),
              }))
            }
          />
        )}
        <EditField
          label="Reason"
          value={editState.reason}
          placeholder="Optional"
          onChangeText={(reason) => setEditState((state) => ({ ...state, reason }))}
        />
        <View style={styles.actions}>
          <AppButton label="Cancel" onPress={cancelEditing} variant="secondary" fullWidth />
          <AppButton label="Save" onPress={saveEdits} fullWidth />
          <AppButton label="Delete" onPress={deleteSession} variant="danger" fullWidth />
        </View>
      </AppSurface>
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
      <GoalButton
        label="Custom"
        selected={selectedGoalId === customGoalId}
        onPress={() => onSelect(customGoalId)}
      />
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

function NativeDateTimeField({
  label,
  value,
  fallbackDate,
  canClear = false,
  onChange,
}: {
  label: string;
  value: Date | null;
  fallbackDate?: Date;
  canClear?: boolean;
  onChange: (value: Date | null) => void;
}) {
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
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {canClear && value !== null && (
          <Pressable accessibilityRole="button" onPress={() => onChange(null)}>
            <ThemedText type="smallBold" themeColor="accent">
              Clear
            </ThemedText>
          </Pressable>
        )}
      </View>
      <DateTimePicker
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        value={pickerValue}
        maximumDate={new Date()}
        onChange={updateDate}
      />
      <DateTimePicker
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        value={pickerValue}
        maximumDate={new Date()}
        onChange={updateTime}
      />
      {value !== null && (
        <ThemedText type="small" themeColor="textSecondary">
          {formatLocaleDateTime(value.toISOString())}
        </ThemedText>
      )}
    </View>
  );
}

function EditField({
  label,
  value,
  placeholder,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
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
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
  },
  summary: {
    gap: Spacing.one,
  },
  duration: {
    textAlign: 'center',
  },
  editPanel: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  fieldHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
  pressed: {
    opacity: 0.72,
  },
});
