import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';

export default function HomeScreen() {
  return (
    <ScreenScaffold title="Fast" eyebrow="Current fast">
      <ThemedText>No active fast yet.</ThemedText>
      <ThemedText themeColor="textSecondary">
        This screen will hold the fasting timer, presets, progress, and start/end controls.
      </ThemedText>
    </ScreenScaffold>
  );
}
