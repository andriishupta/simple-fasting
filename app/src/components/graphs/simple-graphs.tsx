import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type HeatmapCell = {
  id: string;
  value: number;
};

export type BarDatum = {
  label: string;
  value: number;
};

export function HeatmapGrid({
  cells,
  columns,
  compact = false,
}: {
  cells: readonly HeatmapCell[];
  columns: number;
  compact?: boolean;
}) {
  const theme = useTheme();
  const maxValue = Math.max(1, ...cells.map((cell) => cell.value));

  return (
    <View style={[styles.heatmap, { maxWidth: columns * (compact ? 9 : 18) }]}>
      {cells.map((cell) => {
        const opacity = cell.value === 0 ? 0.14 : 0.28 + (cell.value / maxValue) * 0.72;

        return (
          <View
            key={cell.id}
            accessible
            accessibilityLabel={`${cell.id}: ${cell.value.toFixed(1)} fasting hours`}
            style={[
              compact ? styles.compactHeatmapCell : styles.heatmapCell,
              {
                backgroundColor: theme.accent,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function VerticalBars({
  data,
  formatValue,
}: {
  data: readonly BarDatum[];
  formatValue: (value: number) => string;
}) {
  const theme = useTheme();
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <View style={styles.verticalBars}>
      {data.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${formatValue(item.value)}`}
          style={styles.verticalBarItem}>
          <View style={styles.verticalBarTrack}>
            <View
              style={[
                styles.verticalBarFill,
                {
                  backgroundColor: theme.accent,
                  height: `${Math.max(4, (item.value / maxValue) * 100)}%`,
                },
              ]}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {item.label}
          </ThemedText>
          <ThemedText type="smallBold">{formatValue(item.value)}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function HorizontalBars({
  data,
  formatValue,
}: {
  data: readonly BarDatum[];
  formatValue: (value: number) => string;
}) {
  const theme = useTheme();
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <View style={styles.horizontalBars}>
      {data.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${formatValue(item.value)}`}
          style={styles.horizontalBarRow}>
          <ThemedText type="small" style={styles.horizontalBarLabel}>
            {item.label}
          </ThemedText>
          <View style={[styles.horizontalBarTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.horizontalBarFill,
                {
                  backgroundColor: theme.accent,
                  width:
                    item.value === 0 ? '0%' : `${Math.max(2, (item.value / maxValue) * 100)}%`,
                },
              ]}
            />
          </View>
          <ThemedText type="smallBold">{formatValue(item.value)}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function ProgressMetric({
  label,
  value,
  formatValue,
}: {
  label: string;
  value: number;
  formatValue: (value: number) => string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.progressMetric}>
      <View style={styles.progressMetricHeader}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="smallBold">{formatValue(value)}</ThemedText>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.accent,
              width: `${Math.min(100, Math.max(0, Math.round(value * 100)))}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatmapCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  compactHeatmapCell: {
    width: 5,
    height: 5,
    borderRadius: 1,
  },
  verticalBars: {
    minHeight: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  verticalBarItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  verticalBarTrack: {
    height: 96,
    width: 18,
    justifyContent: 'flex-end',
  },
  verticalBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  horizontalBars: {
    gap: Spacing.two,
  },
  horizontalBarRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  horizontalBarLabel: {
    width: 56,
  },
  horizontalBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  horizontalBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressMetric: {
    gap: Spacing.two,
  },
  progressMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
});
