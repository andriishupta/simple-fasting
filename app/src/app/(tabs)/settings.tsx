import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  setAccentColorName,
  setThemePreference,
  updateNotificationSettingsAndSchedule,
  updateWidgetSettings,
  useSettings,
  accentColorLabels,
  accentColorValues,
  getAppVersionLabel,
  openBugReportEmail,
  openDevEmail,
  openFaq,
  openFeedbackEmail,
  openPrivacyPolicy,
  openSupportEmail,
  openTerms,
  openWebsite,
  requestLocalNotificationPermission,
  setDailyReminderTimeAndSchedule,
  shareDataExport,
  SettingsExportFormat,
} from '@/storage/settings-storage';
import { AccentColorName, ThemePreference } from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';
import { reconcileActiveFastEndNotification } from '@/storage/fasting-storage';

const themeOptions = [
  { label: 'System', value: ThemePreference.System },
  { label: 'Light', value: ThemePreference.Light },
  { label: 'Dark', value: ThemePreference.Dark },
] as const;

const accentOptions = [
  AccentColorName.Red,
  AccentColorName.Blue,
] as const;

const timeToDate = (time: string): Date => {
  const [hour = '20', minute = '0'] = time.split(':');
  const date = new Date();

  date.setHours(Number(hour), Number(minute), 0, 0);

  return date;
};

const dateToTime = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function SettingsScreen() {
  const settings = useSettings();
  const runNotificationUpdate = async (update: () => Promise<void>): Promise<void> => {
    try {
      await update();
    } catch {
      Alert.alert('Notification update failed', 'Please try again.');
    }
  };
  const setFastEndReminderEnabled = async (fastEndReminderEnabled: boolean): Promise<void> => {
    await runNotificationUpdate(async () => {
      if (fastEndReminderEnabled && !(await requestLocalNotificationPermission())) {
        Alert.alert(
          'Notifications are off',
          'Enable notifications in system settings to use fasting reminders.',
        );
        return;
      }

      await updateNotificationSettingsAndSchedule((notifications) => ({
        ...notifications,
        fastEndReminderEnabled,
      }));
      await reconcileActiveFastEndNotification();
    });
  };
  const setDailyReminderEnabled = async (dailyReminderEnabled: boolean): Promise<void> => {
    await runNotificationUpdate(async () => {
      if (dailyReminderEnabled && !(await requestLocalNotificationPermission())) {
        Alert.alert(
          'Notifications are off',
          'Enable notifications in system settings to use daily reminders.',
        );
        return;
      }

      await updateNotificationSettingsAndSchedule((notifications) => ({
        ...notifications,
        dailyReminderEnabled,
        dailyReminderTime:
          dailyReminderEnabled && notifications.dailyReminderTime === null
            ? '20:00'
            : notifications.dailyReminderTime,
      }));
    });
  };
  const setAndroidOngoingNotificationEnabled = async (
    androidOngoingNotificationEnabled: boolean,
  ): Promise<void> => {
    if (androidOngoingNotificationEnabled && !(await requestLocalNotificationPermission())) {
      Alert.alert(
        'Notifications are off',
        'Enable notifications in system settings to show an ongoing fasting notification.',
      );
      return;
    }

    updateWidgetSettings((widgets) => ({
      ...widgets,
      androidOngoingNotificationEnabled,
    }));
  };
  const exportData = async (format: SettingsExportFormat): Promise<void> => {
    try {
      await shareDataExport(format);
    } catch {
      Alert.alert('Export failed', 'The export file could not be created.');
    }
  };
  const openExternalAction = async (action: () => Promise<void>): Promise<void> => {
    try {
      await action();
    } catch {
      Alert.alert('Unable to open link', 'Please try again later.');
    }
  };

  return (
    <ScreenScaffold
      title="Settings"
      eyebrow="App preferences"
      action={
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <ThemedText type="smallBold" themeColor="accent">
            Done
          </ThemedText>
        </Pressable>
      }>
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

      <SettingsSection title="Notifications">
        <SettingsSwitch
          title="Fast end reminder"
          description="Local notification when the goal is reached."
          value={settings.notifications.fastEndReminderEnabled}
          onValueChange={setFastEndReminderEnabled}
        />
        <SettingsSwitch
          title="Daily fasting reminder"
          description="A local reminder to start your regular fast."
          value={settings.notifications.dailyReminderEnabled}
          onValueChange={setDailyReminderEnabled}
        />
        {settings.notifications.dailyReminderEnabled && (
          <TimePicker
            label="Reminder time"
            value={settings.notifications.dailyReminderTime ?? '20:00'}
            onChange={(dailyReminderTime) => {
              void runNotificationUpdate(async () => {
                await setDailyReminderTimeAndSchedule(dailyReminderTime);
              });
            }}
          />
        )}
      </SettingsSection>

      <SettingsSection title="Widgets">
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
                  dynamicIslandEnabled: liveActivitiesEnabled
                    ? widgets.dynamicIslandEnabled
                    : false,
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
                  liveActivitiesEnabled: dynamicIslandEnabled
                    ? true
                    : widgets.liveActivitiesEnabled,
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
            onValueChange={setAndroidOngoingNotificationEnabled}
          />
        )}
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsActionRow
          title="Export JSON"
          description="Share a local backup of settings and fasting data."
          onPress={() => exportData(SettingsExportFormat.Json)}
        />
        <SettingsActionRow
          title="Export CSV"
          description="Share completed fasting history as a spreadsheet-friendly file."
          onPress={() => exportData(SettingsExportFormat.Csv)}
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsActionRow
          title="FAQ"
          description="Open common questions on the website."
          onPress={() => openExternalAction(openFaq)}
        />
        <SettingsActionRow
          title="Website"
          description="Visit simplefasting.app."
          onPress={() => openExternalAction(openWebsite)}
        />
        <SettingsActionRow
          title="Feedback"
          description="Share an idea or tell us what is not working well."
          onPress={() => openExternalAction(openFeedbackEmail)}
        />
        <SettingsActionRow
          title="Contact developer"
          description="Email the developer directly."
          onPress={() => openExternalAction(openDevEmail)}
        />
        <SettingsActionRow
          title="Report bug"
          description="Send a bug report by email."
          onPress={() => openExternalAction(openBugReportEmail)}
        />
      </SettingsSection>

      <SettingsSection title="Legal">
        <SettingsActionRow
          title="Privacy Policy"
          description="Local-first, no account, no tracking."
          onPress={() => openExternalAction(openPrivacyPolicy)}
        />
        <SettingsActionRow
          title="Terms of Use"
          description="Read app terms and tracking-only disclaimer."
          onPress={() => openExternalAction(openTerms)}
        />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsActionRow
          title="Support email"
          description="Contact support@simplefasting.app."
          onPress={() => openExternalAction(openSupportEmail)}
        />
        <SettingsRow
          title="Build"
          description={getAppVersionLabel()}
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
  const theme = useTheme();
  const selectedIndex = Math.max(
    0,
    values.findIndex((option) => option.value === selectedValue),
  );
  const selectLabel = (selectedLabel: string): void => {
    const selectedOption = values.find((option) => option.label === selectedLabel);

    if (selectedOption !== undefined) {
      onSelect(selectedOption.value);
    }
  };

  return (
    <ThemedView style={styles.controlGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ExpoSegmentedControl
        values={values.map((option) => option.label)}
        selectedIndex={selectedIndex}
        onValueChange={selectLabel}
        tintColor={theme.accent}
        style={styles.nativeSegmentedControl}
      />
    </ThemedView>
  );
}

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const updateTime = (_event: DateTimePickerEvent, date?: Date): void => {
    if (date !== undefined) {
      onChange(dateToTime(date));
    }
  };

  return (
    <ThemedView style={styles.controlGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <DateTimePicker
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        value={timeToDate(value)}
        onChange={updateTime}
      />
    </ThemedView>
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
                {
                  backgroundColor: selected ? theme.accentBackground : 'transparent',
                  borderColor: selected ? theme.accentBorder : theme.backgroundSelected,
                },
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
          thumbColor={Platform.OS === 'android' && value ? theme.accentForeground : undefined}
        />
      }
    />
  );
}

function SettingsActionRow({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <SettingsRow
        title={title}
        description={description}
        trailing={<ThemedText themeColor="accent">Open</ThemedText>}
      />
    </Pressable>
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
  nativeSegmentedControl: {
    minHeight: 36,
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
