import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  setAccentColorName,
  setDefaultGoal,
  setThemePreference,
  updateNotificationSettings,
  updateWidgetSettings,
  useSettings,
  getDefaultGoal,
  accentColorLabels,
  accentColorValues,
} from '@/features/settings/settings';
import { AccentColorName, ThemePreference, type FastingGoal } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';

const themeOptions = [
  { label: 'System', value: ThemePreference.System },
  { label: 'Light', value: ThemePreference.Light },
  { label: 'Dark', value: ThemePreference.Dark },
] as const;

const accentOptions = [
  AccentColorName.Red,
  AccentColorName.Orange,
  AccentColorName.Amber,
  AccentColorName.Green,
  AccentColorName.Teal,
  AccentColorName.Blue,
  AccentColorName.Purple,
  AccentColorName.Pink,
] as const;

export default function SettingsScreen() {
  const settings = useSettings();
  const defaultGoal = getDefaultGoal(settings);

  return (
    <ScreenScaffold title="Settings" eyebrow="App preferences">
      <SettingsSection title="Appearance">
        <SegmentedControl
          label="Theme"
          values={themeOptions}
          selectedValue={settings.themePreference}
          onSelect={setThemePreference}
        />
        <AccentPicker
          selectedAccentName={settings.accentColorName}
          onSelect={setAccentColorName}
        />
      </SettingsSection>

      <SettingsSection title="Goals">
        <GoalPicker goals={settings.goals} selectedGoal={defaultGoal} onSelect={setDefaultGoal} />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsSwitch
          title="Fast end reminder"
          description="Local notification when the goal is reached."
          value={settings.notifications.fastEndReminderEnabled}
          onValueChange={(fastEndReminderEnabled) =>
            updateNotificationSettings((notifications) => ({
              ...notifications,
              fastEndReminderEnabled,
            }))
          }
        />
        <SettingsSwitch
          title="Daily fasting reminder"
          description="A local reminder to start your regular fast."
          value={settings.notifications.dailyReminderEnabled}
          onValueChange={(dailyReminderEnabled) =>
            updateNotificationSettings((notifications) => ({
              ...notifications,
              dailyReminderEnabled,
            }))
          }
        />
      </SettingsSection>

      <SettingsSection title="Widgets">
        <SettingsSwitch
          title="Home Screen widgets"
          description="Keep active fast and recent fast summaries available outside the app."
          value={settings.widgets.homeScreenWidgetsEnabled}
          onValueChange={(homeScreenWidgetsEnabled) =>
            updateWidgetSettings((widgets) => ({
              ...widgets,
              homeScreenWidgetsEnabled,
            }))
          }
        />
        {Platform.OS === 'ios' ? (
          <>
            <SettingsSwitch
              title="Live Activities"
              description="Show an active fast on supported iPhone surfaces."
              value={settings.widgets.liveActivitiesEnabled}
              onValueChange={(liveActivitiesEnabled) =>
                updateWidgetSettings((widgets) => ({
                  ...widgets,
                  liveActivitiesEnabled,
                }))
              }
            />
            <SettingsSwitch
              title="Dynamic Island"
              description="Show the active fast on supported iPhone models."
              value={settings.widgets.dynamicIslandEnabled}
              onValueChange={(dynamicIslandEnabled) =>
                updateWidgetSettings((widgets) => ({
                  ...widgets,
                  dynamicIslandEnabled,
                }))
              }
            />
          </>
        ) : (
          <SettingsSwitch
            title="Android ongoing notification"
            description="Show the active fast as an ongoing local notification."
            value={settings.widgets.androidOngoingNotificationEnabled}
            onValueChange={(androidOngoingNotificationEnabled) =>
              updateWidgetSettings((widgets) => ({
                ...widgets,
                androidOngoingNotificationEnabled,
              }))
            }
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

function SegmentedControl<Value extends string>({
  label,
  values,
  selectedValue,
  onSelect,
}: {
  label: string;
  values: readonly { label: string; value: Value }[];
  selectedValue: Value;
  onSelect: (value: Value) => void;
}) {
  return (
    <ThemedView style={styles.controlGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.segmentedRow}>
        {values.map((option) => (
          <SegmentButton
            key={option.value}
            label={option.label}
            selected={option.value === selectedValue}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </ThemedView>
  );
}

function GoalPicker({
  goals,
  selectedGoal,
  onSelect,
}: {
  goals: readonly FastingGoal[];
  selectedGoal: FastingGoal;
  onSelect: (goalId: string) => void;
}) {
  return (
    <ThemedView style={styles.controlGroup}>
      <ThemedText type="smallBold">Default fast</ThemedText>
      <View style={styles.segmentedRow}>
        {goals.map((goal) => (
          <SegmentButton
            key={goal.id}
            label={goal.name}
            selected={goal.id === selectedGoal.id}
            onPress={() => onSelect(goal.id)}
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
        { borderColor: selected ? theme.accent : theme.backgroundSelected },
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
  selectedAccentName,
  onSelect,
}: {
  selectedAccentName: AccentColorName;
  onSelect: (accentColorName: AccentColorName) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.controlGroup}>
      <ThemedText type="smallBold">Accent color</ThemedText>
      <View style={styles.accentGrid}>
        {accentOptions.map((accentName) => {
          const selected = accentName === selectedAccentName;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${accentColorLabels[accentName]} accent`}
              accessibilityState={{ selected }}
              key={accentName}
              onPress={() => onSelect(accentName)}
              style={({ pressed }) => [
                styles.accentButton,
                { borderColor: selected ? theme.accent : theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.accentSwatch,
                  { backgroundColor: accentColorValues[accentName] },
                ]}
              />
              <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                {accentColorLabels[accentName]}
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
  const theme = useTheme();

  return (
    <SettingsRow
      title={title}
      description={description}
      trailing={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: theme.accent }}
          thumbColor={Platform.OS === 'android' && value ? theme.background : undefined}
        />
      }
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
