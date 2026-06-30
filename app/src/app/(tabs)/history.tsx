import { memo, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control';
import { Check, ChevronRight, Circle, Trash2 } from 'lucide-react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AppSection } from '@/components/app-section';
import { AppSurface } from '@/components/app-surface';
import { FastingSummaryCard } from '@/components/fasting-summary-card';
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
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
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
import {
  setDataViewPreference,
  useSettingsSelector,
} from '@/storage/settings-storage';
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

let chartDataCache: {
  dayKey: string;
  history: HistoryState;
  locale?: string;
  value: ChartData;
} | null = null;

const getCachedChartData = (history: HistoryState, locale?: string): ChartData => {
  const dayKey = getLocalDayKey(new Date());
  if (
    chartDataCache?.history === history &&
    chartDataCache.dayKey === dayKey &&
    chartDataCache.locale === locale
  ) {
    return chartDataCache.value;
  }

  const value = getChartData(history, new Date(), locale);
  chartDataCache = { dayKey, history, locale, value };
  return value;
};

export default function DataScreen() {
  const dataViewPreference = useSettingsSelector((settings) => settings.dataViewPreference);
  const [selectedView, setSelectedView] = useState<DataView>(dataViewPreference);
  const selectDataView = (view: DataView): void => {
    setSelectedView(view);

    if (view !== dataViewPreference) {
      setDataViewPreference(view);
    }
  };

  return (
    <TabScreenShell
      scrollEnabled="auto"
      maxWidth={Math.min(MaxContentWidth, 640)}>
      <ScreenHeading>Data</ScreenHeading>
      <DataPanel
        selectedView={selectedView}
        onSelectView={selectDataView}
      />
    </TabScreenShell>
  );
}

function DataPanel({
  selectedView,
  onSelectView,
}: {
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
          {selectedView === DataViewPreference.Charts ? <ChartsPanel history={historyState} /> : null}
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
        <View style={styles.listHeading}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.listTitle}>
            Completed fasts
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {selecting ? `${selectedIds.size} selected` : `${sessions.length}. Swipe left to delete an item.`}
          </ThemedText>
        </View>
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
            style={({ pressed }) => [
              selecting ? styles.textAction : styles.iconAction,
              pressed && styles.pressed,
            ]}>
            {selecting ? (
              <ThemedText
                type="smallBold"
                style={{ color: selectedIds.size === 0 ? theme.textSecondary : theme.danger }}>
                Delete
              </ThemedText>
            ) : (
              <Circle size={21} color={theme.textSecondary} strokeWidth={2.1} />
            )}
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
      style={styles.historyItemRow}>
      {selecting ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selected ? 'Deselect fast' : 'Select fast'}
          accessibilityState={{ selected }}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.selectionControl,
            {
              backgroundColor: selected ? theme.accent : 'transparent',
              borderColor: selected ? theme.accent : theme.textSecondary,
            },
            pressed && styles.pressed,
          ]}>
          {selected ? <Check size={15} color={theme.background} strokeWidth={3} /> : null}
        </Pressable>
      ) : null}
      <View
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
      </View>
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
  const goalDurationFormat = useSettingsSelector((settings) => settings.goalDurationFormat);
  const progress =
    session.goalDurationHours > 0
      ? durationSeconds / (session.goalDurationHours * 3600)
      : null;

  return (
    <FastingSummaryCard
      surface={false}
      duration={formatDuration(durationSeconds)}
      goalLabel={
        session.goalDurationHours <= 0
          ? 'Open-ended'
          : formatGoalDuration(session.goalDurationHours, goalDurationFormat)
      }
      progress={progress}
      started={formatLocaleDateTime(session.startedAt)}
      ended={endedLabel}
      trailing={showChevron ? <ChevronRight size={18} color={theme.textSecondary} /> : undefined}
      note={session.reason}
    />
  );
}

function StatsPanel({ history }: { history: HistoryState }) {
  const stats = useMemo(() => getFastingStats(history), [history]);
  const groups = [
    {
      title: 'Overview',
      description: 'Local totals from completed fasts.',
      rows: [
        {
          label: 'Total fasts',
          description: 'Completed fasts saved on this device.',
          value: `${stats.totalFasts}`,
        },
        {
          label: 'Total hours',
          description: 'Lifetime fasting hours saved on this device.',
          value: `${formatHours(stats.totalHours)} h`,
        },
      ],
    },
    {
      title: 'Duration',
      description: 'How long your fasts usually last.',
      rows: [
        {
          label: 'Average duration',
          description: 'Average length across completed fasts.',
          value: `${formatHours(stats.averageDurationHours)} h`,
        },
        {
          label: 'Current streak',
          description: 'Consecutive days with a completed fast.',
          value: `${stats.currentStreakDays} days`,
        },
        {
          label: 'Longest streak',
          description: 'Best run of consecutive fasting days.',
          value: `${stats.longestStreakDays} days`,
        },
        {
          label: 'Longest fast',
          description: 'Longest completed fast in your local history.',
          value: `${formatHours(stats.longestFastHours)} h`,
        },
      ],
    },
    {
      title: 'Goals',
      description: 'Planned fast goal performance.',
      rows: [
        {
          label: 'Completion rate',
          description: 'How often planned fasts reached their goal. Open-ended fasts do not count.',
          value: formatPercent(stats.completionRate),
        },
      ],
    },
  ] as const;

  return (
    <View style={styles.statGroups}>
      {groups.map((group, groupIndex) => (
        <StatGroup
          key={group.title}
          index={groupIndex}
          title={group.title}
          description={group.description}
          rows={group.rows}
        />
      ))}
    </View>
  );
}

function StatGroup({
  index,
  title,
  description,
  rows,
}: {
  index: number;
  title: string;
  description: string;
  rows: readonly {
    label: string;
    description: string;
    value: string;
  }[];
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index, 5) * 35).duration(180)}
      style={styles.statGroup}>
      <View style={styles.statGroupHeading}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.statGroupTitle}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <AppSurface padded={false} style={styles.statList}>
        {rows.map((row) => (
          <StatRow
            key={row.label}
            label={row.label}
            description={row.description}
            value={row.value}
          />
        ))}
      </AppSurface>
    </Animated.View>
  );
}

function StatRow({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string;
}) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <View style={styles.statValueWrap}>
        <ThemedText
          selectable
          themeColor="accent"
          style={styles.statValue}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const ChartsPanel = memo(function ChartsPanel({ history }: { history: HistoryState }) {
  const chartData = getCachedChartData(history);

  return (
    <View style={styles.content}>
      <ChartSection index={0} title="Recent fast duration" description="Your last seven completed fasts">
        <FastingLineChart data={chartData.recentDurations} formatValue={formatChartHours} />
      </ChartSection>

      <ChartSection index={1} title="Monthly fasting hours" description="Total hours over the last six months">
        <FastingBarChart data={chartData.monthlyHours} formatValue={formatChartHours} />
      </ChartSection>

      <ChartSection index={2} title="Goal completion" description="Average progress across planned fasts">
        <CompletionDonut value={chartData.completionRate} />
      </ChartSection>

      <ChartSection index={3} title="This week">
        <HeatmapGrid cells={chartData.weeklyHeatmap} columns={7} />
      </ChartSection>

      <ChartSection index={4} title="Last 30 days">
        <HeatmapGrid cells={chartData.monthlyHeatmap} columns={10} />
      </ChartSection>

      <ChartSection index={5} title="Last year">
        <HeatmapGrid cells={chartData.yearlyHeatmap} columns={26} compact />
      </ChartSection>

      <ChartSection index={6} title="Duration mix" description="Completed fasts grouped by length">
        <FastingBarChart data={chartData.durationDistribution} formatValue={(value) => `${value}`} />
      </ChartSection>
    </View>
  );
}, (previous, next) => previous.history.updatedAt === next.history.updatedAt);

function ChartSection({
  index,
  title,
  description,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 5) * 35).duration(180)}>
      <AppSection title={title} description={description}>
        <View style={styles.chartBody}>
        {children}
        </View>
      </AppSection>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    gap: Spacing.md,
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewPicker: {
    minHeight: 36,
  },
  list: {
    gap: Spacing.xs,
  },
  listActions: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listHeading: { flex: 1, gap: Spacing.xxxs },
  listTitle: { textTransform: 'uppercase' },
  listActionButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  textAction: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  iconAction: {
    width: 38,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  historyItemRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  swipeContainer: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
  },
  selectionControl: {
    width: 24,
    height: 24,
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
  statGroups: {
    gap: Spacing.lg,
  },
  statGroup: {
    width: '100%',
    gap: Spacing.xs,
  },
  statGroupHeading: {
    gap: Spacing.xxxs,
  },
  statGroupTitle: {
    textTransform: 'uppercase',
  },
  statList: {
    overflow: 'hidden',
  },
  statRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  statText: {
    flex: 1,
    gap: Spacing.xxxs,
  },
  statValueWrap: {
    width: 112,
    alignItems: 'flex-end',
  },
  statValue: {
    textAlign: 'right',
    fontSize: 19,
    lineHeight: 24,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  content: {
    gap: Spacing.md,
  },
  chartBody: {
    padding: Spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
