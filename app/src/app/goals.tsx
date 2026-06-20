import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppSurface } from '@/components/app-surface';
import { FeedbackState } from '@/components/feedback-state';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FastingGoalType, type FastingGoal } from '@/storage/app-storage';
import {
  createFastingGoal,
  deleteFastingGoal,
  setFastingGoalEnabled,
  updateFastingGoal,
  useSettings,
} from '@/storage/settings-storage';

type GoalDraft = {
  goalId: string | null;
  name: string;
  targetDurationHours: string;
};

const maxGoalDurationHours = 40 * 24;

const createEmptyDraft = (goals: readonly FastingGoal[]): GoalDraft => ({
  goalId: null,
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
  goalId: goal.id,
  name: goal.name,
  targetDurationHours: `${goal.targetDurationHours}`,
});

const formatGoalDuration = (hours: number): string => {
  if (hours < 24) return `${hours} hours`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours === 0 ? `${days} days` : `${days}d ${remainingHours}h`;
};

export default function GoalsScreen() {
  const settings = useSettings();
  const theme = useTheme();
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const saveDraft = (): void => {
    if (draft === null) return;

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
      (goal) =>
        goal.id !== draft.goalId && goal.targetDurationHours === targetDurationHours,
    );

    if (duplicateDuration) {
      setValidationError('A goal with this duration already exists.');
      return;
    }

    try {
      if (draft.goalId === null) {
        createFastingGoal({ name, targetDurationHours });
      } else if (
        updateFastingGoal({
          goalId: draft.goalId,
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

    setDraft(null);
    setValidationError(null);
  };

  const confirmDelete = (goal: FastingGoal): void => {
    if (goal.type === FastingGoalType.Standard) return;

    Alert.alert(
      'Delete goal?',
      `Remove “${goal.name}”? Existing fasting history will keep its recorded duration.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              if (!deleteFastingGoal(goal.id)) {
                Alert.alert('Goal not deleted', 'At least one fasting goal is required.');
                return;
              }

              if (draft?.goalId === goal.id) {
                setDraft(null);
                setValidationError(null);
              }
            } catch {
              Alert.alert('Goal not deleted', 'Your saved goals were not changed.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screen}>
      <View style={styles.content}>
        <ThemedText themeColor="textSecondary">
          Standard goals can be shown or hidden. Custom goals can be edited or deleted.
        </ThemedText>

        <View style={styles.goalList}>
          {settings.goals.map((goal) => (
            <AppSurface key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={styles.goalText}>
                  <View style={styles.goalNameRow}>
                    <ThemedText type="smallBold" selectable>
                      {goal.name}
                    </ThemedText>
                    <View style={[styles.typeBadge, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {goal.type === FastingGoalType.Standard ? 'Standard' : 'Custom'}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" selectable>
                    {formatGoalDuration(goal.targetDurationHours)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.actions}>
                {goal.type === FastingGoalType.Standard ? (
                  <View style={styles.visibilityControl}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Show on Fast screen
                    </ThemedText>
                    <Switch
                      accessibilityLabel={`Show ${goal.name} on Fast screen`}
                      value={goal.isEnabled}
                      onValueChange={(isEnabled) => {
                        if (!setFastingGoalEnabled(goal.id, isEnabled)) {
                          Alert.alert('Goal required', 'At least one fasting goal must stay enabled.');
                        }
                      }}
                      trackColor={{ true: theme.accent }}
                    />
                  </View>
                ) : null}
                {goal.type === FastingGoalType.Custom ? (
                  <>
                    <AppButton
                      label="Edit"
                      variant="secondary"
                      onPress={() => {
                        setDraft(createGoalDraft(goal));
                        setValidationError(null);
                      }}
                    />
                    <AppButton label="Delete" variant="danger" onPress={() => confirmDelete(goal)} />
                  </>
                ) : null}
              </View>
            </AppSurface>
          ))}
        </View>

        {draft === null ? (
          <AppButton
            label="Add goal"
            style={styles.fullButton}
            onPress={() => {
              setDraft(createEmptyDraft(settings.goals));
              setValidationError(null);
            }}
          />
        ) : (
          <AppSurface style={styles.editor}>
            <ThemedText type="subtitle">
              {draft.goalId === null ? 'New goal' : 'Edit goal'}
            </ThemedText>

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
                onChangeText={(name) => setDraft((current) => current && { ...current, name })}
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
                  setDraft(
                    (current) =>
                      current && {
                        ...current,
                        targetDurationHours: targetDurationHours.replaceAll(/\D/g, ''),
                      },
                  )
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
                variant="secondary"
                fullWidth
                onPress={() => {
                  setDraft(null);
                  setValidationError(null);
                }}
              />
              <AppButton label="Save goal" fullWidth onPress={saveDraft} />
            </View>
          </AppSurface>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 640),
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  goalList: {
    gap: Spacing.two,
  },
  goalCard: {
    gap: Spacing.three,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  goalText: {
    flex: 1,
    gap: Spacing.one,
  },
  goalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  visibilityControl: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editor: {
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
  fullButton: {
    width: '100%',
  },
});
