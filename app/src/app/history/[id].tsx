import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppButton } from '@/components/app-button';
import { FeedbackState } from '@/components/feedback-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  deleteFastSession,
  formatDuration,
  getFastSession,
  useHistoryState,
} from '@/storage/fasting-storage';
import { type FastSession } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useHistoryState();
  const session = typeof id === 'string' ? getFastSession(id) : undefined;

  if (session === undefined) {
    return (
      <ScreenScaffold title="Fast Details" eyebrow="History">
        <FeedbackState
          kind="error"
          title="Fast not found"
          description="This session may have been deleted from local history."
          action={{ label: 'Back to History', onPress: () => router.replace('/history') }}
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Fast Details" eyebrow="History">
      <DetailContent session={session} />
    </ScreenScaffold>
  );
}

function DetailContent({ session }: { session: FastSession }) {
  const endedAt = session.endedAt === null ? Date.now() : new Date(session.endedAt).getTime();
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt - new Date(session.startedAt).getTime()) / 1000),
  );
  const deleteSession = (): void => {
    Alert.alert('Delete fast?', 'This removes the session from local history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteFastSession(session.id);
          router.replace('/history');
        },
      },
    ]);
  };

  return (
    <View style={styles.content}>
      <View style={styles.summary}>
        <ThemedText type="title" style={styles.duration}>
          {formatDuration(durationSeconds)}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {session.goalDurationHours} hour goal · {session.status}
        </ThemedText>
      </View>

      <DetailRow label="Started" value={new Date(session.startedAt).toLocaleString()} />
      <DetailRow
        label="Ended"
        value={session.endedAt === null ? 'Not ended' : new Date(session.endedAt).toLocaleString()}
      />
      <DetailRow label="Goal" value={`${session.goalDurationHours} hours`} />
      <DetailRow label="Reason" value={session.reason ?? 'None'} />
      <DetailRow label="Created" value={new Date(session.createdAt).toLocaleString()} />
      <DetailRow label="Updated" value={new Date(session.updatedAt).toLocaleString()} />

      <View style={styles.actions}>
        <AppButton label="Back" onPress={() => router.back()} variant="secondary" fullWidth />
        <AppButton label="Delete" onPress={deleteSession} variant="danger" fullWidth />
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderColor: theme.backgroundSelected }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
  },
  summary: {
    gap: Spacing.one,
  },
  duration: {
    textAlign: 'center',
  },
  row: {
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
