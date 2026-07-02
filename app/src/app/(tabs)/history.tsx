import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control';
import { Check, ChevronRight, Circle } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AppSurface } from '@/components/app-surface';
import { FastingSummaryCard } from '@/components/fasting-summary-card';
import { FeedbackState } from '@/components/feedback-state';
import { ScreenHeading } from '@/components/screen-heading';
import { TabScreenShell } from '@/components/tab-screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
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
import { t } from '@/locales/i18n';
import {
  setDataViewPreference,
  useSettingsSelector,
} from '@/storage/settings-storage';
import { getFastingStats } from '@/utils/fasting-analytics';
import { formatGoalDuration } from '@/utils/fast-goals';

type VisibleDataView = DataViewPreference.Stats | DataViewPreference.History;

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const formatLocaleDateTime = (timestamp: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));

const visibleDataViews = [
  { labelKey: 'data.stats', value: DataViewPreference.Stats },
  { labelKey: 'data.history', value: DataViewPreference.History },
] as const;

const getVisibleDataView = (view: DataViewPreference): VisibleDataView =>
  visibleDataViews.find((option) => option.value === view)?.value ?? visibleDataViews[0].value;

export default function DataScreen() {
  const dataViewPreference = useSettingsSelector((settings) => settings.dataViewPreference);
  const [selectedView, setSelectedView] = useState<VisibleDataView>(() =>
    getVisibleDataView(dataViewPreference),
  );
  const selectDataView = (view: VisibleDataView): void => {
    setSelectedView(view);

    if (view !== dataViewPreference) {
      setDataViewPreference(view);
    }
  };

  return (
    <TabScreenShell
      scrollEnabled="auto"
      maxWidth={Math.min(MaxContentWidth, 640)}>
      <ScreenHeading>{t('data.title')}</ScreenHeading>
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
  selectedView: VisibleDataView;
  onSelectView: (view: VisibleDataView) => void;
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
        </>
      ) : (
        <View style={styles.emptyState}>
          <FeedbackState
            kind="empty"
            title={t('data.emptyTitle')}
            description={t('data.emptyDescription')}
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
  selectedView: VisibleDataView;
  onSelect: (view: VisibleDataView) => void;
}) {
  const theme = useTheme();
  const colorScheme = useAppThemeColorScheme();
  const selectedIndex = Math.max(
    0,
    visibleDataViews.findIndex((view) => view.value === selectedView),
  );

  return (
    <ExpoSegmentedControl
      values={visibleDataViews.map((view) => t(view.labelKey))}
      selectedIndex={selectedIndex}
      onValueChange={(label) => {
        const view = visibleDataViews.find((option) => t(option.labelKey) === label);
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
        title={t('data.noCompletedTitle')}
        description={t('data.noCompletedDescription')}
      />
    );
  }

  return (
    <View style={styles.list}>
      <View style={styles.listActions}>
        <View style={styles.listHeading}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.listTitle}>
            {t('data.completedCount', {
              count: sessions.length,
              label: sessions.length === 1 ? t('data.sessionSingular') : t('data.sessionPlural'),
            })}
          </ThemedText>
          {selecting ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('data.selectedCount', { count: selectedIds.size })}
            </ThemedText>
          ) : null}
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
              <ThemedText type="smallBold" themeColor="textSecondary">{t('common.cancel')}</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selecting ? t('data.deleteSelected') : t('data.selectSessions')}
            accessibilityState={{ disabled: selecting && selectedIds.size === 0 }}
            disabled={selecting && selectedIds.size === 0}
            onPress={() => {
              if (!selecting) {
                setSelectionMode(true);
                return;
              }
              if (selectedIds.size === 0) return;
              Alert.alert(
                t('data.deleteSelectedTitle', {
                  count: selectedIds.size,
                  label: selectedIds.size === 1 ? t('data.sessionSingular') : t('data.sessionPlural'),
                }),
                t('data.deleteSelectedMessage'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.delete'),
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
                {t('common.delete')}
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
  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index, 5) * 35).duration(180)}
      style={styles.historyItemRow}>
      {selecting ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selected ? t('data.deselectSession') : t('data.selectSession')}
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
          styles.itemContainer,
          { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
        ]}>
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
                session.endedAt === null ? t('common.inProgress') : formatLocaleDateTime(session.endedAt)
              }
            />
          </View>
        </Pressable>
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
          ? t('common.openEnded')
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
      title: t('data.statsOverview'),
      description: t('data.statsOverviewDescription'),
      rows: [
        {
          label: t('data.totalSessions'),
          description: t('data.totalSessionsDescription'),
          value: `${stats.totalFasts}`,
        },
        {
          label: t('data.totalHours'),
          description: t('data.totalHoursDescription'),
          value: `${formatHours(stats.totalHours)} h`,
        },
      ],
    },
    {
      title: t('data.statsDuration'),
      description: t('data.statsDurationDescription'),
      rows: [
        {
          label: t('data.averageDuration'),
          description: t('data.averageDurationDescription'),
          value: `${formatHours(stats.averageDurationHours)} h`,
        },
        {
          label: t('data.currentStreak'),
          description: t('data.currentStreakDescription'),
          value: t('data.daysValue', { count: stats.currentStreakDays }),
        },
        {
          label: t('data.longestStreak'),
          description: t('data.longestStreakDescription'),
          value: t('data.daysValue', { count: stats.longestStreakDays }),
        },
        {
          label: t('data.longestFast'),
          description: t('data.longestFastDescription'),
          value: `${formatHours(stats.longestFastHours)} h`,
        },
      ],
    },
    {
      title: t('data.statsGoals'),
      description: t('data.statsGoalsDescription'),
      rows: [
        {
          label: t('data.completionRate'),
          description: t('data.completionRateDescription'),
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
  itemContainer: {
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
  pressed: {
    opacity: 0.72,
  },
});
