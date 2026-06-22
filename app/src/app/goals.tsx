import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

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
  moveFastingGoal,
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
  const insets = useSafeAreaInsets();
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
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screen}>
        <View style={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          Drag to reorder. Swipe left to delete custom goals.
        </ThemedText>
        <View style={styles.goalList}>
          {settings.goals.map((goal, index) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              index={index}
              onDelete={() => confirmDelete(goal)}
              onEdit={() => {
                setDraft(createGoalDraft(goal));
                setValidationError(null);
              }}
              onMove={(destinationIndex) => moveFastingGoal(goal.id, destinationIndex)}
            />
          ))}
        </View>

        {draft !== null ? (
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
                variant="ghost"
                fullWidth
                onPress={() => {
                  setDraft(null);
                  setValidationError(null);
                }}
              />
              <AppButton label="Save goal" fullWidth onPress={saveDraft} />
            </View>
          </AppSurface>
        ) : null}
        </View>
      </ScrollView>
      {draft === null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add goal"
          onPress={() => {
            setDraft(createEmptyDraft(settings.goals));
            setValidationError(null);
          }}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.accent, bottom: insets.bottom + Spacing.three },
            pressed && styles.pressed,
          ]}>
          <Plus size={26} color={theme.accentForeground} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

function GoalRow({
  goal,
  index,
  onDelete,
  onEdit,
  onMove,
}: {
  goal: FastingGoal;
  index: number;
  onDelete: () => void;
  onEdit: () => void;
  onMove: (destinationIndex: number) => void;
}) {
  const theme = useTheme();
  const translateY = useSharedValue(0);
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(120)
    .onUpdate(({ translationY }) => {
      translateY.value = translationY;
    })
    .onEnd(({ translationY }) => {
      const rowOffset = Math.round(translationY / 84);
      if (rowOffset !== 0) runOnJS(onMove)(index + rowOffset);
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: translateY.value === 0 ? 0 : 2,
  }));
  const isCustom = goal.type === FastingGoalType.Custom;
  const content = (
    <AppSurface style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <GestureDetector gesture={dragGesture}>
          <Animated.View
            accessibilityRole="adjustable"
            accessibilityLabel={`Reorder ${goal.name}`}
            style={styles.dragHandle}>
            <GripVertical size={20} color={theme.textSecondary} />
          </Animated.View>
        </GestureDetector>
        <Pressable
          accessibilityRole={isCustom ? 'button' : undefined}
          accessibilityLabel={isCustom ? `Edit ${goal.name}` : undefined}
          disabled={!isCustom}
          onPress={onEdit}
          style={({ pressed }) => [styles.goalText, pressed && styles.pressed]}>
          <View style={styles.goalNameRow}>
            <ThemedText type="smallBold" selectable>
              {goal.name}
            </ThemedText>
            <View style={[styles.typeBadge, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {isCustom ? 'Custom' : 'Standard'}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary" selectable>
            {formatGoalDuration(goal.targetDurationHours)}
          </ThemedText>
        </Pressable>
        <Switch
          accessibilityLabel={`${goal.name} available on Fast screen`}
          value={goal.isEnabled}
          onValueChange={(isEnabled) => {
            if (!setFastingGoalEnabled(goal.id, isEnabled)) {
              Alert.alert('Goal required', 'At least one fasting goal must stay enabled.');
            }
          }}
          trackColor={{ true: theme.accent }}
        />
        {isCustom ? <ChevronRight size={18} color={theme.textSecondary} /> : null}
      </View>
    </AppSurface>
  );

  return (
    <Animated.View style={animatedStyle}>
      {isCustom ? (
        <ReanimatedSwipeable
          friction={2}
          overshootRight={false}
          renderRightActions={() => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${goal.name}`}
              onPress={onDelete}
              style={[styles.deleteAction, { backgroundColor: theme.danger }]}>
              <Trash2 size={20} color={theme.dangerForeground} />
              <ThemedText type="smallBold" style={{ color: theme.dangerForeground }}>
                Delete
              </ThemedText>
            </Pressable>
          )}>
          {content}
        </ReanimatedSwipeable>
      ) : (
        content
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.six,
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
    padding: 12,
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
  dragHandle: {
    width: 28,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
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
  deleteAction: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
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
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.22)',
  },
  pressed: { opacity: 0.72 },
});
