import { Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';

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
  const dismissAction =
    action?.label.toLowerCase() === 'dismiss' && secondaryAction === undefined ? action : undefined;
  const primaryAction = dismissAction === undefined ? action : undefined;

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
        dismissAction !== undefined && styles.dismissible,
      ]}>
      {dismissAction !== undefined ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={8}
          onPress={dismissAction.onPress}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <X size={18} color={kind === 'error' ? theme.danger : theme.textSecondary} />
        </Pressable>
      ) : null}
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        {description}
      </ThemedText>
      {(primaryAction !== undefined || secondaryAction !== undefined) && (
        <View style={styles.actions}>
          {primaryAction !== undefined && (
            <AppButton
              label={primaryAction.label}
              onPress={primaryAction.onPress}
              variant={primaryAction.variant ?? (kind === 'error' ? 'danger' : 'primary')}
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
  dismissible: {
    minHeight: 0,
    paddingRight: Spacing.five,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
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
  pressed: {
    opacity: 0.68,
  },
});
