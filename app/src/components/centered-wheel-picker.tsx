import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
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
  renderOverlay?: () => ReactNode;
  selectOnScroll?: boolean;
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
  selectOnScroll = true,
  selectedIndex,
  viewportStyle,
  onSelectIndex,
}: CenteredWheelPickerProps<Item>) {
  const scrollRef = useRef<ScrollView>(null);
  const pressSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAlignedRef = useRef(false);
  const internallySelectedIndexRef = useRef<number | null>(null);
  const selectedIndexRef = useRef(selectedIndex);
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
  const selectIndex = useCallback((index: number): void => {
    if (index < 0 || index >= items.length) return;

    if (selectedIndexRef.current === index) return;
    selectedIndexRef.current = index;
    internallySelectedIndexRef.current = index;
    onSelectIndex(index);
  }, [items.length, onSelectIndex]);
  const pressIndex = useCallback((index: number): void => {
    if (index < 0 || index >= items.length) return;

    if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);
    if (dragSettleTimerRef.current !== null) clearTimeout(dragSettleTimerRef.current);

    scrollToIndex(index, true);
    if (!selectOnScroll) {
      selectIndex(index);
      return;
    }

    pressSettleTimerRef.current = setTimeout(() => {
      selectIndex(index);
    }, 320);
  }, [items.length, scrollToIndex, selectIndex, selectOnScroll]);
  const getNearestIndex = useCallback(
    (offsetX: number): number =>
      Math.max(0, Math.min(items.length - 1, Math.round(offsetX / snapWidth))),
    [items.length, snapWidth],
  );
  const settleScroll = useCallback((offsetX: number): void => {
    if (!selectOnScroll) return;

    if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);
    if (dragSettleTimerRef.current !== null) clearTimeout(dragSettleTimerRef.current);

    selectIndex(getNearestIndex(offsetX));
  }, [getNearestIndex, selectIndex, selectOnScroll]);
  const scheduleDragSettle = useCallback((offsetX: number): void => {
    if (dragSettleTimerRef.current !== null) clearTimeout(dragSettleTimerRef.current);
    dragSettleTimerRef.current = setTimeout(() => {
      dragSettleTimerRef.current = null;
      settleScroll(offsetX);
    }, 120);
  }, [settleScroll]);
  const cancelDragSettle = useCallback((): void => {
    if (dragSettleTimerRef.current !== null) clearTimeout(dragSettleTimerRef.current);
    dragSettleTimerRef.current = null;
  }, []);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    if (!hasSelectedItem) {
      if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);
      if (dragSettleTimerRef.current !== null) clearTimeout(dragSettleTimerRef.current);
      return;
    }

    if (viewportWidth === 0 || items.length === 0) return;

    if (internallySelectedIndexRef.current === boundedSelectedIndex) {
      internallySelectedIndexRef.current = null;
      hasAlignedRef.current = true;
      return;
    }

    scrollToIndex(boundedSelectedIndex, hasAlignedRef.current);
    hasAlignedRef.current = true;
  }, [boundedSelectedIndex, hasSelectedItem, items.length, scrollToIndex, viewportWidth]);

  useEffect(
    () => () => {
      if (pressSettleTimerRef.current !== null) clearTimeout(pressSettleTimerRef.current);
      if (dragSettleTimerRef.current !== null) clearTimeout(dragSettleTimerRef.current);
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
        onScrollEndDrag={
          selectOnScroll
            ? (event) => scheduleDragSettle(event.nativeEvent.contentOffset.x)
            : undefined
        }
        onMomentumScrollBegin={selectOnScroll ? cancelDragSettle : undefined}
        onMomentumScrollEnd={
          selectOnScroll ? (event) => settleScroll(event.nativeEvent.contentOffset.x) : undefined
        }
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
      {renderOverlay ? (
        <View pointerEvents="none" style={styles.centeredOverlay}>
          {renderOverlay()}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
  },
  centeredOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
