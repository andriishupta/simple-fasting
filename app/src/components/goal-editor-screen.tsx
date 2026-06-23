import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppSurface } from '@/components/app-surface';
import { FeedbackState } from '@/components/feedback-state';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FastingGoalType, type FastingGoal } from '@/storage/app-storage';
import {
  createFastingGoal,
  updateFastingGoal,
  useSettings,
} from '@/storage/settings-storage';

type GoalDraft = {
  name: string;
  targetDurationHours: string;
};

const maxGoalDurationHours = 40 * 24;

const createEmptyDraft = (goals: readonly FastingGoal[]): GoalDraft => ({
  name: '',
  targetDurationHours: `${
    [16, 18, 20, 24, 12, 14].find(
      (duration) => !goals.some((goal) => goal.targetDurationHours === duration),
    ) ??
    (goals.length === 0
      ? 16
      : Math.min(
          maxGoalDurationHours,
          Math.max(...goals.map((goal) => goal.targetDurationHours)) + 1,
        ))
  }`,
});

const createGoalDraft = (goal: FastingGoal): GoalDraft => ({
  name: goal.name,
  targetDurationHours: `${goal.targetDurationHours}`,
});

export function GoalEditorScreen({ goalId }: { goalId: string | null }) {
  const settings = useSettings();
  const theme = useTheme();
  const existingGoal = useMemo(
    () => (goalId === null ? null : settings.goals.find((goal) => goal.id === goalId)),
    [goalId, settings.goals],
  );
  const [draft, setDraft] = useState<GoalDraft>(() =>
    existingGoal === null || existingGoal === undefined
      ? createEmptyDraft(settings.goals)
      : createGoalDraft(existingGoal),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const isEditing = goalId !== null;

  const saveDraft = (): void => {
    const name = draft.name.trim();
    const targetDurationHours = Number(draft.targetDurationHours);

    if (name.length === 0) {
      setValidationError('Enter a name for this goal.');
      return;
    }

    if (name.length > 60) {
      setValidationError('Goal names can be up to 60 characters.');
      return;
    }

    if (
      !Number.isInteger(targetDurationHours) ||
      targetDurationHours < 1 ||
      targetDurationHours > maxGoalDurationHours
    ) {
      setValidationError('Choose a whole number from 1 hour to 40 days.');
      return;
    }

    const duplicateDuration = settings.goals.some(
      (goal) => goal.id !== goalId && goal.targetDurationHours === targetDurationHours,
    );

    if (duplicateDuration) {
      setValidationError('A goal with this duration already exists.');
      return;
    }

    try {
      if (goalId === null) {
        createFastingGoal({ name, targetDurationHours });
      } else if (
        updateFastingGoal({
          goalId,
          name,
          targetDurationHours,
        }) === undefined
      ) {
        setValidationError('This goal no longer exists.');
        return;
      }
    } catch {
      setValidationError('This goal could not be saved. Your existing goals were not changed.');
      return;
    }

    setValidationError(null);
    router.back();
  };

  if (existingGoal?.type === FastingGoalType.Standard) {
    return (
      <>
        <Stack.Screen options={{ title: 'Goal' }} />
        <GoalEditorShell>
          <FeedbackState
            kind="empty"
            title="Standard goal"
            description="Standard goals can be reordered or disabled, but only custom goals can be edited."
            action={{ label: 'Back to Goals', onPress: () => router.back() }}
          />
        </GoalEditorShell>
      </>
    );
  }

  if (isEditing && existingGoal === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: 'Goal' }} />
        <GoalEditorShell>
          <FeedbackState
            kind="error"
            title="Goal not found"
            description="This custom goal no longer exists."
            action={{ label: 'Back to Goals', onPress: () => router.back() }}
          />
        </GoalEditorShell>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditing ? 'Edit Goal' : 'New Goal' }} />
      <GoalEditorShell>
        <AppSurface style={styles.editor}>
          <View style={styles.heading}>
            <ThemedText type="subtitle">{isEditing ? 'Edit goal' : 'New goal'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Custom goals appear on the Fast screen.
            </ThemedText>
          </View>

          {validationError !== null ? (
            <FeedbackState
              kind="error"
              title="Check this goal"
              description={validationError}
              action={{ label: 'Dismiss', onPress: () => setValidationError(null) }}
            />
          ) : null}

          <View style={styles.field}>
            <ThemedText type="smallBold">Name</ThemedText>
            <TextInput
              accessibilityLabel="Goal name"
              autoCapitalize="sentences"
              maxLength={60}
              value={draft.name}
              onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
              placeholder="For example, Weekday fast"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                },
              ]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">Duration in hours</ThemedText>
            <TextInput
              accessibilityLabel="Goal duration in hours"
              keyboardType="number-pad"
              maxLength={3}
              value={draft.targetDurationHours}
              onChangeText={(targetDurationHours) =>
                setDraft((current) => ({
                  ...current,
                  targetDurationHours: targetDurationHours.replaceAll(/\D/g, ''),
                }))
              }
              placeholder="16"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                },
              ]}
            />
          </View>

          <View style={styles.actions}>
            <AppButton
              label="Cancel"
              variant="ghost"
              fullWidth
              onPress={() => {
                if (draft.name.trim().length > 0 || draft.targetDurationHours.trim().length > 0) {
                  Alert.alert('Discard changes?', 'This goal will not be saved.', [
                    { text: 'Keep Editing', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => router.back() },
                  ]);
                  return;
                }

                router.back();
              }}
            />
            <AppButton label="Save goal" fullWidth onPress={saveDraft} />
          </View>
        </AppSurface>
      </GoalEditorShell>
    </>
  );
}

function GoalEditorShell({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screen}>
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 560),
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  editor: {
    gap: Spacing.three,
  },
  heading: {
    gap: Spacing.one,
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
});
