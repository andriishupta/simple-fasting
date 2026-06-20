import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  setAccentColorName,
  setThemePreference,
  refreshSettingsSnapshot,
  updateNotificationSettingsAndSchedule,
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
import {
  AccentColorName,
  StorageKey,
  ThemePreference,
  appStorage,
} from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';
import {
  getActiveFastState,
  reconcileActiveFastEndNotification,
  refreshFastSnapshots,
} from '@/storage/fasting-storage';
import { cancelScheduledNotification } from '@/storage/notification-storage';
import { initializeAppStorage } from '@/storage/storage-migrations';

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
  const exportData = async (format: SettingsExportFormat): Promise<void> => {
    try {
      await shareDataExport(format);
    } catch {
      Alert.alert('Export failed', 'The export file could not be created.');
    }
  };
  const clearLocalData = (): void => {
    Alert.alert(
      'Clear all data?',
      'Clearing storage will remove all data on this device, including history, graphs, settings, and any active fast. Make sure to export a backup first. Continue with deletion?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const settingsBeforeClear = appStorage.get(StorageKey.Settings);
                const activeFastBeforeClear = getActiveFastState();

                await Promise.all([
                  cancelScheduledNotification(
                    settingsBeforeClear?.notifications.dailyReminderNotificationId ?? null,
                  ),
                  cancelScheduledNotification(activeFastBeforeClear.fastEndNotificationId),
                ]);
                appStorage.clear();
                initializeAppStorage();
                refreshSettingsSnapshot();
                refreshFastSnapshots();
                router.replace('/');
              } catch {
                Alert.alert('Clear failed', 'Local data could not be cleared.');
              }
            })();
          },
        },
      ],
    );
  };
  const openExternalAction = async (action: () => Promise<void>): Promise<void> => {
    try {
      await action();
    } catch {
      Alert.alert('Unable to open link', 'Please try again later.');
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screen}>
      <View style={styles.screenContent}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Settings
        </ThemedText>
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
          <SettingsActionRow
            title="Manage fasting goals"
            description={`${settings.goals.length} saved goal${settings.goals.length === 1 ? '' : 's'}`}
            onPress={() => router.push('/goals' as Href)}
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

        <SettingsSection title="Data">
          <SettingsActionRow
            title="Export JSON"
            description="Fasting data and app metadata."
            onPress={() => exportData(SettingsExportFormat.Json)}
          />
          <SettingsActionRow
            title="Export CSV"
            description="Session history in spreadsheet format."
            onPress={() => exportData(SettingsExportFormat.Csv)}
          />
          <SettingsActionRow
            title="Clear data"
            description="Delete local history, graphs, settings, and active fast."
            destructive
            onPress={clearLocalData}
          />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsActionRow title="FAQ" onPress={() => openExternalAction(openFaq)} />
          <SettingsActionRow title="Website" onPress={() => openExternalAction(openWebsite)} />
          <SettingsActionRow
            title="Feedback"
            onPress={() => openExternalAction(openFeedbackEmail)}
          />
          <SettingsActionRow
            title="Contact developer"
            onPress={() => openExternalAction(openDevEmail)}
          />
          <SettingsActionRow
            title="Report bug"
            onPress={() => openExternalAction(openBugReportEmail)}
          />
        </SettingsSection>

        <SettingsSection title="Legal">
          <SettingsActionRow
            title="Privacy Policy"
            onPress={() => openExternalAction(openPrivacyPolicy)}
          />
          <SettingsActionRow
            title="Terms of Use"
            onPress={() => openExternalAction(openTerms)}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsActionRow
            title="Support email"
            description="support@simplefasting.app"
            onPress={() => openExternalAction(openSupportEmail)}
          />
          <SettingsRow title="Build" description={getAppVersionLabel()} />
        </SettingsSection>
      </View>
    </ScrollView>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.sectionPanel}>
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
    <ThemedView
      style={[styles.controlGroup, { borderBottomColor: theme.backgroundSelected }]}>
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
  const theme = useTheme();
  const updateTime = (_event: DateTimePickerEvent, date?: Date): void => {
    if (date !== undefined) {
      onChange(dateToTime(date));
    }
  };

  return (
    <ThemedView
      style={[styles.controlGroup, { borderBottomColor: theme.backgroundSelected }]}>
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
    <ThemedView
      style={[styles.controlGroup, { borderBottomColor: theme.backgroundSelected }]}>
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
  destructive = false,
  onPress,
}: {
  title: string;
  description?: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <SettingsRow
        title={title}
        description={description}
        titleColor={destructive ? theme.danger : undefined}
        trailing={
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={16}
            tintColor={theme.textSecondary}
          />
        }
      />
    </Pressable>
  );
}

function SettingsRow({
  title,
  description,
  trailing,
  titleColor,
}: {
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  titleColor?: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.rowText}>
        <ThemedText style={titleColor === undefined ? undefined : { color: titleColor }}>
          {title}
        </ThemedText>
        {description !== undefined ? (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.four,
  },
  screenContent: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 640),
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    width: 58,
    minHeight: 58,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.72,
  },
});
