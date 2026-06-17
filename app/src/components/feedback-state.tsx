import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
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
          borderColor: kind === 'error' ? theme.danger : theme.backgroundSelected,
          backgroundColor: kind === 'error' ? theme.dangerBackground : 'transparent',
        },
      ]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        {description}
      </ThemedText>
      {action !== undefined && (
        <AppButton
          label={action.label}
          onPress={action.onPress}
          variant={kind === 'error' ? 'danger' : 'primary'}
          style={styles.action}
        />
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
    alignSelf: 'flex-start',
  },
});
