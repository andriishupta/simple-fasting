import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import type { SharedDocument, SharedDocumentBlock } from '@/content/shared-documents';
import { t } from '@/locales/i18n';

export function LocalDocumentScreen({
  document,
}: {
  document: SharedDocument;
}) {
  const insets = useSafeAreaInsets();
  const meta = document.effectiveDate
    ? t('documents.effectiveVersion', {
        date: document.effectiveDate,
        version: document.version,
      })
    : t('documents.version', { version: document.version });
  const screenStyle = [
    styles.screen,
    Platform.OS === 'android' ? { paddingTop: insets.top + Spacing.six } : null,
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={screenStyle}>
      <View style={styles.content}>
        <ThemedText style={styles.meta}>
          {meta}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.intro}>
          {document.intro}
        </ThemedText>
        {document.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            {section.blocks.map((block, index) => (
              <DocumentBlock key={`${section.id}-${index}`} block={block} />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function DocumentBlock({ block }: { block: SharedDocumentBlock }) {
  if (block.type === 'paragraph') {
    return (
      <ThemedText themeColor="textSecondary" selectable style={styles.paragraph}>
        {block.text}
      </ThemedText>
    );
  }

  return block.items.map((item) => (
    <View key={item} style={styles.bulletRow}>
      <ThemedText themeColor="textSecondary" style={styles.bullet}>
        •
      </ThemedText>
      <ThemedText themeColor="textSecondary" selectable style={[styles.paragraph, styles.bulletText]}>
        {item}
      </ThemedText>
    </View>
  ));
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.five,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 640),
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  meta: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  intro: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  bulletText: { flex: 1 },
});
