import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Bell } from 'lucide-react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function NotificationOnboardingScreen({
  onAllowNotifications,
  onSkip,
}: {
  onAllowNotifications: () => Promise<void>;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowNotifications = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onAllowNotifications();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.root}>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: theme.accentBackground }]}>
          <Bell size={30} color={theme.accent} strokeWidth={2.2} />
        </View>

        <View style={styles.copy}>
          <ThemedText type="subtitle" style={styles.title}>
            Stay informed about your fasts
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.body}>
            Notifications help remind you when your fasting goal is reached.
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.body}>
            You can change this later in Settings.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <AppButton
            label="Allow Notifications"
            disabled={isSubmitting}
            onPress={() => void allowNotifications()}
          />
          <AppButton
            label="Not Now"
            variant="ghost"
            disabled={isSubmitting}
            onPress={onSkip}
          />
          {isSubmitting ? <ActivityIndicator color={theme.accent} /> : null}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 420),
    alignItems: 'stretch',
    gap: Spacing.four,
  },
  icon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
  },
  copy: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  body: {
    fontSize: 17,
    lineHeight: 25,
  },
  actions: {
    gap: Spacing.two,
  },
});
