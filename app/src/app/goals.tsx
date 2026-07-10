import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, GripVertical, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSurface } from '@/components/app-surface';
import { DraggableListRow } from '@/components/draggable-list-row';
import { ThemedText } from '@/components/themed-text';
import { TruncatedText } from '@/components/truncated-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';
import { FastingGoalType, type FastingGoal } from '@/storage/app-storage';
import {
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
  const screenStyle = [
    styles.screen,
    Platform.OS === 'android' ? { paddingTop: insets.top + Spacing.six } : null,
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={screenStyle}>
        <View style={styles.content}>
          <View style={styles.sectionHeading}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              {t('goals.listTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('goals.listDescription')}
            </ThemedText>
          </View>
          <View style={styles.goalList}>
            {settings.goals.map((goal, index) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                index={index}
                itemCount={settings.goals.length}
                isDragging={draggingGoalId === goal.id}
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
        accessibilityLabel={t('goals.addAccessibilityLabel')}
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
  onDragEnd,
  onDragStart,
  onEdit,
  onMove,
}: {
  goal: FastingGoal;
  index: number;
  itemCount: number;
  isDragging: boolean;
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
      accessibilityLabel={t('goals.reorderAccessibilityLabel', { name: goal.name })}
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
          accessibilityLabel={isCustom ? t('goals.editAccessibilityLabel', { name: goal.name }) : undefined}
          disabled={!isCustom}
          onPress={onEdit}
          style={({ pressed }) => [styles.goalText, pressed && styles.pressed]}>
          <View style={styles.goalNameRow}>
            <TruncatedText value={goal.name} type="smallBold" selectable style={styles.goalName} />
            <View style={[styles.typeBadge, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {isCustom ? t('goals.customBadge') : t('goals.standardBadge')}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary" selectable>
            {formatGoalDuration(goal.targetDurationHours, settings.goalDurationFormat)}
          </ThemedText>
        </Pressable>
        <View style={styles.goalActionColumn}>
          <Switch
            accessibilityLabel={t('goals.availableAccessibilityLabel', { name: goal.name })}
            value={goal.isEnabled}
            onValueChange={(isEnabled) => {
              setFastingGoalEnabled(goal.id, isEnabled);
            }}
            trackColor={{ true: theme.accent }}
          />
          {isCustom ? <ChevronRight size={18} color={theme.textSecondary} /> : null}
        </View>
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
      {(wrappedDragHandle) => renderContent(wrappedDragHandle)}
    </DraggableListRow>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.huge,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 640),
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  sectionHeading: { gap: Spacing.xxxs },
  sectionTitle: { textTransform: 'uppercase' },
  goalList: {
    gap: Spacing.xs,
  },
  goalCard: {
    padding: Spacing.sm,
  },
  goalCardDragging: {
    borderWidth: 2,
    boxShadow: '0 8px 18px rgba(0, 0, 0, 0.16)',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  goalText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  goalActionColumn: {
    minWidth: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
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
    gap: Spacing.xs,
  },
  goalName: {
    maxWidth: '100%',
    flexShrink: 1,
  },
  typeBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.half,
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.22)',
  },
  pressed: { opacity: 0.72 },
});
