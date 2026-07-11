import { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { NativeDateTimeField } from '@/components/native-date-time-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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

const createEditState = (session: FastSession): EditState => ({
  startedAt: toDateValue(session.startedAt),
  endedAt: toDateValue(session.endedAt),
  goalDurationHours: `${session.goalDurationHours}`,
  reason: session.reason ?? '',
});

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  useHistoryState();
  const session = typeof id === 'string' ? getFastSession(id) : undefined;
  const screenStyle = [
    styles.screen,
    Platform.OS === 'android' ? { paddingTop: insets.top + Spacing.six } : null,
  ];

  if (session === undefined) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={screenStyle}>
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
      contentContainerStyle={screenStyle}>
      <DetailContent session={session} />
    </ScrollView>
  );
}

function DetailContent({ session }: { session: FastSession }) {
  const settings = useSettings();
  const enabledGoals = settings.goals.filter((goal) => goal.isEnabled);
  const [editState, setEditState] = useState<EditState>(() => createEditState(session));
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
  const showValidationError = (message: string): void => {
    Alert.alert(message);
  };

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
      showValidationError(t('historyEdit.startRequired'));
      return;
    }

    if (startedAt.getTime() > currentTime) {
      showValidationError(t('historyEdit.startFuture'));
      return;
    }

    if (endedAt === null) {
      showValidationError(t('historyEdit.endRequired'));
      return;
    }

    if (endedAt.getTime() > currentTime) {
      showValidationError(t('historyEdit.endFuture'));
      return;
    }

    if (selectedGoalId === customGoalId && goalDurationText === '') {
      showValidationError(t('historyEdit.goalRequired'));
      return;
    }

    if (!Number.isInteger(goalDurationHours) || goalDurationHours < 0) {
      showValidationError(t('historyEdit.goalRequired'));
      return;
    }

    if (goalDurationHours > maxCustomDurationHours) {
      showValidationError(t('historyEdit.goalMax'));
      return;
    }

    if (endedAt.getTime() <= startedAt.getTime()) {
      showValidationError(t('historyEdit.dateInvalidMessage'));
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
      showValidationError(t('historyEdit.overlapMessage'));
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
      showValidationError(t('historyEdit.missingSaveTarget'));
      return;
    }

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

      <FastingSummaryCard
        duration={formatDuration(editedDurationSeconds, settings.goalDurationFormat)}
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
