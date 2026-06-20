import { useMemo } from 'react';
import { Picker } from '@expo/ui/community/picker';
import { Check, ChevronRight, Infinity as InfinityIcon, SlidersHorizontal, SquarePen } from 'lucide-react-native';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const customGoalId = 'custom-duration';
export const unlimitedGoalId = 'unlimited-duration';
export const maxCustomDurationHours = 7 * 24;

type GoalOption = {
  id: string;
  name: string;
  targetDurationHours: number;
};

const durationDays = Array.from({ length: 8 }, (_, day) => day);
const durationHours = Array.from({ length: 24 }, (_, hour) => hour);
const durationHoursWithoutZero = durationHours.slice(1);

export const formatGoalDuration = (hours: number): string => {
  if (hours === 0) return 'Unlimited';
  if (hours < 24) return `${hours} hours`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
};

export const getGoalSelectionId = (
  goals: readonly Pick<GoalOption, 'id' | 'targetDurationHours'>[],
  durationHoursValue: number,
): string =>
  durationHoursValue === 0
    ? unlimitedGoalId
    : goals.find((goal) => goal.targetDurationHours === durationHoursValue)?.id ?? customGoalId;

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
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
  const selectedDuration =
    selectedGoalId === unlimitedGoalId
      ? 0
      : selectedGoalId === customGoalId
        ? customDurationHours
        : (selectedGoal?.targetDurationHours ?? customDurationHours);
  const selectedGoalName =
    selectedGoalId === unlimitedGoalId
      ? 'Open-ended Fast'
      : selectedGoalId === customGoalId
        ? 'This Time'
        : (selectedGoal?.name ?? 'Fasting Goal');

  return (
    <View style={styles.goalSelector}>
      <View style={styles.hero}>
        <ThemedText
          selectable
          style={[styles.goalHero, selectedGoalId === customGoalId && styles.customGoalHero]}>
          {selectedGoalName}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.centeredText}>
          {selectedDuration === 0 ? 'No time limit' : formatGoalDuration(selectedDuration)}
        </ThemedText>
      </View>

      <View style={styles.presetRow}>
        {goals.map((goal) => (
          <GoalButton
            key={goal.id}
            label={goal.name}
            selected={goal.id === selectedGoalId}
            onPress={() => onSelectGoal(goal.id)}
          />
        ))}
      </View>

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
            onPress={() => {
              onSelectGoal(customGoalId);
              onCustomDurationExpandedChange(true);
            }}
            style={({ pressed }) => [styles.optionPrimary, pressed && styles.pressed]}>
            <OptionIcon icon="custom" />
            <View style={styles.optionLabel}>
              <ThemedText>This time</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Create reusable goals in Settings.
              </ThemedText>
            </View>
            {selectedGoalId === customGoalId ? (
              <Check size={16} color={theme.accent} strokeWidth={2.5} />
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit custom duration, currently ${formatGoalDuration(customDurationHours)}`}
            onPress={() => {
              onSelectGoal(customGoalId);
              onCustomDurationExpandedChange(!customDurationExpanded);
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.optionEdit, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatGoalDuration(customDurationHours)}
            </ThemedText>
            <ChevronRight size={16} color={theme.textSecondary} />
          </Pressable>
        </View>

        {customDurationExpanded ? (
          <DurationPicker value={customDurationHours} onChange={onCustomDurationChange} />
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedGoalId === unlimitedGoalId }}
          onPress={() => onSelectGoal(unlimitedGoalId)}
          style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
          <OptionIcon icon="unlimited" />
          <ThemedText style={styles.optionLabel}>Open-ended fast</ThemedText>
          {selectedGoalId === unlimitedGoalId ? (
            <Check size={16} color={theme.accent} strokeWidth={2.5} />
          ) : null}
        </Pressable>
      </View>
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
    <View style={styles.noteControl}>
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
              value={enabled}
              onValueChange={onEnabledChange}
              trackColor={{ true: theme.accent }}
            />
          </View>
        </View>
      </View>
      {enabled ? (
        <TextInput
          accessibilityLabel="Fast note"
          value={value}
          onChangeText={onChangeText}
          placeholder="Add a note"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          multiline
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
        />
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

function DurationPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
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
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.centeredText}>
        Not medical advice.
      </ThemedText>
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

function GoalButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.goal,
        {
          backgroundColor: selected ? theme.accent : theme.background,
          borderColor: selected ? theme.accent : theme.backgroundSelected,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={selected ? { color: theme.accentForeground } : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  goalSelector: { gap: Spacing.three },
  hero: { alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.four },
  goalHero: { textAlign: 'center', fontSize: 40, lineHeight: 46, fontWeight: '700' },
  customGoalHero: { fontSize: 34, lineHeight: 40 },
  centeredText: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  goal: {
    minWidth: 56,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
  options: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
  },
  optionRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  optionPrimary: {
    minHeight: 60,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  optionEdit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  optionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderCurve: 'continuous',
  },
  optionLabel: { flex: 1 },
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
  noteControl: { gap: Spacing.two },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  pressed: { opacity: 0.68 },
});
