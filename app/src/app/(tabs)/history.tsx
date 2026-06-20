import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control';

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
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
import {
  DataViewPreference,
  FastStatus,
  type FastSession,
  type HistoryState,
} from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';
import { setDataViewPreference, useSettings } from '@/storage/settings-storage';
import {
  getCompletionRate,
  getGoalAchievementRate,
  getLocalDayKey,
  getLocalMonthKey,
  getPreviousLocalDayKey,
  getRecentLocalDayKeys,
  getRecentLocalMonthKeys,
} from '@/utils/fasting-statistics';

type DataView = DataViewPreference;

type FastingStats = {
  currentStreakDays: number;
  longestStreakDays: number;
  longestFastHours: number;
  averageDurationHours: number;
  completionRate: number;
  goalAchievementRate: number;
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
  goalAchievementRate: number;
};

const dataViews: readonly { label: string; value: DataView }[] = [
  { label: 'Stats', value: DataViewPreference.Stats },
  { label: 'Graphs', value: DataViewPreference.Graphs },
  { label: 'History', value: DataViewPreference.History },
];

const getCompletedSessions = (history: HistoryState): readonly FastSession[] =>
  history.sessions.filter((session) => session.status === FastStatus.Completed);

const getCompletedDayKeys = (completedSessions: readonly FastSession[]): readonly string[] =>
  Array.from(
    new Set(completedSessions.map((session) => getLocalDayKey(new Date(session.startedAt)))),
  )
    .sort()
    .reverse();

const getCurrentStreakDays = (completedDayKeys: readonly string[]): number => {
  const completedDaySet = new Set(completedDayKeys);
  const todayKey = getLocalDayKey(new Date());
  const yesterdayKey = getPreviousLocalDayKey(todayKey);
  const streakStartKey = completedDaySet.has(todayKey) ? todayKey : yesterdayKey;
  let streak = 0;
  let cursor = streakStartKey;

  while (completedDaySet.has(cursor)) {
    streak += 1;
    cursor = getPreviousLocalDayKey(cursor);
  }

  return streak;
};

const getLongestStreakDays = (completedDayKeys: readonly string[]): number => {
  let longestStreak = 0;
  let currentStreak = 0;
  let previousDayKey: string | null = null;

  [...completedDayKeys].reverse().forEach((dayKey) => {
    currentStreak =
      previousDayKey !== null && getPreviousLocalDayKey(dayKey) === previousDayKey
        ? currentStreak + 1
        : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDayKey = dayKey;
  });

  return longestStreak;
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
    goalAchievementRate: getGoalAchievementRate(completedSessions),
    totalHours,
    totalFasts: completedSessions.length,
  };
};

const getHoursByDay = (sessions: readonly FastSession[]): Record<string, number> =>
  sessions.reduce<Record<string, number>>((result, session) => {
    const dayKey = getLocalDayKey(new Date(session.startedAt));

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

const getMonthlyHours = (sessions: readonly FastSession[]): readonly BarDatum[] => {
  const hoursByMonth = sessions.reduce<Record<string, number>>((result, session) => {
    const monthKey = getLocalMonthKey(new Date(session.startedAt));

    return {
      ...result,
      [monthKey]: (result[monthKey] ?? 0) + getSessionDurationHours(session),
    };
  }, {});

  return getRecentLocalMonthKeys(6).map((monthKey) => ({
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
    weeklyHeatmap: getHeatmap({ dayKeys: getRecentLocalDayKeys(7), hoursByDay }),
    monthlyHeatmap: getHeatmap({ dayKeys: getRecentLocalDayKeys(30), hoursByDay }),
    yearlyHeatmap: getHeatmap({ dayKeys: getRecentLocalDayKeys(365), hoursByDay }),
    monthlyHours: getMonthlyHours(completedSessions),
    durationDistribution: getDurationDistribution(completedSessions),
    completionRate: getCompletionRate(completedSessions),
    goalAchievementRate: getGoalAchievementRate(completedSessions),
  };
};

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const formatGraphHours = (hours: number): string => `${formatHours(hours)}h`;

const formatGraphCount = (value: number): string => `${value}`;

const formatGoalLabel = (goalDurationHours: number): string =>
  goalDurationHours <= 0 ? 'Unlimited' : `${goalDurationHours} hour goal`;

const formatLocaleDateTime = (timestamp: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));

export default function DataScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screen}>
      <View style={styles.screenContent}>
        <ThemedText type="subtitle" accessibilityRole="header">
          History
        </ThemedText>
        <DataPanel showActiveFast />
      </View>
    </ScrollView>
  );
}

function DataPanel({ showActiveFast = false }: { showActiveFast?: boolean }) {
  const historyState = useHistoryState();
  const activeFastState = useActiveFastState();
  const settings = useSettings();
  const [selectedView, setSelectedView] = useState<DataView>(settings.dataViewPreference);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const activeSession = showActiveFast ? activeFastState.session : null;
  const hasActiveFast = activeSession !== null;
  const hasData = hasActiveFast || historyState.sessions.length > 0;

  useEffect(() => {
    if (!hasActiveFast) return;

    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => clearInterval(interval);
  }, [hasActiveFast]);
  const selectDataView = (view: DataView): void => {
    setSelectedView(view);

    if (view !== settings.dataViewPreference) {
      setDataViewPreference(view);
    }
  };

  return (
    <View style={styles.panel}>
      <DataViewPicker selectedView={selectedView} onSelect={selectDataView} />
      {hasData ? (
        <>
          {hasActiveFast && selectedView === DataViewPreference.History && (
            <ActiveHistoryItem session={activeSession} currentTime={currentTime} />
          )}
          {selectedView === DataViewPreference.History && (
            <HistoryList sessions={historyState.sessions} />
          )}
          {selectedView === DataViewPreference.Stats && <StatsPanel history={historyState} />}
          {selectedView === DataViewPreference.Graphs && <GraphsPanel history={historyState} />}
        </>
      ) : (
        <FeedbackState
          kind="empty"
          title="No fasting data yet"
          description="Start a fast to build stats, graphs, and history."
          action={{ label: 'Start a Fast', onPress: () => router.push('/') }}
        />
      )}
    </View>
  );
}

function DataViewPicker({
  selectedView,
  onSelect,
}: {
  selectedView: DataView;
  onSelect: (view: DataView) => void;
}) {
  const theme = useTheme();
  const selectedIndex = Math.max(
    0,
    dataViews.findIndex((view) => view.value === selectedView),
  );

  return (
    <ExpoSegmentedControl
      values={dataViews.map((view) => view.label)}
      selectedIndex={selectedIndex}
      onValueChange={(label) => {
        const view = dataViews.find((option) => option.label === label);
        if (view !== undefined) onSelect(view.value);
      }}
      tintColor={theme.accent}
      style={styles.viewPicker}
    />
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
  const editSession = (event?: GestureResponderEvent): void => {
    event?.stopPropagation();
    router.push(`/history/${session.id}`);
  };
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
      onPress={editSession}
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
            session.endedAt === null ? 'In progress' : formatLocaleDateTime(session.endedAt)
          }
        />
      </View>
      <View style={styles.itemActions}>
        <IconButton label="Edit fast" symbol={{ ios: 'pencil', android: 'edit', web: 'edit' }} onPress={editSession} />
        <IconButton
          label="Delete fast"
          symbol={{ ios: 'trash', android: 'delete', web: 'delete' }}
          onPress={deleteSession}
        />
      </View>
    </Pressable>
  );
}

function IconButton({
  label,
  symbol,
  onPress,
}: {
  label: string;
  symbol: { ios: 'pencil' | 'trash'; android: 'edit' | 'delete'; web: 'edit' | 'delete' };
  onPress: (event: GestureResponderEvent) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <SymbolView
        name={symbol}
        size={20}
        tintColor={theme.textSecondary}
        fallback={
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
        }
      />
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
        {formatLocaleDateTime(session.startedAt)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {endedLabel}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {session.status} · {formatGoalLabel(session.goalDurationHours)}
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
    <AppSurface padded={false} style={styles.statList}>
      <StatRow label="Current streak" value={`${stats.currentStreakDays} days`} />
      <StatRow label="Longest streak" value={`${stats.longestStreakDays} days`} />
      <StatRow label="Longest fast" value={`${formatHours(stats.longestFastHours)} h`} />
      <StatRow label="Average duration" value={`${formatHours(stats.averageDurationHours)} h`} />
      <StatRow label="Completion rate" value={formatPercent(stats.completionRate)} />
      <StatRow label="Goal achievement" value={formatPercent(stats.goalAchievementRate)} />
      <StatRow label="Total hours" value={`${formatHours(stats.totalHours)} h`} emphasized />
      <StatRow label="Total fasts" value={`${stats.totalFasts}`} last />
    </AppSurface>
  );
}

function StatRow({
  label,
  value,
  emphasized = false,
  last = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  last?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.statRow,
        !last && { borderBottomColor: theme.backgroundSelected, borderBottomWidth: 1 },
      ]}>
      <ThemedText>{label}</ThemedText>
      <ThemedText
        selectable
        style={[styles.statValue, emphasized && { color: theme.accent }]}>
        {value}
      </ThemedText>
    </View>
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

      <GraphSection title="Goal achievement">
        <ProgressMetric
          label="Goals reached"
          value={graphData.goalAchievementRate}
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
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.four,
  },
  screenContent: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 640),
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  panel: {
    gap: Spacing.three,
  },
  viewPicker: {
    minHeight: 36,
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
  itemActions: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  iconButton: {
    width: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statList: {
    overflow: 'hidden',
  },
  statRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
