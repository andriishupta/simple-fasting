import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';

type TabScreenShellProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
  maxWidth?: number;
  scrollEnabled?: boolean;
};

export function TabScreenShell({
  children,
  contentStyle,
  keyboardShouldPersistTaps = 'never',
  maxWidth = MaxContentWidth,
  scrollEnabled = true,
}: TabScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      scrollEnabled={scrollEnabled}
      bounces={scrollEnabled}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + 72 },
      ]}>
      <View style={[styles.content, { maxWidth }, contentStyle]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
