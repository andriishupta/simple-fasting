import { useMemo } from 'react';
import { Picker } from '@expo/ui/community/picker';
import {
  Check,
  ChevronRight,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  SquarePen,
} from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  unstable_batchedUpdates,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { CenteredWheelPicker } from '@/components/centered-wheel-picker';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsSelector } from '@/storage/settings-storage';
import {
  customGoalId,
  formatGoalDuration,
  maxCustomDurationHours,
  unlimitedGoalId,
} from '@/utils/fast-goals';

export {
  customGoalId,
  formatGoalDuration,
  getGoalSelectionId,
  maxCustomDurationHours,
  unlimitedGoalId,
} from '@/utils/fast-goals';

type GoalOption = {
  id: string;
  name: string;
  targetDurationHours: number;
};

const durationDays = Array.from({ length: 8 }, (_, day) => day);
const durationHours = Array.from({ length: 24 }, (_, hour) => hour);
const durationHoursWithoutZero = durationHours.slice(1);
const goalCardWidth = 108;

export function FastGoalSelector({
  goals,
  selectedGoalId,
  customDurationHours,
  customDurationExpanded,
  onSelectGoal,
  onCustomDurationChange,
  onCustomDurationExpandedChange,
}: {
  goals: readonly GoalOption[];
  selectedGoalId: string;
  customDurationHours: number;
  customDurationExpanded: boolean;
  onSelectGoal: (goalId: string) => void;
  onCustomDurationChange: (hours: number) => void;
  onCustomDurationExpandedChange: (expanded: boolean) => void;
}) {
  const theme = useTheme();
  const goalDurationFormat = useSettingsSelector((settings) => settings.goalDurationFormat);
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
  const selectedGoalIndex = goals.findIndex((goal) => goal.id === selectedGoalId);
  const selectedDuration =
    selectedGoalId === unlimitedGoalId
      ? 0
      : selectedGoalId === customGoalId
        ? customDurationHours
        : (selectedGoal?.targetDurationHours ?? customDurationHours);
  const selectedGoalName =
    selectedGoalId === unlimitedGoalId
      ? 'Open-ended'
      : selectedGoalId === customGoalId
        ? 'Custom'
        : (selectedGoal?.name ?? 'Fasting Goal');

  return (
    <View style={styles.goalSelector}>
      <View style={styles.hero}>
        <ThemedText
          selectable
          style={styles.goalHeroName}>
          {selectedGoalName}
        </ThemedText>
        <ThemedText
          selectable
          type="subtitle"
          themeColor="textSecondary"
          style={styles.goalHeroDuration}>
          {selectedDuration === 0
            ? 'No time limit'
            : formatGoalDuration(selectedDuration, goalDurationFormat)}
        </ThemedText>
      </View>

      <CenteredWheelPicker
        accessibilityLabel="Fasting goals"
        itemWidth={goalCardWidth}
        itemGap={Spacing.two}
        items={goals}
        keyExtractor={(goal) => goal.id}
        getItemAccessibilityLabel={(goal) =>
          `${goal.name}, ${formatGoalDuration(goal.targetDurationHours, goalDurationFormat)}`
        }
        selectOnScroll={false}
        selectedIndex={selectedGoalIndex}
        onSelectIndex={(index) => {
          const goal = goals[index];
          if (goal !== undefined) onSelectGoal(goal.id);
        }}
        renderItem={(goal, { selected }) => (
          <GoalCard
            name={goal.name}
            durationLabel={formatGoalDuration(goal.targetDurationHours, goalDurationFormat)}
            selected={selected}
          />
        )}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.goalPickerHint}>
        Create reusable goals in Settings.
      </ThemedText>

      <View
        style={[
          styles.options,
          { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
        ]}>
        <View style={styles.optionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select custom duration"
            accessibilityState={{ selected: selectedGoalId === customGoalId }}
            accessibilityHint="Uses a one-time fasting duration without selecting a saved goal"
            onPress={() => {
              onSelectGoal(customGoalId);
            }}
            style={({ pressed }) => [styles.optionPrimary, pressed && styles.pressed]}>
            <OptionIcon icon="custom" />
            <View style={styles.optionLabel}>
              <ThemedText>Custom</ThemedText>
            </View>
            {selectedGoalId === customGoalId ? (
              <Check size={16} color={theme.accent} strokeWidth={2.5} />
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit custom duration, currently ${formatGoalDuration(customDurationHours, goalDurationFormat)}`}
            accessibilityHint="Shows or hides the custom duration picker"
            onPress={() => {
              unstable_batchedUpdates(() => {
                onSelectGoal(customGoalId);
                onCustomDurationExpandedChange(!customDurationExpanded);
              });
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.optionEdit, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatGoalDuration(customDurationHours, goalDurationFormat)}
            </ThemedText>
            <ChevronRight size={16} color={theme.textSecondary} />
          </Pressable>
        </View>

        {customDurationExpanded ? (
          <View>
            <DurationPicker value={customDurationHours} onChange={onCustomDurationChange} />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedGoalId === unlimitedGoalId }}
          accessibilityLabel="Select open-ended fast"
          accessibilityHint="Starts a fast without a planned end time"
          onPress={() => onSelectGoal(unlimitedGoalId)}
          style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
          <OptionIcon icon="unlimited" />
          <ThemedText style={styles.optionLabel}>Open-ended</ThemedText>
          <View style={styles.optionCheck}>
            {selectedGoalId === unlimitedGoalId ? (
              <Check size={16} color={theme.accent} strokeWidth={2.5} />
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function GoalCard({
  name,
  durationLabel,
  selected,
}: {
  name: string;
  durationLabel: string;
  selected: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.goalCard,
        {
          backgroundColor: selected ? theme.accentBackground : theme.background,
          borderColor: selected ? theme.accent : theme.backgroundSelected,
        },
      ]}>
      <ThemedText type="smallBold" style={styles.goalCardName} numberOfLines={1}>
        {name}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor={selected ? 'accent' : 'textSecondary'}
        style={styles.goalCardDuration}>
        {durationLabel}
      </ThemedText>
    </View>
  );
}

export function FastNoteEditor({
  enabled,
  value,
  onEnabledChange,
  onChangeText,
}: {
  enabled: boolean;
  value: string;
  onEnabledChange: (enabled: boolean) => void;
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.options,
        { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
      ]}>
        <View style={styles.optionRow}>
          <OptionIcon icon="note" />
          <View style={styles.optionLabel}>
            <ThemedText>Note</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Optional
            </ThemedText>
          </View>
          <View style={styles.switchWrap}>
            <Switch
              accessibilityLabel="Note"
              accessibilityHint="Adds an optional note to this fast"
              value={enabled}
              onValueChange={onEnabledChange}
              trackColor={{ true: theme.accent }}
            />
          </View>
        </View>
      {enabled ? (
        <Animated.View
          entering={FadeInDown.duration(180)}
          exiting={FadeOutUp.duration(140)}
          layout={LinearTransition.duration(180)}
          style={styles.noteInputWrap}>
          <TextInput
            accessibilityLabel="Fast note"
            value={value}
            onChangeText={onChangeText}
            placeholder="Add a note"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="done"
            multiline
            scrollEnabled
            textAlignVertical="top"
            style={[
              styles.input,
              {
                borderColor: theme.backgroundSelected,
                color: theme.text,
              },
            ]}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function OptionIcon({ icon }: { icon: 'custom' | 'unlimited' | 'note' }) {
  const theme = useTheme();
  const Icon = icon === 'custom' ? SlidersHorizontal : icon === 'unlimited' ? InfinityIcon : SquarePen;

  return (
    <View style={[styles.optionIcon, { backgroundColor: theme.accentBackground }]}>
      <Icon size={18} color={theme.accent} strokeWidth={2} />
    </View>
  );
}

export function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const days = Math.floor(value / 24);
  const hours = value % 24;
  const hourValues = useMemo(
    () => (days >= 7 ? [0] : days === 0 ? durationHoursWithoutZero : durationHours),
    [days],
  );

  return (
    <View
      style={[
        styles.durationEditor,
        { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
      ]}>
      <View style={styles.pickers}>
        <PickerColumn
          label="DAYS"
          value={days}
          values={durationDays}
          onChange={(nextDays) => {
            const nextHours = nextDays === 7 ? 0 : nextDays === 0 && hours === 0 ? 1 : hours;
            onChange(Math.min(maxCustomDurationHours, nextDays * 24 + nextHours));
          }}
        />
        <PickerColumn
          label="HOURS"
          value={hours}
          values={hourValues}
          onChange={(nextHours) =>
            onChange(Math.min(maxCustomDurationHours, days * 24 + nextHours))
          }
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
        Maximum duration is 7 days.
      </ThemedText>
    </View>
  );
}

function PickerColumn({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: number;
  values: readonly number[];
  onChange: (value: number) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.pickerColumn}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.centeredText}>
        {label}
      </ThemedText>
      <Picker
        selectedValue={String(value)}
        onValueChange={(nextValue) => onChange(Number(nextValue))}
        style={styles.picker}>
        {values.map((option) => (
          <Picker.Item
            key={option}
            label={String(option)}
            value={String(option)}
            color={theme.text}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  goalSelector: { gap: Spacing.three },
  hero: { alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.four },
  goalHeroName: {
    textAlign: 'center',
    maxWidth: '100%',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  goalHeroDuration: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  centeredText: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  goalCard: {
    width: 108,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  goalCardName: { fontSize: 16, textAlign: 'center', maxWidth: '100%' },
  goalCardDuration: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  goalPickerHint: {
    marginTop: -Spacing.two,
    paddingHorizontal: Spacing.four,
    textAlign: 'center',
  },
  options: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
  },
  optionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  optionPrimary: {
    minHeight: 54,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  optionEdit: {
    minHeight: 48,
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
    paddingLeft: Spacing.two,
  },
  optionCheck: {
    width: 16,
    alignItems: 'center',
  },
  optionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderCurve: 'continuous',
  },
  optionLabel: { flex: 1, gap: Spacing.half },
  switchWrap: { width: 52, alignItems: 'center', justifyContent: 'center' },
  durationEditor: {
    marginHorizontal: Spacing.two,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingBottom: Spacing.three,
  },
  pickers: {
    minHeight: 176,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pickerColumn: { flex: 1, alignItems: 'center' },
  picker: { width: '100%', minHeight: 152 },
  noteInputWrap: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  input: {
    height: 112,
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  pressed: { opacity: 0.68 },
});
