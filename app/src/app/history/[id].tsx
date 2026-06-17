import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control';

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
  updateFastSession,
  useHistoryState,
} from '@/storage/fasting-storage';
import { type FastSession } from '@/storage/app-storage';
import { useSettings } from '@/storage/settings-storage';

type EditState = {
  startedAt: string;
  endedAt: string;
  goalDurationHours: string;
  reason: string;
};

const toDateTimeInputValue = (timestamp: string | null): string => {
  if (timestamp === null) {
    return '';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetMilliseconds = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offsetMilliseconds).toISOString().slice(0, 16);
};

const fromDateTimeInputValue = (value: string): string | null => {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return null;
  }

  const date = new Date(trimmedValue);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const createEditState = (session: FastSession): EditState => ({
  startedAt: toDateTimeInputValue(session.startedAt),
  endedAt: toDateTimeInputValue(session.endedAt),
  goalDurationHours: `${session.goalDurationHours}`,
  reason: session.reason ?? '',
});

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useHistoryState();
  const session = typeof id === 'string' ? getFastSession(id) : undefined;

  if (session === undefined) {
    return (
      <ScreenScaffold title="Fast Details" eyebrow="History">
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
    <ScreenScaffold title="Fast Details" eyebrow="History">
      <DetailContent session={session} />
    </ScreenScaffold>
  );
}

function DetailContent({ session }: { session: FastSession }) {
  const settings = useSettings();
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<EditState>(() => createEditState(session));
  const [editError, setEditError] = useState<string | null>(null);
  const endedAt = session.endedAt === null ? Date.now() : new Date(session.endedAt).getTime();
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt - new Date(session.startedAt).getTime()) / 1000),
  );

  useEffect(() => {
    setEditState(createEditState(session));
    setEditError(null);
  }, [session]);

  const deleteSession = (): void => {
    Alert.alert('Delete fast?', 'This removes the session from local history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteFastSession(session.id);
          router.replace('/history');
        },
      },
    ]);
  };
  const cancelEditing = (): void => {
    setEditState(createEditState(session));
    setEditError(null);
    setIsEditing(false);
  };
  const saveEdits = (): void => {
    const startedAt = fromDateTimeInputValue(editState.startedAt);
    const endedAt = fromDateTimeInputValue(editState.endedAt);
    const goalDurationHours = Number(editState.goalDurationHours);

    if (startedAt === null) {
      setEditError('Start time is required.');
      return;
    }

    if (!Number.isFinite(goalDurationHours) || goalDurationHours <= 0) {
      setEditError('Goal must be a positive number of hours.');
      return;
    }

    if (endedAt !== null && new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      setEditError('End time must be after start time.');
      return;
    }

    const updatedSession = updateFastSession({
      sessionId: session.id,
      update: (currentSession) => ({
        ...currentSession,
        startedAt,
        endedAt,
        goalDurationHours,
        reason: editState.reason.trim() === '' ? null : editState.reason.trim(),
      }),
    });

    if (updatedSession === undefined) {
      setEditError('This fast could not be found in local history.');
      return;
    }

    setIsEditing(false);
    setEditError(null);
  };
  const goalOptions = settings.goals.map((goal) => ({
    label: goal.name,
    value: `${goal.targetDurationHours}`,
  }));
  const selectedGoalIndex = Math.max(
    0,
    goalOptions.findIndex((goal) => goal.value === editState.goalDurationHours),
  );

  return (
    <View style={styles.content}>
      <View style={styles.summary}>
        <ThemedText type="title" style={styles.duration}>
          {formatDuration(durationSeconds)}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {session.goalDurationHours} hour goal · {session.status}
        </ThemedText>
      </View>

      <DetailRow label="Started" value={new Date(session.startedAt).toLocaleString()} />
      <DetailRow
        label="Ended"
        value={session.endedAt === null ? 'Not ended' : new Date(session.endedAt).toLocaleString()}
      />
      <DetailRow label="Goal" value={`${session.goalDurationHours} hours`} />
      <DetailRow label="Reason" value={session.reason ?? 'None'} />
      <DetailRow label="Created" value={new Date(session.createdAt).toLocaleString()} />
      <DetailRow label="Updated" value={new Date(session.updatedAt).toLocaleString()} />

      {isEditing && (
        <AppSurface style={styles.editPanel}>
          <ThemedText type="smallBold">Edit fast</ThemedText>
          {editError !== null && (
            <FeedbackState
              kind="error"
              title="Could not save changes"
              description={editError}
              action={{ label: 'Dismiss', onPress: () => setEditError(null) }}
            />
          )}
          <EditField
            label="Started"
            value={editState.startedAt}
            placeholder="YYYY-MM-DDTHH:mm"
            onChangeText={(startedAt) => setEditState((state) => ({ ...state, startedAt }))}
          />
          <EditField
            label="Ended"
            value={editState.endedAt}
            placeholder="Leave empty if not ended"
            onChangeText={(endedAt) => setEditState((state) => ({ ...state, endedAt }))}
          />
          <View style={styles.field}>
            <ThemedText type="smallBold">Goal</ThemedText>
            <ExpoSegmentedControl
              values={goalOptions.map((goal) => goal.label)}
              selectedIndex={selectedGoalIndex}
              onValueChange={(label) => {
                const goal = goalOptions.find((option) => option.label === label);

                if (goal !== undefined) {
                  setEditState((state) => ({
                    ...state,
                    goalDurationHours: goal.value,
                  }));
                }
              }}
              tintColor={theme.accent}
              style={styles.segmentedControl}
            />
          </View>
          <EditField
            label="Reason"
            value={editState.reason}
            placeholder="Optional"
            onChangeText={(reason) => setEditState((state) => ({ ...state, reason }))}
          />
          <View style={styles.actions}>
            <AppButton label="Cancel" onPress={cancelEditing} variant="secondary" fullWidth />
            <AppButton label="Save" onPress={saveEdits} fullWidth />
          </View>
        </AppSurface>
      )}

      <View style={styles.actions}>
        {!isEditing && <AppButton label="Edit" onPress={() => setIsEditing(true)} fullWidth />}
        <AppButton label="Back" onPress={() => router.back()} variant="secondary" fullWidth />
        <AppButton label="Delete" onPress={deleteSession} variant="danger" fullWidth />
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <AppSurface style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </AppSurface>
  );
}

function EditField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder?: string;
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
  row: {
    gap: Spacing.one,
  },
  editPanel: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
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
  segmentedControl: {
    minHeight: 36,
  },
});
