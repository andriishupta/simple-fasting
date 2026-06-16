import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHistoryState } from '@/features/fast/fasting';
import { formatHours, formatPercent, getFastingStats } from '@/features/statistics/statistics';
import { useTheme } from '@/hooks/use-theme';

export default function StatisticsScreen() {
  const historyState = useHistoryState();
  const stats = getFastingStats(historyState);

  return (
    <ScreenScaffold title="Statistics" eyebrow="History summary">
      {historyState.sessions.length === 0 ? (
        <>
          <ThemedText>No statistics yet.</ThemedText>
          <ThemedText themeColor="textSecondary">
            Complete a fast to start building your local stats.
          </ThemedText>
        </>
      ) : (
        <View style={styles.grid}>
          <StatCard label="Current streak" value={`${stats.currentStreakDays}`} suffix="days" />
          <StatCard label="Longest streak" value={`${stats.longestStreakDays}`} suffix="days" />
          <StatCard label="Longest fast" value={formatHours(stats.longestFastHours)} suffix="h" />
          <StatCard
            label="Average duration"
            value={formatHours(stats.averageDurationHours)}
            suffix="h"
          />
          <StatCard label="Completion rate" value={formatPercent(stats.completionRate)} />
          <StatCard label="Total hours" value={formatHours(stats.totalHours)} suffix="h" />
          <StatCard label="Completed fasts" value={`${stats.completedSessions}`} />
          <StatCard label="Total sessions" value={`${stats.totalSessions}`} />
        </View>
      )}
    </ScreenScaffold>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { borderColor: theme.backgroundSelected }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.valueRow}>
        <ThemedText type="subtitle">{value}</ThemedText>
        {suffix !== undefined && (
          <ThemedText type="smallBold" themeColor="textSecondary">
            {suffix}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    width: '48%',
    minWidth: 136,
    minHeight: 112,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
});
