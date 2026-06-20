import { ScrollView, StyleSheet, View } from 'react-native';

import { AppSurface } from '@/components/app-surface';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export type LocalDocumentSection = {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export function LocalDocumentScreen({
  intro,
  meta,
  sections,
}: {
  intro: string;
  meta?: string;
  sections: readonly LocalDocumentSection[];
}) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screen}>
      <View style={styles.content}>
        {meta !== undefined ? (
          <ThemedText type="smallBold" themeColor="textSecondary">
            {meta}
          </ThemedText>
        ) : null}
        <ThemedText themeColor="textSecondary">{intro}</ThemedText>
        {sections.map((section) => (
          <AppSurface key={section.title} style={styles.section}>
            <ThemedText type="smallBold">{section.title}</ThemedText>
            {section.paragraphs.map((paragraph) => (
              <ThemedText key={paragraph} themeColor="textSecondary" selectable>
                {paragraph}
              </ThemedText>
            ))}
            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <ThemedText themeColor="textSecondary">•</ThemedText>
                <ThemedText themeColor="textSecondary" selectable style={styles.bulletText}>
                  {bullet}
                </ThemedText>
              </View>
            ))}
          </AppSurface>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 640),
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  section: { gap: Spacing.two },
  bulletRow: { flexDirection: 'row', gap: Spacing.two },
  bulletText: { flex: 1 },
});
