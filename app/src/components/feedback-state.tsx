import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FeedbackStateKind = 'empty' | 'error' | 'loading';

type FeedbackAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
};

type FeedbackStateProps = {
  kind: FeedbackStateKind;
  title: string;
  description: string;
  action?: FeedbackAction;
  secondaryAction?: FeedbackAction;
};

export function FeedbackState({
  kind,
  title,
  description,
  action,
  secondaryAction,
}: FeedbackStateProps) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole={kind === 'error' ? 'alert' : 'summary'}
      style={[
        styles.container,
        {
          borderColor: kind === 'error' ? theme.danger : theme.backgroundSelected,
          backgroundColor: kind === 'error' ? theme.dangerBackground : theme.background,
        },
      ]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        {description}
      </ThemedText>
      {(action !== undefined || secondaryAction !== undefined) && (
        <View style={styles.actions}>
          {action !== undefined && (
            <AppButton
              label={action.label}
              onPress={action.onPress}
              variant={action.variant ?? (kind === 'error' ? 'danger' : 'primary')}
              style={styles.action}
            />
          )}
          {secondaryAction !== undefined && (
            <AppButton
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant={secondaryAction.variant ?? 'secondary'}
              style={styles.action}
            />
          )}
        </View>
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
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
    padding: Spacing.four,
  },
  description: {
    maxWidth: 420,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  action: {
    alignSelf: 'center',
  },
});
