import { useEffect, useState } from 'react';
import {
  AppState,
  Alert,
  type AlertButton,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Picker } from '@expo/ui/community/picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  Activity,
  Bell,
  Bug,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileInput,
  FileText,
  Globe,
  Info,
  Laptop,
  Mail,
  Moon,
  Shield,
  Sparkles,
  Star,
  Sun,
  Table2,
  Target,
  Timer,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { CenteredWheelPicker } from '@/components/centered-wheel-picker';
import { ScreenHeading } from '@/components/screen-heading';
import { TabScreenShell } from '@/components/tab-screen-shell';
import { TimerViewToggle } from '@/components/timer-view-toggle';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  setAccentColorName,
  setGoalDurationFormat,
  setLiveActivitiesEnabled,
  setThemePreference,
  refreshSettingsSnapshot,
  updateNotificationSettingsAndSchedule,
  useSettings,
  accentColorLabels,
  accentColorValues,
  getAppVersionLabel,
  getLocalNotificationPermissionState,
  getStoreReviewUrl,
  LocalNotificationPermissionState,
  openBugReportEmail,
  openFaq,
  openLocalNotificationSettings,
  openPrivacyPolicy,
  openRateApp,
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
  GoalDurationFormat,
  StorageKey,
  TimerViewPreference,
  ThemePreference,
  appStorage,
} from '@/storage/app-storage';
import { useTheme } from '@/hooks/use-theme';
import {
  getActiveFastState,
  mergeImportedFastSessions,
  reconcileActiveFastEndNotification,
  refreshFastSnapshots,
  setActiveFastTimerView,
  syncActiveFastingLiveActivity,
  useActiveFastState,
} from '@/storage/fasting-storage';
import { cancelScheduledNotification } from '@/storage/notification-storage';
import { resetAppStorage } from '@/storage/storage-migrations';
import {
  emailDiagnosticReport,
  isDiagnosticEmailAvailable,
  shareDiagnosticReport,
} from '@/storage/diagnostic-storage';
import { parseImportSessions } from '@/storage/data-import';

const themeOptions = [
  {
    label: 'System',
    value: ThemePreference.System,
    icon: Laptop,
  },
  {
    label: 'Light',
    value: ThemePreference.Light,
    icon: Sun,
  },
  {
    label: 'Dark',
    value: ThemePreference.Dark,
    icon: Moon,
  },
] as const;

const accentOptions = [
  AccentColorName.Rose,
  AccentColorName.Orange,
  AccentColorName.Amber,
  AccentColorName.Green,
  AccentColorName.Teal,
  AccentColorName.Blue,
  AccentColorName.Purple,
  AccentColorName.Pink,
] as const;

const goalDurationFormatOptions = [
  {
    label: 'Hours',
    description: 'Show goals as 24 hours.',
    value: GoalDurationFormat.Hours,
  },
  {
    label: 'Days + hours',
    description: 'Show goals as 1d or 1d 4h.',
    value: GoalDurationFormat.Days,
  },
] as const;

const accentItemWidth = 64;
const reminderHours = Array.from({ length: 24 }, (_, hour) => hour);
const reminderMinutes = Array.from({ length: 60 }, (_, minute) => minute);

export default function SettingsScreen() {
  const settings = useSettings();
  const activeFastState = useActiveFastState();
  const importDisabled = activeFastState.session !== null;
  const canRateApp = getStoreReviewUrl() !== null;
  const [notificationPermissionState, setNotificationPermissionState] =
    useState<LocalNotificationPermissionState>(LocalNotificationPermissionState.Undetermined);
  const [canEmailDiagnostics, setCanEmailDiagnostics] = useState(false);
  const [installedAt] = useState(
    () => appStorage.get(StorageKey.Metadata)?.initializedAt ?? new Date().toISOString(),
  );
  const buildDescription = `${getAppVersionLabel()} · Installed ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(installedAt))}`;
  const notificationsAvailable =
    notificationPermissionState === LocalNotificationPermissionState.Granted;

  useEffect(() => {
    const refreshPermission = (): void => {
      void getLocalNotificationPermissionState().then(setNotificationPermissionState);
    };
    refreshPermission();
    const initialPromptTimer = setTimeout(refreshPermission, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermission();
    });

    return () => {
      clearTimeout(initialPromptTimer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;

    isDiagnosticEmailAvailable()
      .then((available) => {
        if (active) setCanEmailDiagnostics(available);
      })
      .catch(() => {
        if (active) setCanEmailDiagnostics(false);
      });

    return () => {
      active = false;
    };
  }, []);
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

      setNotificationPermissionState(await getLocalNotificationPermissionState());
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

      setNotificationPermissionState(await getLocalNotificationPermissionState());
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
  const enableNotificationsFromSettings = async (): Promise<void> => {
    await runNotificationUpdate(async () => {
      if (notificationPermissionState === LocalNotificationPermissionState.Undetermined) {
        const granted = await requestLocalNotificationPermission();
        setNotificationPermissionState(await getLocalNotificationPermissionState());

        if (granted) {
          await updateNotificationSettingsAndSchedule((notifications) => ({
            ...notifications,
            fastEndReminderEnabled: true,
            dailyReminderEnabled: false,
          }));
          await reconcileActiveFastEndNotification();
        }

        return;
      }

      await openLocalNotificationSettings();
    });
  };
  const exportData = async (format: SettingsExportFormat): Promise<void> => {
    try {
      await shareDataExport(format);
    } catch {
      Alert.alert('Export failed', 'The export file could not be created.');
    }
  };
  const exportDiagnostics = async (): Promise<void> => {
    try {
      await shareDiagnosticReport();
    } catch {
      Alert.alert('Share failed', 'The local diagnostic report could not be created.');
    }
  };
  const emailDiagnostics = async (): Promise<void> => {
    try {
      await emailDiagnosticReport();
    } catch {
      Alert.alert('Email failed', 'The local diagnostic email could not be created.');
    }
  };
  const reportBug = (): void => {
    const actionButtons: AlertButton[] = [
      { text: 'Email', onPress: () => void openExternalAction(openBugReportEmail) },
      ...(canEmailDiagnostics
        ? [{ text: 'Email with diagnostics', onPress: () => void emailDiagnostics() }]
        : []),
      { text: 'Get diagnostics file', onPress: () => void exportDiagnostics() },
    ];
    const buttons =
      Platform.OS === 'android' && actionButtons.length >= 3
        ? actionButtons
        : [{ text: 'Cancel', style: 'cancel' as const }, ...actionButtons];

    Alert.alert(
      'Report a bug',
      'You can email bugs@simplefasting.app directly, attach local diagnostics to an email, or get the diagnostic file. Diagnostics never include fasting history or notes.',
      buttons,
    );
  };
  const importData = async (): Promise<void> => {
    if (getActiveFastState().session !== null) {
      Alert.alert(
        'Import unavailable',
        'End or cancel the active fast before importing history. This protects your data from overlapping sessions.',
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/comma-separated-values'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size !== undefined && asset.size > 5_000_000) {
        Alert.alert('File too large', 'Choose a Simple Fasting export smaller than 5 MB.');
        return;
      }
      const sessions = parseImportSessions({
        content: await new File(asset.uri).text(),
        filename: asset.name,
      });
      const { saved, skipped } = mergeImportedFastSessions(sessions);
      Alert.alert(
        'Import complete',
        `${saved} fasting session${saved === 1 ? '' : 's'} saved. ${skipped} overlapping or duplicate entr${skipped === 1 ? 'y was' : 'ies were'} skipped.`,
      );
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof Error ? error.message : 'The selected file could not be imported.',
      );
    }
  };
  const clearLocalData = (): void => {
    Alert.alert(
      'Clear all data?',
      'Clearing storage will remove all data on this device, including history, settings, and any active fast. Make sure to export a backup first. Continue with deletion?',
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
                resetAppStorage();
                refreshSettingsSnapshot();
                refreshFastSnapshots();
                await Promise.all([
                  cancelScheduledNotification(
                    settingsBeforeClear?.notifications.dailyReminderNotificationId ?? null,
                  ),
                  cancelScheduledNotification(activeFastBeforeClear.fastEndNotificationId),
                ]).catch(() => undefined);
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
    <TabScreenShell maxWidth={Math.min(MaxContentWidth, 640)}>
        <ScreenHeading>Settings</ScreenHeading>
        <SettingsSection index={0} title="Goals">
          <GoalDurationFormatPicker
            selectedValue={settings.goalDurationFormat}
            onSelect={(goalDurationFormat) => {
              setGoalDurationFormat(goalDurationFormat);
              refreshFastSnapshots();
              void syncActiveFastingLiveActivity();
            }}
          />
          <TimerViewPreferencePicker
            selectedValue={activeFastState.timerViewPreference}
            onSelect={setActiveFastTimerView}
          />
          <SettingsActionRow
            icon={Target}
            title="Manage fasting goals"
            description={`${settings.goals.filter((goal) => goal.isEnabled).length} active · ${settings.goals.length} total`}
            onPress={() => router.push('/goals' as Href)}
          />
        </SettingsSection>

        <SettingsSection
          index={1}
          title="Notifications"
          description={
            notificationsAvailable
              ? 'Widgets are available from your Home Screen.'
              : 'Widgets are available from your Home Screen. Notifications are disabled.'
          }>
          {Platform.OS === 'ios' ? (
            <SettingsSwitch
              icon={Activity}
              title="Live Activity"
              description="Show the active fast on the Lock Screen and Dynamic Island."
              value={settings.liveActivitiesEnabled}
              onValueChange={(liveActivitiesEnabled) => {
                setLiveActivitiesEnabled(liveActivitiesEnabled);
                void syncActiveFastingLiveActivity();
              }}
            />
          ) : null}
          {notificationsAvailable ? (
            <>
              <SettingsSwitch
                icon={Timer}
                title="Fast end reminder"
                description="Local notification when the goal is reached."
                value={settings.notifications.fastEndReminderEnabled}
                onValueChange={setFastEndReminderEnabled}
              />
              <SettingsSwitch
                icon={Bell}
                title="Daily fasting reminder"
                description="A local reminder to start your regular fast."
                value={settings.notifications.dailyReminderEnabled}
                onValueChange={setDailyReminderEnabled}
              />
              {settings.notifications.dailyReminderEnabled && (
                <Animated.View
                  entering={FadeInDown.duration(180)}
                  exiting={FadeOutUp.duration(140)}
                  layout={LinearTransition.duration(180)}>
                  <TimePicker
                    value={settings.notifications.dailyReminderTime ?? '20:00'}
                    onChange={(dailyReminderTime) => {
                      void runNotificationUpdate(async () => {
                        await setDailyReminderTimeAndSchedule(dailyReminderTime);
                      });
                    }}
                  />
                </Animated.View>
              )}
            </>
          ) : (
            <SettingsActionRow
              icon={Bell}
              title="Enable Notifications"
              description="Open system notification settings for Simple Fasting."
              onPress={() => void enableNotificationsFromSettings()}
            />
          )}
        </SettingsSection>

        <SettingsSection index={2} title="Theme & Accent Color">
          <ThemePicker
            selectedValue={settings.themePreference}
            onSelect={setThemePreference}
          />
          <AccentPicker
            selectedAccentName={settings.accentColorName}
            onSelect={setAccentColorName}
          />
        </SettingsSection>

        <SettingsSection index={3} title="Data">
          <SettingsActionRow
            icon={FileInput}
            title="Import JSON or CSV"
            description={
              importDisabled
                ? 'End or cancel the active fast before importing.'
                : 'Add sessions from a Simple Fasting export.'
            }
            disabled={importDisabled}
            onPress={() => void importData()}
          />
          <SettingsActionRow
            icon={FileText}
            title="Export JSON"
            description="Fasting data and app metadata."
            onPress={() => exportData(SettingsExportFormat.Json)}
          />
          <SettingsActionRow
            icon={Table2}
            title="Export CSV"
            description="Session history in spreadsheet format."
            onPress={() => exportData(SettingsExportFormat.Csv)}
          />
          <SettingsActionRow
            icon={Trash2}
            title="Clear data"
            description="Delete local history, settings, and active fast."
            destructive
            onPress={clearLocalData}
          />
        </SettingsSection>

        <SettingsSection index={4} title="About">
          <SettingsActionRow
            icon={Globe}
            title="Website"
            external
            onPress={() => openExternalAction(openWebsite)}
          />
          <SettingsLinkedDocumentRow
            icon={CircleHelp}
            title="FAQ"
            onOpenExternal={() => openExternalAction(openFaq)}
            onOpenLocal={() => router.push('/faq' as Href)}
          />
          <SettingsActionRow
            icon={Sparkles}
            title="What's New"
            description="Version history and release notes."
            onPress={() => router.push('/whats-new' as Href)}
          />
          {canRateApp ? (
            <SettingsActionRow
              icon={Star}
              title="Rate the app"
              onPress={() => openExternalAction(openRateApp)}
            />
          ) : null}
          <SettingsActionRow
            icon={Bug}
            title="Report bug"
            description="bugs@simplefasting.app"
            onPress={reportBug}
          />
          <SettingsActionRow
            icon={Mail}
            title="Support email"
            description="support@simplefasting.app"
            onPress={() => openExternalAction(openSupportEmail)}
          />
          <SettingsRow
            icon={Info}
            title="Build"
            description={buildDescription}
          />
        </SettingsSection>

        <SettingsSection index={5} title="Legal">
          <SettingsLinkedDocumentRow
            icon={Shield}
            title="Privacy Policy"
            onOpenExternal={() => openExternalAction(openPrivacyPolicy)}
            onOpenLocal={() => router.push('/privacy' as Href)}
          />
          <SettingsLinkedDocumentRow
            icon={FileText}
            title="Terms of Use"
            onOpenExternal={() => openExternalAction(openTerms)}
            onOpenLocal={() => router.push('/terms' as Href)}
          />
        </SettingsSection>

    </TabScreenShell>
  );
}

function SettingsSection({
  index,
  title,
  description,
  disabled = false,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index, 5) * 35).duration(180)}
      layout={LinearTransition.duration(180)}
      style={[styles.section, disabled && styles.disabledSection]}>
      <View style={styles.sectionHeading}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {description !== undefined ? (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      <View
        style={[
          styles.sectionPanel,
          { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
        ]}>
        {children}
      </View>
    </Animated.View>
  );
}

function TimerViewPreferencePicker({
  selectedValue,
  onSelect,
}: {
  selectedValue: TimerViewPreference;
  onSelect: (value: TimerViewPreference) => void;
}) {
  return (
    <View style={styles.timerViewControl}>
      <View style={styles.goalFormatHeading}>
        <ThemedText type="smallBold">Timer view</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Choose the default active fast timer display.
        </ThemedText>
      </View>
      <TimerViewToggle value={selectedValue} onChange={onSelect} iconPosition="right" />
    </View>
  );
}

function ThemePicker({
  selectedValue,
  onSelect,
}: {
  selectedValue: ThemePreference;
  onSelect: (value: ThemePreference) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.themePicker}>
      {themeOptions.map((option) => {
        const selected = option.value === selectedValue;
        const Icon = option.icon;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`${option.label} theme`}
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.themeOption,
              {
                backgroundColor: selected ? theme.accentBackground : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            <Icon
              size={24}
              color={selected ? theme.accent : theme.textSecondary}
              strokeWidth={2}
            />
            <ThemedText type="smallBold" style={selected ? { color: theme.accent } : undefined}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const [hour = '20', minute = '00'] = value.split(':');
  const updatePart = (nextHour: string, nextMinute: string): void =>
    onChange(`${nextHour.padStart(2, '0')}:${nextMinute.padStart(2, '0')}`);

  return (
    <View style={styles.timeControl}>
      <View style={styles.timePickers}>
        <View style={styles.timePickerColumn}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.timeLabel}>
            HOURS
          </ThemedText>
          <Picker
            key="daily-reminder-hours"
            selectedValue={String(Number(hour))}
            onValueChange={(nextHour) => updatePart(nextHour, minute)}
            style={styles.timePicker}>
            {reminderHours.map((option) => (
              <Picker.Item
                key={option}
                label={String(option).padStart(2, '0')}
                value={String(option)}
                color={theme.text}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>
        <View style={styles.timePickerColumn}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.timeLabel}>
            MINUTES
          </ThemedText>
          <Picker
            key="daily-reminder-minutes"
            selectedValue={String(Number(minute))}
            onValueChange={(nextMinute) => updatePart(hour, nextMinute)}
            style={styles.timePicker}>
            {reminderMinutes.map((option) => (
              <Picker.Item
                key={option}
                label={String(option).padStart(2, '0')}
                value={String(option)}
                color={theme.text}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>
      </View>
    </View>
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
  const [previewAccentName, setPreviewAccentName] = useState(selectedAccentName);
  const selectedIndex = accentOptions.indexOf(previewAccentName);

  const selectAccent = (accentName: AccentColorName): void => {
    setPreviewAccentName(accentName);
    onSelect(accentName);
  };

  return (
    <View style={styles.accentControl}>
      <CenteredWheelPicker
        accessibilityLabel="Accent color"
        itemWidth={accentItemWidth}
        items={accentOptions}
        keyExtractor={(accentName) => accentName}
        getItemAccessibilityLabel={(accentName) => `${accentColorLabels[accentName]} accent color`}
        selectedIndex={selectedIndex}
        viewportStyle={styles.accentViewport}
        onSelectIndex={(index) => {
          const accentName = accentOptions[index];
          if (accentName !== undefined) selectAccent(accentName);
        }}
        renderItem={(accentName) => (
          <View style={styles.accentItem}>
            <View
              style={[styles.accentSwatch, { backgroundColor: accentColorValues[accentName] }]}
            />
            <View style={styles.accentLabelSlot}>
              {accentName === previewAccentName ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {accentColorLabels[accentName]}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}
        renderOverlay={({ sideInset }) => (
          <View
            pointerEvents="none"
            style={[
              styles.accentSelection,
              {
                left: sideInset,
                transform: [{ translateX: (accentItemWidth - 48) / 2 }],
                borderColor: theme.accent,
                boxShadow: `0 0 0 4px ${theme.accentBackground}`,
              },
            ]}
          />
        )}
      />
    </View>
  );
}

function GoalDurationFormatPicker({
  selectedValue,
  onSelect,
}: {
  selectedValue: GoalDurationFormat;
  onSelect: (value: GoalDurationFormat) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.goalFormatControl}>
      <View style={styles.goalFormatHeading}>
        <ThemedText type="smallBold">Display format</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Used across Fast, Goals, History, and widgets.
        </ThemedText>
      </View>
      <View style={styles.goalFormatOptions}>
        {goalDurationFormatOptions.map((option) => {
          const selected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.goalFormatOption,
                {
                  backgroundColor: selected ? theme.accentBackground : theme.backgroundElement,
                  borderColor: selected ? theme.accentBorder : theme.backgroundSelected,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={selected ? { color: theme.accent } : undefined}>
                {option.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {option.description}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SettingsSwitch({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <SettingsRow
      icon={icon}
      title={title}
      description={description}
      trailing={
        <View style={styles.switchTrailing}>
          <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{ true: theme.accent }}
            thumbColor={Platform.OS === 'android' && value ? theme.accentForeground : undefined}
          />
        </View>
      }
    />
  );
}

function SettingsActionRow({
  icon,
  title,
  description,
  destructive = false,
  external = false,
  disabled = false,
  onPress,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  destructive?: boolean;
  external?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [disabled && styles.disabledRow, pressed && styles.pressed]}>
      <SettingsRow
        icon={icon}
        title={title}
        description={description}
        titleColor={destructive ? theme.danger : undefined}
        trailing={
          external ? (
            <ExternalLink size={18} color={theme.textSecondary} strokeWidth={2} />
          ) : (
            <ChevronRight size={18} color={theme.textSecondary} strokeWidth={2} />
          )
        }
      />
    </Pressable>
  );
}

function SettingsLinkedDocumentRow({
  icon,
  title,
  onOpenExternal,
  onOpenLocal,
}: {
  icon: LucideIcon;
  title: string;
  onOpenExternal: () => void;
  onOpenLocal: () => void;
}) {
  const theme = useTheme();

  return (
    <SettingsRow
      icon={icon}
      title={title}
      trailing={
        <View style={styles.rowActions}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${title} website`}
            hitSlop={4}
            onPress={onOpenExternal}
            style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}>
            <ExternalLink size={18} color={theme.textSecondary} strokeWidth={2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open offline ${title}`}
            hitSlop={4}
            onPress={onOpenLocal}
            style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}>
            <ChevronRight size={18} color={theme.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>
      }
    />
  );
}

function SettingsRow({
  icon,
  title,
  description,
  trailing,
  titleColor,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  titleColor?: string;
}) {
  const theme = useTheme();
  const Icon = icon;

  return (
    <View style={styles.row}>
      {Icon !== undefined ? (
        <View style={[styles.rowIcon, { backgroundColor: theme.accentBackground }]}>
          <Icon size={18} color={theme.accent} strokeWidth={2} />
        </View>
      ) : null}
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
  section: {
    gap: Spacing.xs,
  },
  sectionHeading: { gap: Spacing.half },
  disabledSection: { opacity: 0.52 },
  disabledRow: { opacity: 0.52 },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  sectionPanel: {
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  timeControl: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingTop: 0,
    paddingBottom: Spacing.xs,
  },
  timeLabel: { textAlign: 'center' },
  timePickers: {
    width: '82%',
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timePicker: { width: '100%', minHeight: 116 },
  pickerItem: { backgroundColor: 'transparent' },
  themePicker: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  themeOption: {
    minHeight: 76,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
  },
  accentControl: { gap: Spacing.xs, paddingVertical: Spacing.md },
  accentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  accentViewport: { height: 84, overflow: 'hidden' },
  accentItem: {
    width: accentItemWidth,
    height: 80,
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingTop: Spacing.xs,
  },
  accentSwatch: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
  },
  accentLabelSlot: {
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentSelection: {
    position: 'absolute',
    top: 4,
    width: 48,
    height: 48,
    borderWidth: 2,
    borderRadius: Radius.pill,
  },
  goalFormatControl: {
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  timerViewControl: {
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  goalFormatHeading: {
    gap: Spacing.half,
  },
  goalFormatOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  goalFormatOption: {
    minHeight: 74,
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.xxs,
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    padding: Spacing.xs,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  rowIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  rowText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchTrailing: { width: 52, alignItems: 'flex-end', justifyContent: 'center' },
  rowAction: {
    width: 36,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
