import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  deleteFastingGoal,
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

  const deleteGoal = (): void => {
    if (existingGoal === null || existingGoal === undefined) return;

    Alert.alert(
      t('goals.deleteTitle'),
      t('goals.deleteMessage', { name: existingGoal.name }),
      [
        { text: t('goals.cancelAction'), style: 'cancel' },
        {
          text: t('goals.deleteAction'),
          style: 'destructive',
          onPress: () => {
            try {
              if (!deleteFastingGoal(existingGoal.id)) {
                Alert.alert(t('goals.deleteFailedTitle'), t('goals.deleteRequiredMessage'));
                return;
              }
            } catch {
              Alert.alert(t('goals.deleteFailedTitle'), t('goals.deleteFailedMessage'));
              return;
            }

            router.back();
          },
        },
      ],
    );
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
          <View style={styles.header}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              {t('goals.editorTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              {t('goals.editorDescription')}
            </ThemedText>
          </View>

          <AppSurface padded={false} style={styles.formCard}>
            <View style={styles.cardRow}>
              <View style={styles.rowHeader}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('goals.nameLabel')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.characterCount}>
                  {t('common.characterCount', {
                    count: draft.name.length,
                    max: goalNameMaxLength,
                  })}
                </ThemedText>
              </View>
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
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                    color: theme.text,
                  },
                ]}
              />
            </View>

            <View style={styles.cardRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('goals.durationLabel')}
              </ThemedText>
              <DurationPicker
                value={draft.targetDurationHours}
                onChange={(targetDurationHours) =>
                  setDraft((current) => ({ ...current, targetDurationHours }))
                }
              />
            </View>
          </AppSurface>

          <View style={styles.actions}>
            {isEditing ? (
              <AppButton
                label={t('goals.deleteEditorAction')}
                variant="dangerGhost"
                fullWidth
                onPress={deleteGoal}
              />
            ) : (
              <AppButton
                label={t('goals.cancelAction')}
                variant="neutralGhost"
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
            )}
            <AppButton label={t('goals.saveAction')} fullWidth onPress={saveDraft} />
          </View>
        </View>
      </GoalEditorShell>
    </>
  );
}

function GoalEditorShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const screenStyle = [
    styles.screen,
    Platform.OS === 'android' ? { paddingTop: insets.top + Spacing.six } : null,
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={screenStyle}>
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
  header: {
    gap: Spacing.one,
  },
  description: {
    maxWidth: 420,
  },
  formCard: {
    gap: Spacing.three,
    overflow: 'hidden',
    padding: Spacing.three,
  },
  cardRow: {
    gap: Spacing.one,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  sectionTitle: { textTransform: 'uppercase' },
  characterCount: { textAlign: 'right', fontVariant: ['tabular-nums'] },
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
