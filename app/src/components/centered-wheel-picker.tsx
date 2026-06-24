import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

type CenteredWheelPickerProps<Item> = {
  accessibilityLabel: string;
  getItemAccessibilityLabel?: (item: Item, index: number) => string;
  itemGap?: number;
  itemWidth: number;
  items: readonly Item[];
  keyExtractor?: (item: Item, index: number) => string;
  renderItem: (item: Item, state: { index: number; selected: boolean }) => ReactNode;
  renderOverlay?: (state: { sideInset: number }) => ReactNode;
  selectedIndex: number;
  viewportStyle?: StyleProp<ViewStyle>;
  onSelectIndex: (index: number) => void;
};

export function CenteredWheelPicker<Item>({
  accessibilityLabel,
  getItemAccessibilityLabel,
  itemGap = 0,
  itemWidth,
  items,
  keyExtractor,
  renderItem,
  renderOverlay,
  selectedIndex,
  viewportStyle,
  onSelectIndex,
}: CenteredWheelPickerProps<Item>) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAlignedRef = useRef(false);
  const isPressScrollingRef = useRef(false);
  const ignoreSettleUntilRef = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const snapWidth = itemWidth + itemGap;
  const sideInset = Math.max(0, (viewportWidth - itemWidth) / 2);
  const hasSelectedItem = selectedIndex >= 0 && selectedIndex < items.length;
  const boundedSelectedIndex = hasSelectedItem
    ? Math.max(0, Math.min(items.length - 1, selectedIndex))
    : -1;
  const scrollToIndex = useCallback((index: number, animated: boolean): void => {
    if (index < 0 || index >= items.length) return;

    scrollRef.current?.scrollTo({ x: index * snapWidth, animated });
  }, [items.length, snapWidth]);
  const selectIndex = useCallback((index: number, animated: boolean): void => {
    if (index < 0 || index >= items.length) return;

    if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);
    if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);
    isPressScrollingRef.current = false;
    onSelectIndex(index);
    scrollToIndex(index, animated);
  }, [items.length, onSelectIndex, scrollToIndex]);
  const pressIndex = useCallback((index: number): void => {
    if (index < 0 || index >= items.length) return;

    if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);
    if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);

    isPressScrollingRef.current = true;
    scrollToIndex(index, true);
    pressSettleTimerRef.current = setTimeout(() => {
      isPressScrollingRef.current = false;
      onSelectIndex(index);
    }, 320);
  }, [items.length, onSelectIndex, scrollToIndex]);
  const getNearestIndex = useCallback(
    (offsetX: number): number =>
      Math.max(0, Math.min(items.length - 1, Math.round(offsetX / snapWidth))),
    [items.length, snapWidth],
  );
  const settleScroll = useCallback((offsetX: number): void => {
    selectIndex(getNearestIndex(offsetX), true);
  }, [getNearestIndex, selectIndex]);
  const scheduleSettleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (Date.now() < ignoreSettleUntilRef.current) return;
    if (isPressScrollingRef.current) return;
    if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);

    const offsetX = event.nativeEvent.contentOffset.x;
    scrollStopTimerRef.current = setTimeout(() => settleScroll(offsetX), 110);
  }, [settleScroll]);
  const finishScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);
    if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);
    isPressScrollingRef.current = false;
    if (Date.now() < ignoreSettleUntilRef.current) return;
    settleScroll(event.nativeEvent.contentOffset.x);
  }, [settleScroll]);

  useEffect(() => {
    if (!hasSelectedItem) {
      if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);
      if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);
      isPressScrollingRef.current = false;
      ignoreSettleUntilRef.current = Date.now() + 350;
      return;
    }

    if (viewportWidth === 0 || items.length === 0) return;

    scrollToIndex(boundedSelectedIndex, hasAlignedRef.current);
    hasAlignedRef.current = true;
  }, [boundedSelectedIndex, hasSelectedItem, items.length, scrollToIndex, viewportWidth]);

  useEffect(
    () => () => {
      if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);
      if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);
      isPressScrollingRef.current = false;
    },
    [],
  );

  return (
    <View
      onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
      style={[styles.viewport, viewportStyle]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapWidth}
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={scheduleSettleScroll}
        onMomentumScrollEnd={finishScroll}
        contentContainerStyle={{ gap: itemGap, paddingHorizontal: sideInset }}>
        {items.map((item, index) => (
          <Pressable
            key={keyExtractor?.(item, index) ?? String(index)}
            accessibilityRole="button"
            accessibilityLabel={getItemAccessibilityLabel?.(item, index)}
            accessibilityState={{ selected: hasSelectedItem && index === boundedSelectedIndex }}
            onPress={() => pressIndex(index)}
            style={({ pressed }) => [
              { width: itemWidth },
              pressed && styles.pressed,
            ]}>
            {renderItem(item, {
              index,
              selected: hasSelectedItem && index === boundedSelectedIndex,
            })}
          </Pressable>
        ))}
      </ScrollView>
      {renderOverlay?.({ sideInset })}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.78,
  },
});
