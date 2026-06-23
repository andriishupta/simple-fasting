import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Picker } from '@expo/ui/community/picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  Bell,
  Bug,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileText,
  FileUp,
  Globe,
  Info,
  Laptop,
  Mail,
  Moon,
  Shield,
  Sun,
  Table2,
  Target,
  Timer,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ScreenHeading } from '@/components/screen-heading';
import { TabScreenShell } from '@/components/tab-screen-shell';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  setAccentColorName,
  setThemePreference,
  refreshSettingsSnapshot,
  updateNotificationSettingsAndSchedule,
  useSettings,
  accentColorLabels,
  accentColorValues,
  getAppVersionLabel,
  getLocalNotificationPermissionState,
  LocalNotificationPermissionState,
  openBugReportEmail,
  openFaq,
  openLocalNotificationSettings,
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
  mergeImportedFastSessions,
  reconcileActiveFastEndNotification,
  refreshFastSnapshots,
} from '@/storage/fasting-storage';
import { cancelScheduledNotification } from '@/storage/notification-storage';
import { resetAppStorage } from '@/storage/storage-migrations';
import { shareDiagnosticReport } from '@/storage/diagnostic-storage';
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
  AccentColorName.Red,
  AccentColorName.Orange,
  AccentColorName.Amber,
  AccentColorName.Green,
  AccentColorName.Teal,
  AccentColorName.Blue,
  AccentColorName.Purple,
  AccentColorName.Pink,
] as const;

const accentItemWidth = 76;
const reminderHours = Array.from({ length: 24 }, (_, hour) => hour);
const reminderMinutes = Array.from({ length: 60 }, (_, minute) => minute);

export default function SettingsScreen() {
  const settings = useSettings();
  const [notificationPermissionState, setNotificationPermissionState] =
    useState<LocalNotificationPermissionState>(LocalNotificationPermissionState.Undetermined);
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
  const reportBug = (): void => {
    Alert.alert(
      'Report a bug',
      'You can email us directly or share a local diagnostic file through Mail. Diagnostics never include fasting history or notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email', onPress: () => void openExternalAction(openBugReportEmail) },
        { text: 'Share diagnostics', onPress: () => void exportDiagnostics() },
      ],
    );
  };
  const importData = async (): Promise<void> => {
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
        <SettingsSection title="Appearance">
          <ThemePicker
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
            icon={Target}
            title="Manage fasting goals"
            description={`${settings.goals.filter((goal) => goal.isEnabled).length} active · ${settings.goals.length} total`}
            onPress={() => router.push('/goals' as Href)}
          />
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          description={notificationsAvailable ? undefined : 'Notifications are disabled.'}>
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
                <TimePicker
                  value={settings.notifications.dailyReminderTime ?? '20:00'}
                  onChange={(dailyReminderTime) => {
                    void runNotificationUpdate(async () => {
                      await setDailyReminderTimeAndSchedule(dailyReminderTime);
                    });
                  }}
                />
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

        <SettingsSection title="Data">
          <SettingsActionRow
            icon={FileUp}
            title="Import JSON or CSV"
            description="Add sessions from a Simple Fasting export."
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

        <SettingsSection title="About">
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

        <SettingsSection title="Legal">
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
  title,
  description,
  disabled = false,
  children,
}: {
  title: string;
  description?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.section, disabled && styles.disabledSection]}>
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
    <View style={[styles.themePicker, { borderBottomColor: theme.backgroundSelected }]}>
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
            selectedValue={String(Number(hour))}
            onValueChange={(nextHour) => updatePart(nextHour, minute)}
            style={styles.timePicker}>
            {reminderHours.map((option) => (
              <Picker.Item
                key={option}
                label={String(option).padStart(2, '0')}
                value={String(option)}
                color={theme.text}
              />
            ))}
          </Picker>
        </View>
        <View style={styles.timePickerColumn}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.timeLabel}>
            MINUTES
          </ThemedText>
          <Picker
            selectedValue={String(Number(minute))}
            onValueChange={(nextMinute) => updatePart(hour, nextMinute)}
            style={styles.timePicker}>
            {reminderMinutes.map((option) => (
              <Picker.Item
                key={option}
                label={String(option).padStart(2, '0')}
                value={String(option)}
                color={theme.text}
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
  const scrollRef = useRef<ScrollView>(null);
  const scrollStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const selectedIndex = accentOptions.indexOf(selectedAccentName);
  const sideInset = Math.max(0, (viewportWidth - accentItemWidth) / 2);

  useEffect(() => {
    if (viewportWidth === 0) return;

    scrollRef.current?.scrollTo({ x: selectedIndex * accentItemWidth, animated: false });
  }, [selectedIndex, viewportWidth]);

  useEffect(
    () => () => {
      if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);
    },
    [],
  );

  const selectStoppedAccent = (offsetX: number): void => {
    const index = Math.max(
      0,
      Math.min(accentOptions.length - 1, Math.round(offsetX / accentItemWidth)),
    );

    onSelect(accentOptions[index]);
  };
  const scheduleStoppedAccent = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);

    const offsetX = event.nativeEvent.contentOffset.x;
    scrollStopTimerRef.current = setTimeout(() => selectStoppedAccent(offsetX), 120);
  };
  const finishAccentScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (scrollStopTimerRef.current !== null) clearTimeout(scrollStopTimerRef.current);
    selectStoppedAccent(event.nativeEvent.contentOffset.x);
  };

  return (
    <View style={styles.accentControl}>
      <View style={styles.accentHeading}>
        <ThemedText type="smallBold">Accent color</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {accentColorLabels[selectedAccentName]}
        </ThemedText>
      </View>
      <View
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        style={styles.accentViewport}>
        <ScrollView
          ref={scrollRef}
          horizontal
          accessibilityRole="adjustable"
          accessibilityLabel="Accent color"
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={accentItemWidth}
          snapToAlignment="start"
          scrollEventThrottle={16}
          onScroll={scheduleStoppedAccent}
          onMomentumScrollEnd={finishAccentScroll}
          contentContainerStyle={{ paddingHorizontal: sideInset }}>
          {accentOptions.map((accentName) => (
            <View key={accentName} style={styles.accentItem}>
              <View
                style={[
                  styles.accentSwatch,
                  { backgroundColor: accentColorValues[accentName] },
                ]}
              />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {accentColorLabels[accentName]}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
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
  onPress,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  destructive?: boolean;
  external?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
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
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
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
    gap: Spacing.two,
  },
  sectionHeading: { gap: Spacing.half },
  disabledSection: { opacity: 0.52 },
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
    gap: Spacing.one,
    padding: Spacing.two,
  },
  timeLabel: { textAlign: 'center' },
  timePickers: {
    width: '82%',
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timePicker: { width: '100%', minHeight: 116 },
  themePicker: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  themeOption: {
    minHeight: 76,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  accentControl: { gap: Spacing.two, paddingVertical: Spacing.three },
  accentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  accentViewport: { height: 84, overflow: 'hidden' },
  accentItem: {
    width: accentItemWidth,
    height: 80,
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  accentSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  accentSelection: {
    position: 'absolute',
    top: 4,
    width: 48,
    height: 48,
    borderWidth: 2,
    borderRadius: 24,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  rowText: {
    flex: 1,
    gap: Spacing.one,
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
