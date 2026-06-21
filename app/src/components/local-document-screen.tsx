import { ScrollView, StyleSheet, View } from 'react-native';

import { AppSurface } from '@/components/app-surface';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { SharedDocument, SharedDocumentBlock } from '@/content/shared-documents';

export function LocalDocumentScreen({
  document,
}: {
  document: SharedDocument;
}) {
  const meta = document.effectiveDate
    ? `Effective ${document.effectiveDate} · Version ${document.version}`
    : `Version ${document.version}`;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screen}>
      <View style={styles.content}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {meta}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{document.intro}</ThemedText>
        {document.sections.map((section) => (
          <AppSurface key={section.id} style={styles.section}>
            <ThemedText type="smallBold">{section.title}</ThemedText>
            {section.blocks.map((block, index) => (
              <DocumentBlock key={`${section.id}-${index}`} block={block} />
            ))}
          </AppSurface>
        ))}
      </View>
    </ScrollView>
  );
}

function DocumentBlock({ block }: { block: SharedDocumentBlock }) {
  if (block.type === 'paragraph') {
    return (
      <ThemedText themeColor="textSecondary" selectable>
        {block.text}
      </ThemedText>
    );
  }

  return block.items.map((item) => (
    <View key={item} style={styles.bulletRow}>
      <ThemedText themeColor="textSecondary">•</ThemedText>
      <ThemedText themeColor="textSecondary" selectable style={styles.bulletText}>
        {item}
      </ThemedText>
    </View>
  ));
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
