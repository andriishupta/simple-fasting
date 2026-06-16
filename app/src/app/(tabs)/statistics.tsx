import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHistoryState } from '@/storage/fasting-storage';
import { FastStatus, type FastSession, type HistoryState } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';

type FastingStats = {
  currentStreakDays: number;
  longestStreakDays: number;
  longestFastHours: number;
  averageDurationHours: number;
  completionRate: number;
  totalHours: number;
  completedSessions: number;
  totalSessions: number;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;

const getDurationHours = (session: FastSession): number => {
  if (session.endedAt === null) {
    return 0;
  }

  return Math.max(
    0,
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 3_600_000,
  );
};

const getDayKey = (date: Date): string => date.toISOString().slice(0, 10);

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
  if (completedDayKeys.length === 0) {
    return 0;
  }

  const completedDaySet = new Set(completedDayKeys);
  const todayKey = getDayKey(new Date());
  const yesterdayKey = getPreviousDayKey(todayKey);
  const streakStartKey = completedDaySet.has(todayKey) ? todayKey : yesterdayKey;

  if (!completedDaySet.has(streakStartKey)) {
    return 0;
  }

  let streak = 0;
  let cursor = streakStartKey;

  while (completedDaySet.has(cursor)) {
    streak += 1;
    cursor = getPreviousDayKey(cursor);
  }

  return streak;
};

const getLongestStreakDays = (completedDayKeys: readonly string[]): number => {
  if (completedDayKeys.length === 0) {
    return 0;
  }

  const ascendingDayKeys = [...completedDayKeys].reverse();
  const result = ascendingDayKeys.reduce(
    (state, dayKey) => {
      const currentStreak =
        state.previousDayKey !== null && getPreviousDayKey(dayKey) === state.previousDayKey
          ? state.currentStreak + 1
          : 1;

      return {
        previousDayKey: dayKey,
        currentStreak,
        longestStreak: Math.max(state.longestStreak, currentStreak),
      };
    },
    {
      previousDayKey: null as string | null,
      currentStreak: 0,
      longestStreak: 0,
    },
  );

  return result.longestStreak;
};

const getFastingStats = (history: HistoryState): FastingStats => {
  const completedSessions = getCompletedSessions(history);
  const durations = completedSessions.map(getDurationHours);
  const totalHours = durations.reduce((total, duration) => total + duration, 0);
  const completedDayKeys = getCompletedDayKeys(completedSessions);

  return {
    currentStreakDays: getCurrentStreakDays(completedDayKeys),
    longestStreakDays: getLongestStreakDays(completedDayKeys),
    longestFastHours: durations.length === 0 ? 0 : Math.max(...durations),
    averageDurationHours:
      completedSessions.length === 0 ? 0 : totalHours / completedSessions.length,
    completionRate:
      history.sessions.length === 0 ? 0 : completedSessions.length / history.sessions.length,
    totalHours,
    completedSessions: completedSessions.length,
    totalSessions: history.sessions.length,
  };
};

const formatHours = (hours: number): string =>
  hours < 10 ? hours.toFixed(1) : Math.round(hours).toString();

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

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
