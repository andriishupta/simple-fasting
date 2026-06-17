import { Alert, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { router } from 'expo-router';

import { FeedbackState } from '@/components/feedback-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  deleteFastSession,
  formatDuration,
  useHistoryState,
} from '@/storage/fasting-storage';
import { type FastSession } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';

export default function HistoryScreen() {
  const historyState = useHistoryState();

  return (
    <ScreenScaffold title="History" eyebrow="Completed fasts">
      {historyState.sessions.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="No fasting history yet"
          description="Completed sessions will appear here after you end a fast."
          action={{ label: 'Start a Fast', onPress: () => router.push('/') }}
        />
      ) : (
        <View style={styles.list}>
          {historyState.sessions.map((session) => (
            <HistoryItem key={session.id} session={session} />
          ))}
        </View>
      )}
    </ScreenScaffold>
  );
}

function HistoryItem({ session }: { session: FastSession }) {
  const theme = useTheme();
  const endedAt = session.endedAt === null ? Date.now() : new Date(session.endedAt).getTime();
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt - new Date(session.startedAt).getTime()) / 1000),
  );
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
        <ThemedText type="smallBold">{formatDuration(durationSeconds)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {new Date(session.startedAt).toLocaleDateString()} · {session.goalDurationHours} hour goal
        </ThemedText>
        {session.reason !== null && (
          <ThemedText type="small" themeColor="textSecondary">
            {session.reason}
          </ThemedText>
        )}
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

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.72,
  },
});
