import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AppSection } from '@/components/app-section';
import {
  CompletionDonut,
  FastingBarChart,
  FastingLineChart,
  HeatmapGrid,
} from '@/components/charts/fasting-charts';
import { Spacing } from '@/constants/theme';
import { t } from '@/locales/i18n';
import type { HistoryState } from '@/storage/app-storage';
import { formatHours } from '@/storage/fasting-storage';
import { getChartData, type ChartData } from '@/utils/fasting-analytics';
import { getLocalDayKey } from '@/utils/fasting-statistics';

const formatChartHours = (hours: number): string => `${formatHours(hours)}h`;

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

export const HiddenDataChartsPanel = memo(
  function HiddenDataChartsPanel({ history }: { history: HistoryState }) {
    const chartData = getCachedChartData(history);

    return (
      <View style={styles.content}>
        <ChartSection index={0} title={t('charts.recentDuration')} description={t('charts.recentDurationDescription')}>
          <FastingLineChart data={chartData.recentDurations} formatValue={formatChartHours} />
        </ChartSection>

        <ChartSection index={1} title={t('charts.monthlyHours')} description={t('charts.monthlyHoursDescription')}>
          <FastingBarChart data={chartData.monthlyHours} formatValue={formatChartHours} />
        </ChartSection>

        <ChartSection index={2} title={t('charts.goalCompletion')} description={t('charts.goalCompletionDescription')}>
          <CompletionDonut value={chartData.completionRate} />
        </ChartSection>

        <ChartSection index={3} title={t('charts.thisWeek')}>
          <HeatmapGrid cells={chartData.weeklyHeatmap} columns={7} />
        </ChartSection>

        <ChartSection index={4} title={t('charts.last30Days')}>
          <HeatmapGrid cells={chartData.monthlyHeatmap} columns={10} />
        </ChartSection>

        <ChartSection index={5} title={t('charts.lastYear')}>
          <HeatmapGrid cells={chartData.yearlyHeatmap} columns={26} compact />
        </ChartSection>

        <ChartSection index={6} title={t('charts.durationMix')} description={t('charts.durationMixDescription')}>
          <FastingBarChart data={chartData.durationDistribution} formatValue={(value) => `${value}`} />
        </ChartSection>
      </View>
    );
  },
  (previous, next) => previous.history.updatedAt === next.history.updatedAt,
);

function ChartSection({
  index,
  title,
  description,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 5) * 35).duration(180)}>
      <AppSection title={title} description={description}>
        <View style={styles.chartBody}>{children}</View>
      </AppSection>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  chartBody: {
    padding: Spacing.md,
  },
});
