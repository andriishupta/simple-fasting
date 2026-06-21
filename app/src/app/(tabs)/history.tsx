import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeInUp, FadingTransition } from 'react-native-reanimated';

import { AppSurface } from '@/components/app-surface';
import {
  CompletionDonut,
  FastingBarChart,
  FastingLineChart,
  HeatmapGrid,
} from '@/components/charts/fasting-charts';
import { FeedbackState } from '@/components/feedback-state';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  deleteFastSession,
  formatDuration,
  formatHours,
  getSessionDurationSeconds,
  useHistoryState,
} from '@/storage/fasting-storage';
import {
  DataViewPreference,
  type FastSession,
  type HistoryState,
} from '@/storage/app-storage';
import { useAppThemeColorScheme, useTheme } from '@/hooks/use-theme';
import { setDataViewPreference, useSettings } from '@/storage/settings-storage';
import { getChartData, getCompletedSessions, getFastingStats } from '@/utils/fasting-analytics';

type DataView = DataViewPreference;

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const formatChartHours = (hours: number): string => `${formatHours(hours)}h`;

const formatGoalLabel = (goalDurationHours: number): string =>
  goalDurationHours <= 0 ? 'Open-ended' : `${goalDurationHours}h goal`;

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
          Data
        </ThemedText>
        <DataPanel />
      </View>
    </ScrollView>
  );
}

function DataPanel() {
  const historyState = useHistoryState();
  const settings = useSettings();
  const [selectedView, setSelectedView] = useState<DataView>(settings.dataViewPreference);
  const hasData = historyState.sessions.length > 0;
  const selectDataView = (view: DataView): void => {
    setSelectedView(view);

    if (view !== settings.dataViewPreference) {
      setDataViewPreference(view);
    }
  };

  return (
    <View style={styles.panel}>
      <DataViewPicker
        selectedView={selectedView}
        historyCount={getCompletedSessions(historyState).length}
        onSelect={selectDataView}
      />
      {hasData ? (
        <>
          {selectedView === DataViewPreference.History && (
            <HistoryList sessions={historyState.sessions} />
          )}
          {selectedView === DataViewPreference.Stats && <StatsPanel history={historyState} />}
          {selectedView === DataViewPreference.Charts && <ChartsPanel history={historyState} />}
        </>
      ) : (
        <FeedbackState
          kind="empty"
          title="No fasting data yet"
          description="Start a fast to build stats, charts, and history."
          action={{ label: 'Start a Fast', onPress: () => router.push('/') }}
        />
      )}
    </View>
  );
}

function DataViewPicker({
  selectedView,
  historyCount,
  onSelect,
}: {
  selectedView: DataView;
  historyCount: number;
  onSelect: (view: DataView) => void;
}) {
  const theme = useTheme();
  const colorScheme = useAppThemeColorScheme();
  const dataViews: readonly { label: string; value: DataView }[] = [
    { label: 'Stats', value: DataViewPreference.Stats },
    { label: 'Charts', value: DataViewPreference.Charts },
    {
      label: `History (${historyCount > 99 ? '99+' : historyCount})`,
      value: DataViewPreference.History,
    },
  ];
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
      appearance={colorScheme}
      style={styles.viewPicker}
    />
  );
}

function HistoryList({ sessions }: { sessions: readonly FastSession[] }) {
  if (sessions.length === 0) {
    return (
      <FeedbackState
        kind="empty"
        title="No completed fasts yet"
        description="Completed fasts will appear here."
      />
    );
  }

  return (
    <View style={styles.list}>
      {sessions.map((session, index) => (
        <HistoryItem key={session.id} session={session} index={index} />
      ))}
    </View>
  );
}

function HistoryItem({ session, index }: { session: FastSession; index: number }) {
  const theme = useTheme();
  const editSession = (): void => router.push(`/history/${session.id}`);
  const deleteSession = (): void => {
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
    <Animated.View
      entering={FadeInUp.delay(Math.min(index, 5) * 35).duration(180)}
      style={styles.swipeContainer}>
      <ReanimatedSwipeable
        friction={1.5}
        rightThreshold={44}
        overshootRight={false}
        renderRightActions={() => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete fast"
            onPress={deleteSession}
            style={[styles.deleteAction, { backgroundColor: theme.danger }]}>
            <Trash2 size={22} color={theme.dangerForeground} strokeWidth={2} />
            <ThemedText type="smallBold" style={{ color: theme.dangerForeground }}>
              Delete
            </ThemedText>
          </Pressable>
        )}>
        <Pressable
          accessibilityRole="button"
          onPress={editSession}
          style={({ pressed }) => [
            styles.item,
            { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
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
          <ChevronRight size={18} color={theme.textSecondary} />
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
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
  const theme = useTheme();
  const progress =
    session.goalDurationHours > 0
      ? durationSeconds / (session.goalDurationHours * 3600)
      : null;

  return (
    <View style={styles.historySummary}>
      <View style={styles.historyTopLine}>
        <View style={styles.durationGroup}>
          <ThemedText type="small" themeColor="textSecondary">Duration</ThemedText>
          <View style={styles.durationLine}>
            <ThemedText type="smallBold">{formatDuration(durationSeconds)}</ThemedText>
            <View style={[styles.goalPill, { backgroundColor: theme.accentBackground }]}>
              <ThemedText type="smallBold" themeColor="accent">
                {formatGoalLabel(session.goalDurationHours)}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
      {progress !== null ? (
        <View
          accessible
          accessibilityLabel={`${Math.round(progress * 100)}% of goal`}
          style={[styles.historyProgressTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.historyProgressFill,
              { backgroundColor: theme.accent, width: `${Math.min(100, progress * 100)}%` },
            ]}
          />
        </View>
      ) : null}
      <View style={styles.historyTimes}>
        <HistoryTime label="Started" value={formatLocaleDateTime(session.startedAt)} />
        <HistoryTime label="Ended" value={endedLabel} />
      </View>
      {session.reason !== null && (
        <ThemedText type="small" themeColor="textSecondary">
          {session.reason}
        </ThemedText>
      )}
    </View>
  );
}

function HistoryTime({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.historyTime}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold" selectable>{value}</ThemedText>
    </View>
  );
}

function StatsPanel({ history }: { history: HistoryState }) {
  const stats = getFastingStats(history);

  return (
    <View style={styles.statGrid}>
      <StatTile label="Current streak" value={`${stats.currentStreakDays} days`} />
      <StatTile label="Total hours" value={`${formatHours(stats.totalHours)} h`} />
      <StatTile label="Longest streak" value={`${stats.longestStreakDays} days`} />
      <StatTile label="Longest fast" value={`${formatHours(stats.longestFastHours)} h`} />
      <StatTile label="Average duration" value={`${formatHours(stats.averageDurationHours)} h`} />
      <StatTile label="Total fasts" value={`${stats.totalFasts}`} />
      <StatTile label="Completion rate" value={formatPercent(stats.completionRate)} />
    </View>
  );
}

function StatTile({ label, value }: {
  label: string;
  value: string;
}) {
  return (
    <AppSurface style={styles.statTile}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText selectable style={styles.statValue}>
        {value}
      </ThemedText>
    </AppSurface>
  );
}

function ChartsPanel({ history }: { history: HistoryState }) {
  const chartData = getChartData(history);

  return (
    <Animated.View entering={FadeIn.duration(180)} layout={FadingTransition} style={styles.content}>
      <ChartSection title="Recent fast duration" description="Your last seven completed fasts">
        <FastingLineChart data={chartData.recentDurations} formatValue={formatChartHours} />
      </ChartSection>

      <ChartSection title="Monthly fasting hours" description="Total hours over the last six months">
        <FastingBarChart data={chartData.monthlyHours} formatValue={formatChartHours} />
      </ChartSection>

      <ChartSection title="Goal completion" description="Average progress across planned fasts">
        <CompletionDonut value={chartData.completionRate} />
      </ChartSection>

      <ChartSection title="This week">
        <HeatmapGrid cells={chartData.weeklyHeatmap} columns={7} />
      </ChartSection>

      <ChartSection title="Last 30 days">
        <HeatmapGrid cells={chartData.monthlyHeatmap} columns={10} />
      </ChartSection>

      <ChartSection title="Last year">
        <HeatmapGrid cells={chartData.yearlyHeatmap} columns={26} compact />
      </ChartSection>

      <ChartSection title="Duration mix" description="Completed fasts grouped by length">
        <FastingBarChart data={chartData.durationDistribution} formatValue={(value) => `${value}`} />
      </ChartSection>
    </Animated.View>
  );
}

function ChartSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <AppSurface style={styles.section}>
      <View style={styles.sectionHeading}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {description !== undefined ? (
          <ThemedText type="small" themeColor="textSecondary">{description}</ThemedText>
        ) : null}
      </View>
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
  list: {
    gap: Spacing.two,
  },
  item: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  swipeContainer: { overflow: 'hidden', borderRadius: Radius.surface, borderCurve: 'continuous' },
  deleteAction: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  itemText: {
    flex: 1,
  },
  historySummary: { gap: Spacing.two },
  historyTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  durationGroup: { gap: Spacing.half },
  durationLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  goalPill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  historyProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  historyProgressFill: { height: '100%', borderRadius: 3 },
  historyTimes: { flexDirection: 'row', gap: Spacing.three },
  historyTime: { flex: 1, gap: Spacing.half },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statTile: {
    width: '48%',
    minHeight: 104,
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: Spacing.two,
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
    overflow: 'hidden',
  },
  sectionHeading: { gap: Spacing.half },
  pressed: {
    opacity: 0.72,
  },
});
