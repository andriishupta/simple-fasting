import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type HeatmapCell = { id: string; value: number };
export type ChartDatum = { label: string; value: number };

const useChartWidth = (): number => {
  const { width } = useWindowDimensions();
  return Math.max(210, Math.min(440, width - 112));
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
    <View style={styles.heatmapSection}>
      <View style={[styles.heatmap, { maxWidth: columns * (compact ? 9 : 18) }]}>
        {cells.map((cell) => (
          <View
            key={cell.id}
            accessible
            accessibilityLabel={`${cell.id}: ${cell.value.toFixed(1)} fasting hours`}
            style={[
              compact ? styles.compactHeatmapCell : styles.heatmapCell,
              {
                backgroundColor: theme.accent,
                opacity: cell.value === 0 ? 0.1 : 0.25 + (cell.value / maxValue) * 0.75,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.heatmapLegend}>
        <ThemedText type="small" themeColor="textSecondary">Less</ThemedText>
        {[0.15, 0.4, 0.7, 1].map((opacity) => (
          <View key={opacity} style={[styles.legendCell, { backgroundColor: theme.accent, opacity }]} />
        ))}
        <ThemedText type="small" themeColor="textSecondary">More</ThemedText>
      </View>
    </View>
  );
}

export function FastingBarChart({
  data,
  formatValue,
}: {
  data: readonly ChartDatum[];
  formatValue: (value: number) => string;
}) {
  const theme = useTheme();
  const width = useChartWidth();
  const maxValue = Math.max(1, Math.ceil(Math.max(...data.map((item) => item.value), 0)));
  const chartData = useMemo(
    () => data.map((item) => ({ ...item, frontColor: theme.accent })),
    [data, theme.accent],
  );
  const accessibilityLabel = useMemo(
    () => data.map((item) => `${item.label}: ${formatValue(item.value)}`).join(', '),
    [data, formatValue],
  );

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <BarChart
        data={chartData}
        width={width}
        height={170}
        maxValue={maxValue}
        noOfSections={4}
        barWidth={24}
        spacing={Math.max(12, (width - data.length * 24) / Math.max(1, data.length + 1))}
        initialSpacing={8}
        endSpacing={8}
        roundedTop
        roundedBottom
        rulesColor={theme.backgroundSelected}
        rulesThickness={1}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
        xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
        formatYLabel={(label) => formatValue(Number(label))}
        isAnimated
        animationDuration={260}
      />
    </View>
  );
}

export function FastingLineChart({
  data,
  formatValue,
}: {
  data: readonly ChartDatum[];
  formatValue: (value: number) => string;
}) {
  const theme = useTheme();
  const width = useChartWidth();
  const maxValue = Math.max(1, Math.ceil(Math.max(...data.map((item) => item.value), 0)));
  const chartData = useMemo(() => data.map((item) => ({ ...item })), [data]);
  const accessibilityLabel = useMemo(
    () => data.map((item) => `${item.label}: ${formatValue(item.value)}`).join(', '),
    [data, formatValue],
  );

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <LineChart
        data={chartData}
        width={width}
        height={170}
        maxValue={maxValue}
        noOfSections={4}
        color={theme.accent}
        thickness={3}
        curved
        areaChart
        startFillColor={theme.accent}
        endFillColor={theme.accent}
        startOpacity={0.22}
        endOpacity={0.02}
        dataPointsColor={theme.accent}
        dataPointsRadius={4}
        rulesColor={theme.backgroundSelected}
        rulesThickness={1}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
        xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 11 }}
        formatYLabel={(label) => formatValue(Number(label))}
        initialSpacing={12}
        endSpacing={12}
        isAnimated
        animationDuration={260}
      />
    </View>
  );
}

export function CompletionDonut({ value }: { value: number }) {
  const theme = useTheme();
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <View style={styles.donut} accessible accessibilityLabel={`${percent}% completion rate`}>
      <PieChart
        donut
        radius={72}
        innerRadius={54}
        data={[
          { value: percent, color: theme.accent },
          { value: 100 - percent, color: theme.backgroundSelected },
        ]}
        centerLabelComponent={() => (
          <View style={styles.donutLabel}>
            <ThemedText selectable style={styles.donutValue}>{percent}%</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">completed</ThemedText>
          </View>
        )}
        isAnimated
        animationDuration={260}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heatmapSection: { gap: Spacing.two },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  heatmapCell: { width: 14, height: 14, borderRadius: 3 },
  compactHeatmapCell: { width: 5, height: 5, borderRadius: 1 },
  donut: { alignItems: 'center' },
  donutLabel: { alignItems: 'center', gap: Spacing.half },
  donutValue: { fontSize: 24, lineHeight: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
