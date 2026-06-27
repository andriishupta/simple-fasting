import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { AppSurface } from '@/components/app-surface';
import { DraggableListRow } from '@/components/draggable-list-row';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FastingGoalType, type FastingGoal } from '@/storage/app-storage';
import {
  deleteFastingGoal,
  moveFastingGoal,
  setFastingGoalEnabled,
  useSettings,
} from '@/storage/settings-storage';
import { formatGoalDuration } from '@/utils/fast-goals';

const goalRowHeight = 84;

export default function GoalsScreen() {
  const settings = useSettings();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);

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
                itemCount={settings.goals.length}
                isDragging={draggingGoalId === goal.id}
                onDelete={() => confirmDelete(goal)}
                onDragEnd={() => setDraggingGoalId(null)}
                onDragStart={() => setDraggingGoalId(goal.id)}
                onEdit={() => {
                  router.push({ pathname: '/goals/[id]', params: { id: goal.id } });
                }}
                onMove={(destinationIndex) => moveFastingGoal(goal.id, destinationIndex)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add goal"
        onPress={() => router.push('/goals/new')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, bottom: insets.bottom + Spacing.three },
          pressed && styles.pressed,
        ]}>
        <Plus size={26} color={theme.accentForeground} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function GoalRow({
  goal,
  index,
  itemCount,
  isDragging,
  onDelete,
  onDragEnd,
  onDragStart,
  onEdit,
  onMove,
}: {
  goal: FastingGoal;
  index: number;
  itemCount: number;
  isDragging: boolean;
  onDelete: () => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onEdit: () => void;
  onMove: (destinationIndex: number) => void;
}) {
  const theme = useTheme();
  const settings = useSettings();
  const isCustom = goal.type === FastingGoalType.Custom;
  const dragHandle = (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Reorder ${goal.name}`}
      style={styles.dragHandle}>
      <GripVertical size={20} color={theme.textSecondary} />
    </View>
  );
  const renderContent = (wrappedDragHandle: ReactNode) => (
    <AppSurface style={[styles.goalCard, isDragging && styles.goalCardDragging]}>
      <View style={styles.goalHeader}>
        {wrappedDragHandle}
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
            {formatGoalDuration(goal.targetDurationHours, settings.goalDurationFormat)}
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
    <DraggableListRow
      dragHandle={dragHandle}
      index={index}
      itemCount={itemCount}
      rowHeight={goalRowHeight}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      onMove={onMove}>
      {(wrappedDragHandle) => (
        isCustom ? (
          <ReanimatedSwipeable
            containerStyle={styles.swipeable}
            childrenContainerStyle={styles.swipeableChildren}
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
            {renderContent(wrappedDragHandle)}
          </ReanimatedSwipeable>
        ) : (
          renderContent(wrappedDragHandle)
        )
      )}
    </DraggableListRow>
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
  goalCardDragging: {
    borderWidth: 2,
    boxShadow: '0 8px 18px rgba(0, 0, 0, 0.16)',
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
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  swipeable: { borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  swipeableChildren: { borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
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
