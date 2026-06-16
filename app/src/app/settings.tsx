import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ThemePreference = 'System' | 'Light' | 'Dark';
type DurationGoal = '12 h' | '14 h' | '16 h' | '18 h';

type AccentColor = {
  name: string;
  value: string;
};

const accentColors: AccentColor[] = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
];

export default function SettingsScreen() {
  const [themePreference, setThemePreference] = useState<ThemePreference>('System');
  const [durationGoal, setDurationGoal] = useState<DurationGoal>('16 h');
  const [accentColor, setAccentColor] = useState(accentColors[5]);
  const [fastEndReminder, setFastEndReminder] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [homeWidgets, setHomeWidgets] = useState(true);
  const [platformActivity, setPlatformActivity] = useState(false);
  const [androidOngoingNotification, setAndroidOngoingNotification] = useState(false);

  return (
    <ScreenScaffold title="Settings" eyebrow="App preferences">
      <SettingsSection title="Appearance">
        <SegmentedControl
          label="Theme"
          values={['System', 'Light', 'Dark']}
          selectedValue={themePreference}
          onSelect={setThemePreference}
        />
        <AccentPicker selectedAccent={accentColor} onSelect={setAccentColor} />
      </SettingsSection>

      <SettingsSection title="Goals">
        <SegmentedControl
          label="Default fast"
          values={['12 h', '14 h', '16 h', '18 h']}
          selectedValue={durationGoal}
          onSelect={setDurationGoal}
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsSwitch
          title="Fast end reminder"
          description="Local notification when the goal is reached."
          value={fastEndReminder}
          onValueChange={setFastEndReminder}
        />
        <SettingsSwitch
          title="Daily fasting reminder"
          description="A local reminder to start your regular fast."
          value={dailyReminder}
          onValueChange={setDailyReminder}
        />
      </SettingsSection>

      <SettingsSection title="Widgets">
        <SettingsSwitch
          title="Home Screen widgets"
          description="Keep active fast and recent fast summaries available outside the app."
          value={homeWidgets}
          onValueChange={setHomeWidgets}
        />
        {Platform.OS === 'ios' ? (
          <SettingsSwitch
            title="Live Activities and Dynamic Island"
            description="Show an active fast on supported iPhone surfaces."
            value={platformActivity}
            onValueChange={setPlatformActivity}
          />
        ) : (
          <SettingsSwitch
            title="Android ongoing notification"
            description="Show the active fast as an ongoing local notification."
            value={androidOngoingNotification}
            onValueChange={setAndroidOngoingNotification}
          />
        )}
      </SettingsSection>

      <SettingsSection title="Data and support">
        <SettingsRow title="Export data" description="JSON and CSV export will live here." />
        <SettingsRow title="Privacy Policy" description="Local-first, no account, no tracking." />
        <SettingsRow
          title="Support Creator"
          description="Future optional donation support, not part of core v1 functionality."
        />
      </SettingsSection>
    </ScreenScaffold>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedView type="background" style={styles.sectionPanel}>
        {children}
      </ThemedView>
    </ThemedView>
  );
}

function SegmentedControl<T extends string>({
  label,
  values,
  selectedValue,
  onSelect,
}: {
  label: string;
  values: readonly T[];
  selectedValue: T;
  onSelect: (value: T) => void;
}) {
  return (
    <ThemedView style={styles.controlGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.segmentedRow}>
        {values.map((value) => (
          <SegmentButton
            key={value}
            label={value}
            selected={value === selectedValue}
            onPress={() => onSelect(value)}
          />
        ))}
      </View>
    </ThemedView>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        { borderColor: selected ? theme.text : theme.backgroundSelected },
        selected && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function AccentPicker({
  selectedAccent,
  onSelect,
}: {
  selectedAccent: AccentColor;
  onSelect: (accent: AccentColor) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.controlGroup}>
      <ThemedText type="smallBold">Accent color</ThemedText>
      <View style={styles.accentGrid}>
        {accentColors.map((accent) => {
          const selected = accent.value === selectedAccent.value;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${accent.name} accent`}
              accessibilityState={{ selected }}
              key={accent.value}
              onPress={() => onSelect(accent)}
              style={({ pressed }) => [
                styles.accentButton,
                { borderColor: selected ? theme.text : theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.accentSwatch, { backgroundColor: accent.value }]} />
              <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                {accent.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

function SettingsSwitch({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <SettingsRow
      title={title}
      description={description}
      trailing={<Switch value={value} onValueChange={onValueChange} />}
    />
  );
}

function SettingsRow({
  title,
  description,
  trailing,
}: {
  title: string;
  description: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  sectionPanel: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  controlGroup: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  segmentButton: {
    minHeight: 40,
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  accentButton: {
    width: 94,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  accentSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.72,
  },
});
