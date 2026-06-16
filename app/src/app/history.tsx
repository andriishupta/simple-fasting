import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';

export default function HistoryScreen() {
  return (
    <ScreenScaffold title="History" eyebrow="Completed fasts">
      <ThemedText>No fasting history yet.</ThemedText>
      <ThemedText themeColor="textSecondary">
        Completed sessions will appear here before statistics and export are added.
      </ThemedText>
    </ScreenScaffold>
  );
}
