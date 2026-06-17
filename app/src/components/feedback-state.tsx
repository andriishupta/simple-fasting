import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FeedbackStateKind = 'empty' | 'error' | 'loading';

type FeedbackAction = {
  label: string;
  onPress: () => void;
};

type FeedbackStateProps = {
  kind: FeedbackStateKind;
  title: string;
  description: string;
  action?: FeedbackAction;
};

export function FeedbackState({ kind, title, description, action }: FeedbackStateProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole={kind === 'error' ? 'alert' : 'summary'}
      style={[
        styles.container,
        {
          borderColor: kind === 'error' ? '#D92D20' : theme.backgroundSelected,
          backgroundColor: kind === 'error' ? '#FEF3F2' : 'transparent',
        },
      ]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        {description}
      </ThemedText>
      {action !== undefined && (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: kind === 'error' ? '#D92D20' : theme.accent },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.actionText}>
            {action.label}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 140,
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.four,
  },
  description: {
    maxWidth: 420,
  },
  action: {
    minHeight: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  actionText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.72,
  },
});
