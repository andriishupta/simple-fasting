import { useEffect, useMemo } from 'react';
import { Picker } from '@expo/ui/community/picker';
import {
  Check,
  ChevronDown,
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppSection } from '@/components/app-section';
import { CenteredWheelPicker } from '@/components/centered-wheel-picker';
import { ThemedText } from '@/components/themed-text';
import { TruncatedText } from '@/components/truncated-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';
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
const noteMaxLength = 128;

export function FastGoalSelector({
  goals,
  selectedGoalId,
  customDurationHours,
  customDurationExpanded,
  noteEnabled,
  noteValue,
  onSelectGoal,
  onCustomDurationChange,
  onCustomDurationExpandedChange,
  onNoteEnabledChange,
  onNoteChangeText,
}: {
  goals: readonly GoalOption[];
  selectedGoalId: string;
  customDurationHours: number;
  customDurationExpanded: boolean;
  noteEnabled: boolean;
  noteValue: string;
  onSelectGoal: (goalId: string) => void;
  onCustomDurationChange: (hours: number) => void;
  onCustomDurationExpandedChange: (expanded: boolean) => void;
  onNoteEnabledChange: (enabled: boolean) => void;
  onNoteChangeText: (value: string) => void;
}) {
  const theme = useTheme();
  const goalDurationFormat = useSettingsSelector((settings) => settings.goalDurationFormat);
  const selectedGoalIndex = goals.findIndex((goal) => goal.id === selectedGoalId);

  return (
    <View style={styles.goalSelector}>
      <CenteredWheelPicker
        accessibilityLabel={t('goals.listTitle')}
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

      <AppSection>
        <View style={styles.optionsContent}>
          <View style={styles.optionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('setup.thisTimeAccessibility')}
              accessibilityState={{ selected: selectedGoalId === customGoalId }}
              accessibilityHint={t('setup.thisTimeDescription')}
              onPress={() => {
                onSelectGoal(customGoalId);
              }}
              style={({ pressed }) => [styles.optionPrimary, pressed && styles.pressed]}>
              <OptionIcon icon="custom" />
              <View style={styles.optionLabel}>
                <ThemedText>{t('setup.thisTime')}</ThemedText>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('setup.editThisTimeAccessibility', {
                duration: formatGoalDuration(customDurationHours, goalDurationFormat),
              })}
              accessibilityHint={t('setup.editThisTimeHint')}
              onPress={() => {
                unstable_batchedUpdates(() => {
                  onSelectGoal(customGoalId);
                  onCustomDurationExpandedChange(!customDurationExpanded);
                });
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.optionEdit, pressed && styles.pressed]}>
              {selectedGoalId === customGoalId ? (
                <Check size={16} color={theme.accent} strokeWidth={2.5} />
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {formatGoalDuration(customDurationHours, goalDurationFormat)}
              </ThemedText>
              <CustomDurationChevron expanded={customDurationExpanded} color={theme.textSecondary} />
            </Pressable>
          </View>

          {customDurationExpanded ? (
            <View style={styles.customDurationBlock}>
              <DurationPicker value={customDurationHours} onChange={onCustomDurationChange} />
              <View style={styles.customDurationHelp}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
                  {t('setup.maxDuration')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
                  {t('setup.reusableGoals')}
                </ThemedText>
              </View>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedGoalId === unlimitedGoalId }}
            accessibilityLabel={t('setup.openEndedAccessibility')}
            accessibilityHint={t('setup.openEndedHint')}
            onPress={() => onSelectGoal(unlimitedGoalId)}
            style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
            <OptionIcon icon="unlimited" />
            <ThemedText style={styles.optionLabel}>{t('setup.openEnded')}</ThemedText>
            <View style={styles.optionCheck}>
              {selectedGoalId === unlimitedGoalId ? (
                <Check size={16} color={theme.accent} strokeWidth={2.5} />
              ) : null}
            </View>
          </Pressable>
          <View style={styles.optionRow}>
            <OptionIcon icon="note" />
            <View style={styles.optionLabel}>
              <ThemedText>{t('setup.note')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('setup.optional')}
              </ThemedText>
            </View>
            <View style={styles.switchWrap}>
              <Switch
                accessibilityLabel={t('setup.note')}
                accessibilityHint={t('setup.noteHint')}
                value={noteEnabled}
                onValueChange={onNoteEnabledChange}
                trackColor={{ true: theme.accent }}
              />
            </View>
          </View>
          {noteEnabled ? (
            <View style={styles.noteInputWrap}>
              <TextInput
                accessibilityLabel={t('setup.noteAccessibility')}
                value={noteValue}
                onChangeText={onNoteChangeText}
                maxLength={noteMaxLength}
                placeholder={t('setup.notePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                returnKeyType="default"
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
              <ThemedText type="small" themeColor="textSecondary" style={styles.characterCount}>
                {t('common.characterCount', {
                  count: noteValue.length,
                  max: noteMaxLength,
                })}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </AppSection>
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
          backgroundColor: theme.background,
          borderColor: selected ? theme.accent : theme.backgroundSelected,
        },
      ]}>
      <TruncatedText value={name} type="smallBold" style={styles.goalCardName} />
      <ThemedText
        type="small"
        themeColor={selected ? 'accent' : 'textSecondary'}
        style={styles.goalCardDuration}>
        {durationLabel}
      </ThemedText>
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

function CustomDurationChevron({
  expanded,
  color,
}: {
  expanded: boolean;
  color: string;
}) {
  const progress = useSharedValue(expanded ? 1 : 0);
  const RightIcon = ChevronRight;
  const DownIcon = ChevronDown;

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: 160 });
  }, [expanded, progress]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: 0.72 + progress.value * 0.28,
      transform: [{ scale: 0.96 + progress.value * 0.04 }],
    }),
  );

  return (
    <Animated.View style={animatedStyle}>
      {expanded ? <DownIcon size={16} color={color} /> : <RightIcon size={16} color={color} />}
    </Animated.View>
  );
}

export function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const days = Math.floor(value / 24);
  const hours = value % 24;
  const shownHours = days >= 7 ? 0 : hours;
  const hourValues = useMemo(
    () => (days >= 7 ? [0] : days === 0 ? durationHoursWithoutZero : durationHours),
    [days],
  );

  useEffect(() => {
    if (days >= 7 && hours !== 0) {
      onChange(maxCustomDurationHours);
    }
  }, [days, hours, onChange]);

  return (
    <View style={styles.durationEditor}>
      <View style={styles.pickers}>
        <PickerColumn
          label={t('setup.days').toUpperCase()}
          value={days}
          values={durationDays}
          onChange={(nextDays) => {
            const nextHours = nextDays === 7 ? 0 : nextDays === 0 && hours === 0 ? 1 : hours;
            onChange(Math.min(maxCustomDurationHours, nextDays * 24 + nextHours));
          }}
        />
        <PickerColumn
          label={t('setup.hours').toUpperCase()}
          value={shownHours}
          values={hourValues}
          onChange={(nextHours) =>
            onChange(days >= 7 ? maxCustomDurationHours : days * 24 + nextHours)
          }
        />
      </View>
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
        key={`${label}-${values.join('-')}`}
        selectedValue={String(value)}
        onValueChange={(nextValue) => onChange(Number(nextValue))}
        style={styles.picker}>
        {values.map((option) => (
          <Picker.Item
            key={option}
            label={String(option)}
            value={String(option)}
            color={theme.text}
            style={styles.pickerItem}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  goalSelector: { gap: Spacing.md },
  centeredText: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  characterCount: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  goalCard: {
    width: 108,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  goalCardName: { fontSize: 16, textAlign: 'center', maxWidth: '100%' },
  goalCardDuration: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  optionsContent: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  optionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionPrimary: {
    minHeight: 54,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionEdit: {
    minHeight: 48,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xxs,
    paddingLeft: Spacing.xs,
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
  switchWrap: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
  durationEditor: {
    overflow: 'hidden',
  },
  customDurationBlock: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  customDurationHelp: { gap: Spacing.half },
  pickers: {
    minHeight: 176,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  pickerColumn: { flex: 1, alignItems: 'center' },
  picker: { width: '100%', minHeight: 152 },
  pickerItem: { backgroundColor: 'transparent' },
  noteInputWrap: { gap: Spacing.half, paddingBottom: Spacing.xxs },
  input: {
    height: 112,
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  pressed: { opacity: 0.68 },
});
