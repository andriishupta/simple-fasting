import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';
import { TimerViewPreference } from '@/storage/app-storage';

type TimerViewToggleProps = {
  value: TimerViewPreference;
  onChange: (value: TimerViewPreference) => void;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
};

const timerViewOptions = [
  {
    value: TimerViewPreference.Elapsed,
    labelKey: 'common.elapsed',
    Icon: ArrowUp,
  },
  {
    value: TimerViewPreference.Remaining,
    labelKey: 'common.remaining',
    Icon: ArrowDown,
  },
] as const;

export function TimerViewToggle({
  value,
  onChange,
  iconPosition = 'left',
  style,
}: TimerViewToggleProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.control,
        { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
        style,
      ]}>
      {timerViewOptions.map((option) => {
        const selected = option.value === value;
        const Icon = option.Icon;
        const label = t(option.labelKey);

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={t('settings.timerView.optionAccessibility', { label })}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? theme.accent : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            {iconPosition === 'left' ? (
              <Icon
                size={15}
                color={selected ? theme.accentForeground : theme.textSecondary}
                strokeWidth={2.4}
              />
            ) : null}
            <ThemedText
              type="smallBold"
              style={{ color: selected ? theme.accentForeground : theme.textSecondary }}>
              {label}
            </ThemedText>
            {iconPosition === 'right' ? (
              <Icon
                size={15}
                color={selected ? theme.accentForeground : theme.textSecondary}
                strokeWidth={2.4}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    padding: Spacing.half,
  },
  option: {
    minHeight: 32,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.xs,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
