import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  return (
    <ScreenScaffold title="Settings" eyebrow="App preferences">
      <ThemedText>Settings are not configured yet.</ThemedText>
      <ThemedText themeColor="textSecondary">
        This screen will include goals, theme, notifications, widgets, export, privacy, and support.
      </ThemedText>
    </ScreenScaffold>
  );
}
