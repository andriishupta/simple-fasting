import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Typography } from '@/constants/theme';

export function ScreenHeading({
  align = 'left',
  children,
}: {
  align?: 'center' | 'left';
  children: string;
}) {
  return (
    <View style={[styles.container, align === 'center' && styles.centered]}>
      <ThemedText style={[styles.title, align === 'center' && styles.centeredTitle]} accessibilityRole="header">
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start' },
  centered: { alignItems: 'center' },
  title: {
    fontSize: Typography.screenTitle.fontSize,
    lineHeight: Typography.screenTitle.lineHeight,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    textAlign: 'left',
  },
  centeredTitle: { textAlign: 'center' },
});
