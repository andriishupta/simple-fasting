import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHistoryState } from '@/features/fast/fasting';
import {
  formatGraphHours,
  formatGraphPercent,
  getGraphData,
  type BarDatum,
  type HeatmapDay,
} from '@/features/graphs/graphs';
import { useTheme } from '@/hooks/use-theme';

export default function GraphsScreen() {
  const history = useHistoryState();
  const graphData = getGraphData(history);

  return (
    <ScreenScaffold title="Graphs" eyebrow="Visual summary">
      {history.sessions.length === 0 ? (
        <>
          <ThemedText>No graph data yet.</ThemedText>
          <ThemedText themeColor="textSecondary">
            Complete a fast to build heatmaps and charts.
          </ThemedText>
        </>
      ) : (
        <View style={styles.content}>
          <GraphSection title="Weekly heatmap">
            <HeatmapGrid days={graphData.weeklyHeatmap} columns={7} />
          </GraphSection>

          <GraphSection title="Monthly heatmap">
            <HeatmapGrid days={graphData.monthlyHeatmap} columns={10} />
          </GraphSection>

          <GraphSection title="Yearly heatmap">
            <HeatmapGrid days={graphData.yearlyHeatmap} columns={26} compact />
          </GraphSection>

          <GraphSection title="Monthly hours">
            <VerticalBars data={graphData.monthlyHours} valueSuffix="h" />
          </GraphSection>

          <GraphSection title="Duration distribution">
            <HorizontalBars data={graphData.durationDistribution} />
          </GraphSection>

          <GraphSection title="Completion">
            <ProgressMetric label="Completion rate" value={graphData.completionRate} />
            <ProgressMetric label="Goal achievement" value={graphData.goalAchievementRate} />
          </GraphSection>
        </View>
      )}
    </ScreenScaffold>
  );
}

function GraphSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.section, { borderColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </View>
  );
}

function HeatmapGrid({
  days,
  columns,
  compact = false,
}: {
  days: readonly HeatmapDay[];
  columns: number;
  compact?: boolean;
}) {
  const theme = useTheme();
  const maxHours = Math.max(1, ...days.map((day) => day.hours));

  return (
    <View style={[styles.heatmap, { maxWidth: columns * (compact ? 9 : 18) }]}>
      {days.map((day) => {
        const opacity = day.hours === 0 ? 0.14 : 0.28 + (day.hours / maxHours) * 0.72;

        return (
          <View
            key={day.dateKey}
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

function VerticalBars({ data, valueSuffix }: { data: readonly BarDatum[]; valueSuffix: string }) {
  const theme = useTheme();
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <View style={styles.verticalBars}>
      {data.map((item) => (
        <View key={item.label} style={styles.verticalBarItem}>
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
          <ThemedText type="smallBold">
            {formatGraphHours(item.value)}
            {valueSuffix}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function HorizontalBars({ data }: { data: readonly BarDatum[] }) {
  const theme = useTheme();
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <View style={styles.horizontalBars}>
      {data.map((item) => (
        <View key={item.label} style={styles.horizontalBarRow}>
          <ThemedText type="small" style={styles.horizontalBarLabel}>
            {item.label}
          </ThemedText>
          <View style={[styles.horizontalBarTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.horizontalBarFill,
                {
                  backgroundColor: theme.accent,
                  width: `${Math.max(2, (item.value / maxValue) * 100)}%`,
                },
              ]}
            />
          </View>
          <ThemedText type="smallBold">{item.value}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function ProgressMetric({ label, value }: { label: string; value: number }) {
  const theme = useTheme();

  return (
    <View style={styles.progressMetric}>
      <View style={styles.progressMetricHeader}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="smallBold">{formatGraphPercent(value)}</ThemedText>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.accent,
              width: `${Math.round(value * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
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
