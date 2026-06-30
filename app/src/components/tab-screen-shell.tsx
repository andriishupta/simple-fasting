import { useState } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppThemeColorScheme, useTheme } from '@/hooks/use-theme';

type TabScreenShellProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
  maxWidth?: number;
  scrollEnabled?: boolean | 'auto';
};

export function TabScreenShell({
  children,
  contentStyle,
  keyboardShouldPersistTaps = 'never',
  maxWidth = MaxContentWidth,
  scrollEnabled = true,
}: TabScreenShellProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useAppThemeColorScheme();
  const theme = useTheme();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const topOverlayHeight = Math.max(insets.top + Spacing.five, 84);
  const blurTint = colorScheme === 'dark' ? 'systemMaterialDark' : 'systemMaterialLight';
  const autoScrollEnabled = contentHeight > viewportHeight + 1;
  const canScroll = scrollEnabled === 'auto' ? autoScrollEnabled : scrollEnabled;
  const usesScrollView = scrollEnabled !== false;
  const containerInsets = {
    paddingTop: insets.top + Spacing.three,
    paddingBottom: insets.bottom + FloatingTabBarClearance,
  };
  const content = <View style={[styles.content, { maxWidth }, contentStyle]}>{children}</View>;
  const updateViewportHeight = (event: LayoutChangeEvent): void => {
    setViewportHeight(event.nativeEvent.layout.height);
  };

  return (
    <View style={styles.root}>
      {usesScrollView ? (
        <ScrollView
          style={styles.scroll}
          scrollEnabled={canScroll}
          bounces={canScroll}
          onLayout={updateViewportHeight}
          onContentSizeChange={(_width, height) => setContentHeight(height)}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.container, containerInsets]}>
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.staticContainer, styles.centeredContainer, containerInsets]}>
          {content}
        </View>
      )}
      <MaskedView
        pointerEvents="none"
        style={[styles.topOverlay, { height: topOverlayHeight }]}
        maskElement={<TopFadeMask />}>
        <LinearGradient
          colors={[
            theme.backgroundElement,
            `${theme.backgroundElement}8F`,
            `${theme.backgroundElement}00`,
          ]}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        <BlurView
          intensity={36}
          tint={blurTint}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>
    </View>
  );
}

const FloatingTabBarClearance = 112;

function TopFadeMask() {
  return (
    <LinearGradient
      colors={['#000000', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
      locations={[0, 0.4, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  staticContainer: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
  },
  centeredContainer: {
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
