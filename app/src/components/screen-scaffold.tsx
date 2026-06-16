import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenScaffoldProps = {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
};

export function ScreenScaffold({ title, eyebrow, children }: ScreenScaffoldProps) {
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}>
          <ThemedView style={styles.header}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.eyebrow}>
              {eyebrow}
            </ThemedText>
            <ThemedText type="subtitle">{title}</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.panel}>
            {children}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  panel: {
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
});
