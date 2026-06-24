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
  rowHeight: number;
  onMove: (destinationIndex: number) => void;
};

export function DraggableListRow({
  children,
  dragHandle,
  index,
  rowHeight,
  onMove,
}: DraggableListRowProps) {
  const translateY = useSharedValue(0);
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(120)
    .onUpdate(({ translationY }) => {
      translateY.value = translationY;
    })
    .onEnd(({ translationY }) => {
      const rowOffset = Math.round(translationY / rowHeight);
      if (rowOffset !== 0) runOnJS(onMove)(index + rowOffset);
      translateY.value = withSpring(0, {
        damping: 28,
        mass: 0.9,
        overshootClamping: true,
        stiffness: 170,
      });
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: translateY.value === 0 ? 0 : 2,
  }));

  return (
    <Animated.View layout={rowSettleTransition} style={animatedStyle}>
      {children(<GestureDetector gesture={dragGesture}>{dragHandle}</GestureDetector>)}
    </Animated.View>
  );
}
