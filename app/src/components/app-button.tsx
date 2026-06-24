import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';

type AppButtonProps = PressableProps & {
  label: string;
  variant?: AppButtonVariant;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  variant = 'primary',
  fullWidth = false,
  style,
  disabled,
  ...pressableProps
}: AppButtonProps) {
  const theme = useTheme();
  const colors = {
    primary: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
      color: theme.accentForeground,
    },
    secondary: {
      backgroundColor: theme.accentBackground,
      borderColor: theme.accentBorder,
      color: theme.text,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: theme.accent,
    },
    danger: {
      backgroundColor: theme.danger,
      borderColor: theme.danger,
      color: theme.dangerForeground,
    },
    dangerGhost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: theme.danger,
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        colors,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      disabled={disabled}
      {...pressableProps}>
      <ThemedText type="smallBold" style={{ color: colors.color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  fullWidth: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
