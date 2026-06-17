import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { router } from 'expo-router';

import { AppSurface } from '@/components/app-surface';
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
import {
  deleteFastSession,
  formatDuration,
  formatHours,
  getElapsedSeconds,
  getSessionDurationHours,
  getSessionDurationSeconds,
  useActiveFastState,
  useHistoryState,
} from '@/storage/fasting-storage';
import { FastStatus, type FastSession, type HistoryState } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';

type DataView = 'history' | 'stats' | 'graphs';

type FastingStats = {
  currentStreakDays: number;
  longestStreakDays: number;
  longestFastHours: number;
  averageDurationHours: number;
  completionRate: number;
  totalHours: number;
  totalFasts: number;
};

type GraphData = {
  weeklyHeatmap: readonly HeatmapCell[];
  monthlyHeatmap: readonly HeatmapCell[];
  yearlyHeatmap: readonly HeatmapCell[];
  monthlyHours: readonly BarDatum[];
  durationDistribution: readonly BarDatum[];
  completionRate: number;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;
const dataViews: readonly { label: string; value: DataView }[] = [
  { label: 'Stats', value: 'stats' },
  { label: 'Graphs', value: 'graphs' },
  { label: 'History', value: 'history' },
];

const getDayKey = (date: Date): string => date.toISOString().slice(0, 10);

const getMonthKey = (date: Date): string => date.toISOString().slice(0, 7);

const getPreviousDayKey = (dayKey: string): string => {
  const date = new Date(`${dayKey}T00:00:00.000Z`);

  return getDayKey(new Date(date.getTime() - dayMilliseconds));
};

const getCompletedSessions = (history: HistoryState): readonly FastSession[] =>
  history.sessions.filter((session) => session.status === FastStatus.Completed);

const getCompletedDayKeys = (completedSessions: readonly FastSession[]): readonly string[] =>
  Array.from(new Set(completedSessions.map((session) => getDayKey(new Date(session.startedAt)))))
    .sort()
    .reverse();

const getCurrentStreakDays = (completedDayKeys: readonly string[]): number => {
  const completedDaySet = new Set(completedDayKeys);
  const todayKey = getDayKey(new Date());
  const yesterdayKey = getPreviousDayKey(todayKey);
  const streakStartKey = completedDaySet.has(todayKey) ? todayKey : yesterdayKey;
  let streak = 0;
  let cursor = streakStartKey;

  while (completedDaySet.has(cursor)) {
    streak += 1;
    cursor = getPreviousDayKey(cursor);
  }

  return streak;
};

const getLongestStreakDays = (completedDayKeys: readonly string[]): number => {
  let longestStreak = 0;
  let currentStreak = 0;
  let previousDayKey: string | null = null;

  [...completedDayKeys].reverse().forEach((dayKey) => {
    currentStreak =
      previousDayKey !== null && getPreviousDayKey(dayKey) === previousDayKey
        ? currentStreak + 1
        : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDayKey = dayKey;
  });

  return longestStreak;
};

const getCompletionRate = (sessions: readonly FastSession[]): number => {
  const totalGoalHours = sessions.reduce((total, session) => total + session.goalDurationHours, 0);

  if (totalGoalHours === 0) {
    return 0;
  }

  const totalFastedHours = sessions.reduce(
    (total, session) => total + getSessionDurationHours(session),
    0,
  );

  return totalFastedHours / totalGoalHours;
};

const getFastingStats = (history: HistoryState): FastingStats => {
  const completedSessions = getCompletedSessions(history);
  const durations = completedSessions.map(getSessionDurationHours);
  const totalHours = durations.reduce((total, duration) => total + duration, 0);
  const completedDayKeys = getCompletedDayKeys(completedSessions);

  return {
    currentStreakDays: getCurrentStreakDays(completedDayKeys),
    longestStreakDays: getLongestStreakDays(completedDayKeys),
    longestFastHours: durations.length === 0 ? 0 : Math.max(...durations),
    averageDurationHours:
      completedSessions.length === 0 ? 0 : totalHours / completedSessions.length,
    completionRate: getCompletionRate(completedSessions),
    totalHours,
    totalFasts: completedSessions.length,
  };
};

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
      [dayKey]: (result[dayKey] ?? 0) + getSessionDurationHours(session),
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
  const hoursByMonth = sessions.reduce<Record<string, number>>((result, session) => {
    const monthKey = getMonthKey(new Date(session.startedAt));

    return {
      ...result,
      [monthKey]: (result[monthKey] ?? 0) + getSessionDurationHours(session),
    };
  }, {});

  return getLastMonthKeys().map((monthKey) => ({
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
      const hours = getSessionDurationHours(session);

      return hours >= bucket.min && hours < bucket.max;
    }).length,
  }));
};

const getGraphData = (history: HistoryState): GraphData => {
  const completedSessions = getCompletedSessions(history);
  const hoursByDay = getHoursByDay(completedSessions);

  return {
    weeklyHeatmap: getHeatmap({ dayKeys: getRangeDayKeys(7), hoursByDay }),
    monthlyHeatmap: getHeatmap({ dayKeys: getRangeDayKeys(30), hoursByDay }),
    yearlyHeatmap: getHeatmap({ dayKeys: getRangeDayKeys(365), hoursByDay }),
    monthlyHours: getMonthlyHours(completedSessions),
    durationDistribution: getDurationDistribution(completedSessions),
    completionRate: getCompletionRate(completedSessions),
  };
};

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const formatGraphHours = (hours: number): string => `${formatHours(hours)}h`;

const formatGraphCount = (value: number): string => `${value}`;

export default function DataScreen() {
  return (
    <ScreenScaffold title="Data" eyebrow="History and trends">
      <DataPanel showActiveFast />
    </ScreenScaffold>
  );
}

export function DataPanel({ showActiveFast = false }: { showActiveFast?: boolean }) {
  const historyState = useHistoryState();
  const activeFastState = useActiveFastState();
  const [selectedView, setSelectedView] = useState<DataView>('stats');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const activeSession = showActiveFast ? activeFastState.session : null;
  const hasActiveFast = activeSession !== null;
  const hasData = hasActiveFast || historyState.sessions.length > 0;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <DataViewPicker selectedView={selectedView} onSelect={setSelectedView} />
      {hasData ? (
        <>
          {hasActiveFast && (
            <ActiveHistoryItem session={activeSession} currentTime={currentTime} />
          )}
          {selectedView === 'history' && <HistoryList sessions={historyState.sessions} />}
          {selectedView === 'stats' && <StatsPanel history={historyState} />}
          {selectedView === 'graphs' && <GraphsPanel history={historyState} />}
        </>
      ) : (
        <FeedbackState
          kind="empty"
          title="No fasting data yet"
          description="Start a fast to build stats, graphs, and history."
          action={{ label: 'Start a Fast', onPress: () => router.push('/') }}
        />
      )}
    </>
  );
}

function DataViewPicker({
  selectedView,
  onSelect,
}: {
  selectedView: DataView;
  onSelect: (view: DataView) => void;
}) {
  return (
    <View style={styles.viewPicker}>
      {dataViews.map((view) => (
        <DataViewButton
          key={view.value}
          label={view.label}
          selected={view.value === selectedView}
          onPress={() => onSelect(view.value)}
        />
      ))}
    </View>
  );
}

function DataViewButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.viewButton,
        {
          backgroundColor: selected ? theme.accentBackground : 'transparent',
          borderColor: selected ? theme.accentBorder : theme.backgroundSelected,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ActiveHistoryItem({
  session,
  currentTime,
}: {
  session: FastSession;
  currentTime: number;
}) {
  return (
    <AppSurface style={styles.activeItem}>
      <ThemedText type="smallBold" themeColor="accent">
        Active fast
      </ThemedText>
      <HistorySummary
        session={session}
        durationSeconds={getElapsedSeconds(session, currentTime)}
        endedLabel="In progress"
      />
    </AppSurface>
  );
}

function HistoryList({ sessions }: { sessions: readonly FastSession[] }) {
  if (sessions.length === 0) {
    return (
      <FeedbackState
        kind="empty"
        title="No completed fasts yet"
        description="Your active fast is shown above. Completed fasts will appear here."
      />
    );
  }

  return (
    <View style={styles.list}>
      {sessions.map((session) => (
        <HistoryItem key={session.id} session={session} />
      ))}
    </View>
  );
}

function HistoryItem({ session }: { session: FastSession }) {
  const theme = useTheme();
  const deleteSession = (event?: GestureResponderEvent): void => {
    event?.stopPropagation();

    Alert.alert('Delete fast?', 'This removes the session from local history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteFastSession(session.id),
      },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/history/${session.id}`)}
      style={({ pressed }) => [
        styles.item,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <View style={styles.itemText}>
        <HistorySummary
          session={session}
          durationSeconds={getSessionDurationSeconds(session)}
          endedLabel={
            session.endedAt === null ? 'Not ended' : new Date(session.endedAt).toLocaleString()
          }
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={deleteSession}
        style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          Delete
        </ThemedText>
      </Pressable>
    </Pressable>
  );
}

function HistorySummary({
  session,
  durationSeconds,
  endedLabel,
}: {
  session: FastSession;
  durationSeconds: number;
  endedLabel: string;
}) {
  return (
    <>
      <ThemedText type="smallBold">{formatDuration(durationSeconds)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Started {new Date(session.startedAt).toLocaleString()}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Ended {endedLabel}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {session.status} · {session.goalDurationHours} hour goal
      </ThemedText>
      {session.reason !== null && (
        <ThemedText type="small" themeColor="textSecondary">
          {session.reason}
        </ThemedText>
      )}
    </>
  );
}

function StatsPanel({ history }: { history: HistoryState }) {
  const stats = getFastingStats(history);

  return (
    <View style={styles.grid}>
      <StatCard label="Current streak" value={`${stats.currentStreakDays}`} suffix="days" />
      <StatCard label="Longest streak" value={`${stats.longestStreakDays}`} suffix="days" />
      <StatCard label="Longest fast" value={formatHours(stats.longestFastHours)} suffix="h" />
      <StatCard label="Average duration" value={formatHours(stats.averageDurationHours)} suffix="h" />
      <StatCard label="Completion rate" value={formatPercent(stats.completionRate)} />
      <StatCard label="Total hours" value={formatHours(stats.totalHours)} suffix="h" />
      <StatCard label="Total fasts" value={`${stats.totalFasts}`} />
    </View>
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
  return (
    <AppSurface style={styles.card}>
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
    </AppSurface>
  );
}

function GraphsPanel({ history }: { history: HistoryState }) {
  const graphData = getGraphData(history);

  return (
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
          formatValue={formatPercent}
        />
      </GraphSection>
    </View>
  );
}

function GraphSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AppSurface style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </AppSurface>
  );
}

const styles = StyleSheet.create({
  viewPicker: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  viewButton: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  activeItem: {
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  item: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  itemText: {
    flex: 1,
    gap: Spacing.one,
  },
  deleteButton: {
    minHeight: 40,
    justifyContent: 'center',
  },
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
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  content: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.72,
  },
});
