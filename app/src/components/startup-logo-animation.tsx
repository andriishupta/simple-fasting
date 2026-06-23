import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const animationDurationMs = 220;
const circleRadius = 30;
const circleCircumference = 2 * Math.PI * circleRadius;

export function StartupLogoAnimation({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circleCircumference * (1 - progress.value * 0.2),
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.98 + progress.value * 0.02 }],
  }));

  useEffect(() => {
    progress.set(
      withTiming(
        1,
        { duration: animationDurationMs, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (!finished) return;

          opacity.set(withTiming(0, { duration: 60 }, () => runOnJS(onDone)()));
        },
      ),
    );
  }, [onDone, opacity, progress]);

  return (
    <ThemedView style={styles.root}>
      <Animated.View style={[styles.logo, logoStyle]}>
        <Svg width={96} height={96} viewBox="0 0 96 96" accessibilityLabel="Simple Fasting">
          <Circle cx={48} cy={48} r={22} fill={theme.accent} />
          <Path
            d="M48 12v10M48 74v10M12 48h10M74 48h10M22.5 22.5l7.1 7.1M66.4 66.4l7.1 7.1M73.5 22.5l-7.1 7.1M29.6 66.4l-7.1 7.1"
            stroke={theme.accent}
            strokeLinecap="round"
            strokeWidth={4}
          />
          <AnimatedCircle
            cx={48}
            cy={48}
            r={circleRadius}
            fill="none"
            stroke={theme.accent}
            strokeDasharray={`${circleCircumference} ${circleCircumference}`}
            strokeLinecap="round"
            strokeWidth={5}
            transform="rotate(-90 48 48)"
            animatedProps={arcProps}
          />
        </Svg>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
