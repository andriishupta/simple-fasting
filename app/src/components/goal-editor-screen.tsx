import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { AppSurface } from '@/components/app-surface';
import { DurationPicker, maxCustomDurationHours } from '@/components/fast-setup-controls';
import { FeedbackState } from '@/components/feedback-state';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';
import { FastingGoalType, type FastingGoal } from '@/storage/app-storage';
import {
  createFastingGoal,
  updateFastingGoal,
  useSettings,
} from '@/storage/settings-storage';

type GoalDraft = {
  name: string;
  targetDurationHours: number;
};

const goalNameMaxLength = 32;

const createEmptyDraft = (goals: readonly FastingGoal[]): GoalDraft => ({
  name: '',
  targetDurationHours:
    [16, 18, 20, 24, 12, 14].find(
      (duration) => !goals.some((goal) => goal.targetDurationHours === duration),
    ) ??
    (goals.length === 0
      ? 16
      : Math.min(
          maxCustomDurationHours,
          Math.max(...goals.map((goal) => goal.targetDurationHours)) + 1,
        )),
});

const createGoalDraft = (goal: FastingGoal): GoalDraft => ({
  name: goal.name,
  targetDurationHours: Math.min(maxCustomDurationHours, Math.max(1, goal.targetDurationHours)),
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
  const isEditing = goalId !== null;
  const initialDraft = useMemo(
    () =>
      existingGoal === null || existingGoal === undefined
        ? createEmptyDraft(settings.goals)
        : createGoalDraft(existingGoal),
    [existingGoal, settings.goals],
  );
  const isDirty =
    draft.name !== initialDraft.name ||
    draft.targetDurationHours !== initialDraft.targetDurationHours;

  const showValidationError = (message: string): void => {
    Alert.alert(message);
  };

  const saveDraft = (): void => {
    const name = draft.name.trim();
    const targetDurationHours = draft.targetDurationHours;

    if (name.length === 0) {
      showValidationError(t('goals.validationNameRequired'));
      return;
    }

    if (name.length > goalNameMaxLength) {
      showValidationError(t('goals.validationNameLength'));
      return;
    }

    if (
      !Number.isInteger(targetDurationHours) ||
      targetDurationHours < 1 ||
      targetDurationHours > maxCustomDurationHours
    ) {
      showValidationError(t('goals.validationDuration'));
      return;
    }

    const duplicateDuration = settings.goals.some(
      (goal) => goal.id !== goalId && goal.targetDurationHours === targetDurationHours,
    );

    if (duplicateDuration) {
      showValidationError(t('goals.validationDuplicateDuration'));
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
        showValidationError(t('goals.validationMissingGoal'));
        return;
      }
    } catch {
      showValidationError(t('goals.validationSaveFailed'));
      return;
    }

    router.back();
  };

  if (existingGoal?.type === FastingGoalType.Standard) {
    return (
      <>
        <Stack.Screen options={{ title: t('goals.editorTitle') }} />
        <GoalEditorShell>
          <FeedbackState
            kind="empty"
            title={t('goals.standardTitle')}
            description={t('goals.standardDescription')}
            action={{ label: t('goals.backAction'), onPress: () => router.back() }}
          />
        </GoalEditorShell>
      </>
    );
  }

  if (isEditing && existingGoal === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: t('goals.editorTitle') }} />
        <GoalEditorShell>
          <FeedbackState
            kind="error"
            title={t('goals.notFoundTitle')}
            description={t('goals.notFoundDescription')}
            action={{ label: t('goals.backAction'), onPress: () => router.back() }}
          />
        </GoalEditorShell>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditing ? t('goals.editTitle') : t('goals.newTitle') }} />
      <GoalEditorShell>
        <View style={styles.editor}>
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              {t('goals.nameLabel')}
            </ThemedText>
            <TextInput
              accessibilityLabel={t('goals.nameAccessibilityLabel')}
              autoCapitalize="sentences"
              maxLength={goalNameMaxLength}
              value={draft.name}
              onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
              placeholder={t('goals.namePlaceholder')}
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
            <ThemedText type="small" themeColor="textSecondary" style={styles.characterCount}>
              {t('common.characterCount', {
                count: draft.name.length,
                max: goalNameMaxLength,
              })}
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              {t('goals.durationLabel')}
            </ThemedText>
            <AppSurface padded={false} style={styles.durationCard}>
              <DurationPicker
                value={draft.targetDurationHours}
                onChange={(targetDurationHours) =>
                  setDraft((current) => ({ ...current, targetDurationHours }))
                }
              />
            </AppSurface>
          </View>

          <View style={styles.actions}>
            <AppButton
              label={t('goals.cancelAction')}
              variant="dangerGhost"
              fullWidth
              onPress={() => {
                if (isDirty) {
                  Alert.alert(t('goals.discardTitle'), t('goals.discardMessage'), [
                    { text: t('goals.keepEditingAction'), style: 'cancel' },
                    { text: t('goals.discardAction'), style: 'destructive', onPress: () => router.back() },
                  ]);
                  return;
                }

                router.back();
              }}
            />
            <AppButton label={t('goals.saveAction')} fullWidth onPress={saveDraft} />
          </View>
        </View>
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
  field: {
    gap: Spacing.one,
  },
  sectionLabel: { paddingHorizontal: Spacing.two, textTransform: 'uppercase' },
  characterCount: { paddingHorizontal: Spacing.two, textAlign: 'right', fontVariant: ['tabular-nums'] },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  durationCard: {
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
