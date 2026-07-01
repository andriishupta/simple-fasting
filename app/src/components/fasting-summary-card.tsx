import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppSurface } from '@/components/app-surface';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';

type FastingSummaryCardProps = {
  duration: string;
  goalLabel?: string;
  progress?: number | null;
  started: ReactNode;
  ended: ReactNode;
  trailing?: ReactNode;
  note?: string | null;
  surface?: boolean;
};

export function FastingSummaryCard({
  duration,
  goalLabel,
  progress = null,
  started,
  ended,
  trailing,
  note,
  surface = true,
}: FastingSummaryCardProps) {
  const theme = useTheme();
  const content = (
    <>
      <View style={styles.topLine}>
        <View style={styles.durationGroup}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('summary.duration')}
          </ThemedText>
          <ThemedText type="smallBold" selectable>
            {duration}
          </ThemedText>
        </View>
        {goalLabel !== undefined || trailing !== undefined ? (
          <View style={styles.goalAction}>
            {goalLabel !== undefined ? (
              <View style={[styles.goalPill, { backgroundColor: theme.accentBackground }]}>
                <ThemedText type="smallBold" themeColor="accent">
                  {goalLabel}
                </ThemedText>
              </View>
            ) : null}
            {trailing}
          </View>
        ) : null}
      </View>
      {progress !== null ? (
        <View
          accessible
          accessibilityLabel={t('summary.goalProgressAccessibility', { percent: Math.round(progress * 100) })}
          style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.accent, width: `${Math.min(100, progress * 100)}%` },
            ]}
          />
        </View>
      ) : null}
      <View style={styles.times}>
        <SummaryTime label={t('summary.started')}>{started}</SummaryTime>
        <View style={[styles.timeDivider, { backgroundColor: theme.backgroundSelected }]} />
        <SummaryTime label={t('summary.ended')}>{ended}</SummaryTime>
      </View>
      {note !== null && note !== undefined ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}
    </>
  );

  return surface ? (
    <AppSurface style={styles.card}>{content}</AppSurface>
  ) : (
    <View style={styles.card}>{content}</View>
  );
}

export function SummaryTime({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.time}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.timeText}>
        {label}
      </ThemedText>
      {typeof children === 'string' ? (
        <ThemedText type="smallBold" selectable style={styles.timeText}>
          {children}
        </ThemedText>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  durationGroup: { gap: Spacing.half },
  goalAction: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
  },
  goalPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  times: { flexDirection: 'row', alignItems: 'stretch' },
  time: { flex: 1, alignItems: 'center', gap: Spacing.half },
  timeText: { textAlign: 'center' },
  timeDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.md,
  },
});
