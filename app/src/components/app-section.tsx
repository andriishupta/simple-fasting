import { StyleSheet, View } from 'react-native';

import { AppSurface } from '@/components/app-surface';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type AppSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export function AppSection({ title, description, children }: AppSectionProps) {
  return (
    <View style={styles.section}>
      {title !== undefined || description !== undefined ? (
        <View style={styles.heading}>
          {title !== undefined ? (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
              {title}
            </ThemedText>
          ) : null}
          {description !== undefined ? (
            <ThemedText type="small" themeColor="textSecondary">
              {description}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      <AppSurface padded={false} style={styles.panel}>
        {children}
      </AppSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: Spacing.xs,
  },
  heading: {
    gap: Spacing.xxxs,
  },
  title: {
    textTransform: 'uppercase',
  },
  panel: {
    overflow: 'hidden',
  },
});
