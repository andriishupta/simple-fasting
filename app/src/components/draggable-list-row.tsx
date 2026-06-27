import { type ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const rowSettleTransition = LinearTransition.duration(160);

type DraggableListRowProps = {
  children: (dragHandle: ReactNode) => ReactNode;
  dragHandle: ReactNode;
  index: number;
  itemCount: number;
  rowHeight: number;
  onDragEnd?: () => void;
  onDragStart?: () => void;
  onMove: (destinationIndex: number) => void;
};

export function DraggableListRow({
  children,
  dragHandle,
  index,
  itemCount,
  rowHeight,
  onDragEnd,
  onDragStart,
  onMove,
}: DraggableListRowProps) {
  const translateY = useSharedValue(0);
  const sourceIndex = useSharedValue(index);
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(120)
    .onBegin(() => {
      sourceIndex.value = index;
      if (onDragStart !== undefined) runOnJS(onDragStart)();
    })
    .onUpdate(({ translationY }) => {
      translateY.value = translationY;
    })
    .onEnd(({ translationY }) => {
      const destinationIndex = Math.max(
        0,
        Math.min(itemCount - 1, sourceIndex.value + Math.round(translationY / rowHeight)),
      );

      if (destinationIndex !== sourceIndex.value) runOnJS(onMove)(destinationIndex);
      translateY.value = withSpring(0, {
        damping: 28,
        mass: 0.9,
        overshootClamping: true,
        stiffness: 170,
      });
    })
    .onFinalize(() => {
      if (onDragEnd !== undefined) runOnJS(onDragEnd)();
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: translateY.value === 0 ? 0 : 2,
    opacity: translateY.value === 0 ? 1 : 0.92,
  }));

  return (
    <Animated.View layout={rowSettleTransition} style={animatedStyle}>
      {children(<GestureDetector gesture={dragGesture}>{dragHandle}</GestureDetector>)}
    </Animated.View>
  );
}
