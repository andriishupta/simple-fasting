import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type HeatmapCell = { id: string; value: number };
export type ChartDatum = { label: string; value: number };

const useChartWidth = (): number => {
  const { width } = useWindowDimensions();
  return Math.max(220, Math.min(460, width - Spacing.four * 4));
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
      {cells.map((cell) => (
        <View
          key={cell.id}
          accessible
          accessibilityLabel={`${cell.id}: ${cell.value.toFixed(1)} fasting hours`}
          style={[
            compact ? styles.compactHeatmapCell : styles.heatmapCell,
            {
              backgroundColor: theme.accent,
              opacity: cell.value === 0 ? 0.12 : 0.28 + (cell.value / maxValue) * 0.72,
            },
          ]}
        />
      ))}
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

  return (
    <View accessible accessibilityLabel={data.map((item) => `${item.label}: ${formatValue(item.value)}`).join(', ')}>
      <BarChart
        data={data.map((item) => ({ ...item, frontColor: theme.accent }))}
        width={width}
        height={170}
        maxValue={maxValue}
        noOfSections={4}
        barWidth={24}
        spacing={Math.max(12, (width - data.length * 24) / Math.max(1, data.length + 1))}
        initialSpacing={8}
        endSpacing={8}
        roundedTop
        hideRules
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

  return (
    <View accessible accessibilityLabel={data.map((item) => `${item.label}: ${formatValue(item.value)}`).join(', ')}>
      <LineChart
        data={data.map((item) => ({ ...item }))}
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
        hideRules
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
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatmapCell: { width: 14, height: 14, borderRadius: 3 },
  compactHeatmapCell: { width: 5, height: 5, borderRadius: 1 },
  donut: { alignItems: 'center' },
  donutLabel: { alignItems: 'center', gap: Spacing.half },
  donutValue: { fontSize: 24, lineHeight: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
