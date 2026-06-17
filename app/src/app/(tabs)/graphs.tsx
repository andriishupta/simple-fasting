import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import {
  HeatmapGrid,
  HorizontalBars,
  ProgressMetric,
  VerticalBars,
  type BarDatum,
  type HeatmapCell,
} from '@/components/graphs/simple-graphs';
import { FeedbackState } from '@/components/feedback-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHistoryState } from '@/storage/fasting-storage';
import { FastStatus, type FastSession, type HistoryState } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';

type GraphData = {
  weeklyHeatmap: readonly HeatmapCell[];
  monthlyHeatmap: readonly HeatmapCell[];
  yearlyHeatmap: readonly HeatmapCell[];
  monthlyHours: readonly BarDatum[];
  durationDistribution: readonly BarDatum[];
  completionRate: number;
  goalAchievementRate: number;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;

const getDayKey = (date: Date): string => date.toISOString().slice(0, 10);

const getMonthKey = (date: Date): string => date.toISOString().slice(0, 7);

const getDurationHours = (session: FastSession): number => {
  if (session.endedAt === null) {
    return 0;
  }

  return Math.max(
    0,
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 3_600_000,
  );
};

const getCompletedSessions = (history: HistoryState): readonly FastSession[] =>
  history.sessions.filter((session) => session.status === FastStatus.Completed);

const getRangeDayKeys = (days: number): readonly string[] => {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  return Array.from({ length: days }, (_, index) => {
    const offset = days - index - 1;

    return getDayKey(new Date(todayUtc - offset * dayMilliseconds));
  });
};

const getHoursByDay = (sessions: readonly FastSession[]): Record<string, number> =>
  sessions.reduce<Record<string, number>>((result, session) => {
    const dayKey = getDayKey(new Date(session.startedAt));

    return {
      ...result,
      [dayKey]: (result[dayKey] ?? 0) + getDurationHours(session),
    };
  }, {});

const getHeatmap = ({
  dayKeys,
  hoursByDay,
}: {
  dayKeys: readonly string[];
  hoursByDay: Record<string, number>;
}): readonly HeatmapCell[] =>
  dayKeys.map((dateKey) => ({
    id: dateKey,
    value: hoursByDay[dateKey] ?? 0,
  }));

const getLastMonthKeys = (): readonly string[] => {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));

    return getMonthKey(date);
  });
};

const getMonthlyHours = (sessions: readonly FastSession[]): readonly BarDatum[] => {
  const monthKeys = getLastMonthKeys();
  const hoursByMonth = sessions.reduce<Record<string, number>>((result, session) => {
    const monthKey = getMonthKey(new Date(session.startedAt));

    return {
      ...result,
      [monthKey]: (result[monthKey] ?? 0) + getDurationHours(session),
    };
  }, {});

  return monthKeys.map((monthKey) => ({
    label: monthKey.slice(5),
    value: hoursByMonth[monthKey] ?? 0,
  }));
};

const getDurationDistribution = (sessions: readonly FastSession[]): readonly BarDatum[] => {
  const buckets = [
    { label: '<12h', min: 0, max: 12 },
    { label: '12-16h', min: 12, max: 16 },
    { label: '16-20h', min: 16, max: 20 },
    { label: '20h+', min: 20, max: Number.POSITIVE_INFINITY },
  ];

  return buckets.map((bucket) => ({
    label: bucket.label,
    value: sessions.filter((session) => {
      const hours = getDurationHours(session);

      return hours >= bucket.min && hours < bucket.max;
    }).length,
  }));
};

const getGoalAchievementRate = (sessions: readonly FastSession[]): number => {
  if (sessions.length === 0) {
    return 0;
  }

  const achievedCount = sessions.filter(
    (session) => getDurationHours(session) >= session.goalDurationHours,
  ).length;

  return achievedCount / sessions.length;
};

const getGraphData = (history: HistoryState): GraphData => {
  const completedSessions = getCompletedSessions(history);
  const hoursByDay = getHoursByDay(completedSessions);

  return {
    weeklyHeatmap: getHeatmap({
      dayKeys: getRangeDayKeys(7),
      hoursByDay,
    }),
    monthlyHeatmap: getHeatmap({
      dayKeys: getRangeDayKeys(30),
      hoursByDay,
    }),
    yearlyHeatmap: getHeatmap({
      dayKeys: getRangeDayKeys(365),
      hoursByDay,
    }),
    monthlyHours: getMonthlyHours(completedSessions),
    durationDistribution: getDurationDistribution(completedSessions),
    completionRate:
      history.sessions.length === 0 ? 0 : completedSessions.length / history.sessions.length,
    goalAchievementRate: getGoalAchievementRate(completedSessions),
  };
};

const formatGraphHours = (hours: number): string =>
  `${hours < 10 ? hours.toFixed(1) : Math.round(hours).toString()}h`;

const formatGraphCount = (value: number): string => `${value}`;

const formatGraphPercent = (value: number): string => `${Math.round(value * 100)}%`;

export default function GraphsScreen() {
  const history = useHistoryState();
  const graphData = getGraphData(history);

  return (
    <ScreenScaffold title="Graphs" eyebrow="Visual summary">
      {history.sessions.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="No graph data yet"
          description="Complete a fast to build heatmaps and charts."
          action={{ label: 'Start a Fast', onPress: () => router.push('/') }}
        />
      ) : (
        <View style={styles.content}>
          <GraphSection title="Weekly heatmap">
            <HeatmapGrid cells={graphData.weeklyHeatmap} columns={7} />
          </GraphSection>

          <GraphSection title="Monthly heatmap">
            <HeatmapGrid cells={graphData.monthlyHeatmap} columns={10} />
          </GraphSection>

          <GraphSection title="Yearly heatmap">
            <HeatmapGrid cells={graphData.yearlyHeatmap} columns={26} compact />
          </GraphSection>

          <GraphSection title="Monthly hours">
            <VerticalBars data={graphData.monthlyHours} formatValue={formatGraphHours} />
          </GraphSection>

          <GraphSection title="Duration distribution">
            <HorizontalBars data={graphData.durationDistribution} formatValue={formatGraphCount} />
          </GraphSection>

          <GraphSection title="Completion">
            <ProgressMetric
              label="Completion rate"
              value={graphData.completionRate}
              formatValue={formatGraphPercent}
            />
            <ProgressMetric
              label="Goal achievement"
              value={graphData.goalAchievementRate}
              formatValue={formatGraphPercent}
            />
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
});
