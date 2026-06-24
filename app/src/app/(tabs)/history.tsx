import { memo, useMemo, useState } from 'react';
import {
  Alert,
  InteractionManager,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control';
import { Check, ChevronRight, Trash2 } from 'lucide-react-native';
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
import { ScreenHeading } from '@/components/screen-heading';
import { TabScreenShell } from '@/components/tab-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  deleteFastSession,
  deleteFastSessions,
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
import { getChartData, getFastingStats, type ChartData } from '@/utils/fasting-analytics';
import { formatGoalDuration } from '@/utils/fast-goals';
import { getLocalDayKey } from '@/utils/fasting-statistics';

type DataView = DataViewPreference;

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const formatChartHours = (hours: number): string => `${formatHours(hours)}h`;

const formatLocaleDateTime = (timestamp: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));

let chartDataCache: { key: string; value: ChartData } | null = null;

const getChartDataCacheKey = (history: HistoryState, locale?: string): string =>
  [
    history.updatedAt,
    history.sessions.length,
    history.sessions[0]?.id ?? 'none',
    history.sessions[0]?.updatedAt ?? 'none',
    getLocalDayKey(new Date()),
    locale ?? 'default',
  ].join(':');

const getCachedChartData = (history: HistoryState, locale?: string): ChartData => {
  const key = getChartDataCacheKey(history, locale);
  if (chartDataCache?.key === key) return chartDataCache.value;

  const value = getChartData(history, new Date(), locale);
  chartDataCache = { key, value };
  return value;
};

export default function DataScreen() {
  const { height } = useWindowDimensions();
  const settings = useSettings();
  const [selectedView, setSelectedView] = useState<DataView>(settings.dataViewPreference);
  const [chartsMounted, setChartsMounted] = useState(
    () => settings.dataViewPreference === DataViewPreference.Charts,
  );
  const shouldScroll = selectedView !== DataViewPreference.Stats || height < 700;
  const selectDataView = (view: DataView): void => {
    setSelectedView(view);
    if (view === DataViewPreference.Charts) setChartsMounted(true);

    if (view !== settings.dataViewPreference) {
      InteractionManager.runAfterInteractions(() => setDataViewPreference(view));
    }
  };

  return (
    <TabScreenShell
      scrollEnabled={shouldScroll}
      maxWidth={Math.min(MaxContentWidth, 640)}>
      <ScreenHeading>Data</ScreenHeading>
      <DataPanel
        chartsMounted={chartsMounted}
        selectedView={selectedView}
        onSelectView={selectDataView}
      />
    </TabScreenShell>
  );
}

function DataPanel({
  chartsMounted,
  selectedView,
  onSelectView,
}: {
  chartsMounted: boolean;
  selectedView: DataView;
  onSelectView: (view: DataView) => void;
}) {
  const historyState = useHistoryState();
  const hasData = historyState.sessions.length > 0;

  return (
    <View style={styles.panel}>
      <DataViewPicker
        selectedView={selectedView}
        onSelect={onSelectView}
      />
      {hasData ? (
        <>
          {selectedView === DataViewPreference.History && (
            <HistoryList sessions={historyState.sessions} />
          )}
          {selectedView === DataViewPreference.Stats && <StatsPanel history={historyState} />}
          {chartsMounted ? (
            <View
              pointerEvents={selectedView === DataViewPreference.Charts ? 'auto' : 'none'}
              style={selectedView === DataViewPreference.Charts ? undefined : styles.hiddenPanel}>
              <ChartsPanel history={historyState} />
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyState}>
          <FeedbackState
            kind="empty"
            title="Finish at least one fast"
            description="Your fasting data will appear here."
          />
        </View>
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
  const colorScheme = useAppThemeColorScheme();
  const dataViews: readonly { label: string; value: DataView }[] = [
    { label: 'Stats', value: DataViewPreference.Stats },
    { label: 'Charts', value: DataViewPreference.Charts },
    { label: 'History', value: DataViewPreference.History },
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
  const theme = useTheme();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const selecting = selectionMode;

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
      <View style={styles.listActions}>
        {selecting ? (
          <ThemedText type="small" themeColor="textSecondary">
            {selectedIds.size} selected
          </ThemedText>
        ) : (
          <View />
        )}
        <View style={styles.listActionButtons}>
          {selecting ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSelectedIds(new Set());
                setSelectionMode(false);
              }}
              style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">Cancel</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selecting ? 'Delete selected fasts' : 'Select fasts'}
            accessibilityState={{ disabled: selecting && selectedIds.size === 0 }}
            disabled={selecting && selectedIds.size === 0}
            onPress={() => {
              if (!selecting) {
                setSelectionMode(true);
                return;
              }
              if (selectedIds.size === 0) return;
              Alert.alert(
                `Delete ${selectedIds.size} fast${selectedIds.size === 1 ? '' : 's'}?`,
                'This permanently removes the selected sessions from local history.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      deleteFastSessions([...selectedIds]);
                      setSelectedIds(new Set());
                      setSelectionMode(false);
                    },
                  },
                ],
              );
            }}
            style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
            <ThemedText
              type="smallBold"
              style={
                selecting
                  ? { color: selectedIds.size === 0 ? theme.textSecondary : theme.danger }
                  : undefined
              }>
              {selecting ? 'Delete' : 'Select'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
      {sessions.map((session, index) => (
        <HistoryItem
          key={session.id}
          session={session}
          index={index}
          selecting={selecting}
          selected={selectedIds.has(session.id)}
          onToggle={() =>
            setSelectedIds((current) => {
              const next = new Set(current);
              if (next.has(session.id)) next.delete(session.id);
              else next.add(session.id);
              return next;
            })
          }
        />
      ))}
    </View>
  );
}

function HistoryItem({
  session,
  index,
  selecting,
  selected,
  onToggle,
}: {
  session: FastSession;
  index: number;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
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
      style={[
        styles.swipeContainer,
        { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
      ]}>
      <ReanimatedSwipeable
        enabled={!selecting}
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
          accessibilityState={{ selected }}
          onPress={selecting ? onToggle : editSession}
          style={({ pressed }) => [
            styles.item,
            { backgroundColor: theme.background },
            pressed && styles.pressed,
          ]}>
          {selecting ? (
            <View
              style={[
                styles.selectionIndicator,
                {
                  backgroundColor: selected ? theme.accent : 'transparent',
                  borderColor: selected ? theme.accent : theme.textSecondary,
                },
              ]}>
              {selected ? <Check size={15} color={theme.background} strokeWidth={3} /> : null}
            </View>
          ) : null}
          <View style={styles.itemText}>
            <HistorySummary
              session={session}
              durationSeconds={getSessionDurationSeconds(session)}
              showChevron={!selecting}
              endedLabel={
                session.endedAt === null ? 'In progress' : formatLocaleDateTime(session.endedAt)
              }
            />
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

function HistorySummary({
  session,
  durationSeconds,
  showChevron,
  endedLabel,
}: {
  session: FastSession;
  durationSeconds: number;
  showChevron: boolean;
  endedLabel: string;
}) {
  const theme = useTheme();
  const settings = useSettings();
  const progress =
    session.goalDurationHours > 0
      ? durationSeconds / (session.goalDurationHours * 3600)
      : null;

  return (
    <View style={styles.historySummary}>
      <View style={styles.historyTopLine}>
        <View style={styles.durationGroup}>
          <ThemedText type="small" themeColor="textSecondary">Duration</ThemedText>
          <ThemedText type="smallBold">{formatDuration(durationSeconds)}</ThemedText>
        </View>
        <View style={styles.goalAction}>
          <View style={[styles.goalPill, { backgroundColor: theme.accentBackground }]}>
            <ThemedText type="smallBold" themeColor="accent">
              {session.goalDurationHours <= 0
                ? 'Open-ended'
                : formatGoalDuration(session.goalDurationHours, settings.goalDurationFormat)}
            </ThemedText>
          </View>
          {showChevron ? <ChevronRight size={18} color={theme.textSecondary} /> : null}
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
        <View style={[styles.historyTimeDivider, { backgroundColor: theme.backgroundSelected }]} />
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
      <ThemedText type="small" themeColor="textSecondary" style={styles.historyTimeText}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" selectable style={styles.historyTimeText}>
        {value}
      </ThemedText>
    </View>
  );
}

function StatsPanel({ history }: { history: HistoryState }) {
  const stats = useMemo(() => getFastingStats(history), [history]);

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

const ChartsPanel = memo(function ChartsPanel({ history }: { history: HistoryState }) {
  const chartData = useMemo(() => getCachedChartData(history), [history]);

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
}, (previous, next) => previous.history.updatedAt === next.history.updatedAt);

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
  panel: {
    flex: 1,
    gap: Spacing.three,
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hiddenPanel: {
    display: 'none',
  },
  viewPicker: {
    minHeight: 36,
  },
  list: {
    gap: Spacing.two,
  },
  listActions: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listActionButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  textAction: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.two },
  item: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  swipeContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
  },
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
  historyTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  durationGroup: { gap: Spacing.half },
  goalAction: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
  },
  goalPill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  historyProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  historyProgressFill: { height: '100%', borderRadius: 3 },
  historyTimes: { flexDirection: 'row', alignItems: 'stretch' },
  historyTime: { flex: 1, alignItems: 'center', gap: Spacing.half },
  historyTimeText: { textAlign: 'center' },
  historyTimeDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.three,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statTile: {
    width: '48%',
    minHeight: 82,
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  statValue: {
    fontSize: 20,
    lineHeight: 25,
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
