import { useCallback, useEffect, useState } from 'react';
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
  ChevronUp,
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
import { t } from '@/locales/i18n';
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
  mergeImportedSettings,
  openBugReportEmail,
  openFaq,
  openLocalNotificationSettings,
  openPrivacyPolicy,
  openRateApp,
  openSupportEmail,
  openTerms,
  openWebsite,
  requestLocalNotificationPermission,
  reconcileDailyReminderNotification,
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
import { parseImportData } from '@/storage/data-import';

const themeOptions = [
  {
    labelKey: 'settings.theme.system',
    value: ThemePreference.System,
    icon: Laptop,
  },
  {
    labelKey: 'settings.theme.light',
    value: ThemePreference.Light,
    icon: Sun,
  },
  {
    labelKey: 'settings.theme.dark',
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
    labelKey: 'settings.goalDuration.hours',
    descriptionKey: 'settings.goalDuration.hoursDescription',
    value: GoalDurationFormat.Hours,
  },
  {
    labelKey: 'settings.goalDuration.days',
    descriptionKey: 'settings.goalDuration.daysDescription',
    value: GoalDurationFormat.Days,
  },
] as const;

const accentItemWidth = 64;
const reminderHours = Array.from({ length: 24 }, (_, hour) => hour);
const reminderMinutes = Array.from({ length: 60 }, (_, minute) => minute);
const dailyReminderTimeCommitDelayMs = 600;

export default function SettingsScreen() {
  const settings = useSettings();
  const activeFastState = useActiveFastState();
  const importDisabled = activeFastState.session !== null;
  const canRateApp = getStoreReviewUrl() !== null;
  const [notificationPermissionState, setNotificationPermissionState] =
    useState<LocalNotificationPermissionState>(LocalNotificationPermissionState.Undetermined);
  const [canEmailDiagnostics, setCanEmailDiagnostics] = useState(false);
  const [liveActivityUpdating, setLiveActivityUpdating] = useState(false);
  const [fastEndReminderUpdating, setFastEndReminderUpdating] = useState(false);
  const [dailyReminderUpdating, setDailyReminderUpdating] = useState(false);
  const [dailyReminderTimeExpanded, setDailyReminderTimeExpanded] = useState(false);
  const [installedAt] = useState(
    () => appStorage.get(StorageKey.Metadata)?.initializedAt ?? new Date().toISOString(),
  );
  const buildDescription = t('settings.installedBuild', {
    version: getAppVersionLabel(),
    date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(installedAt)),
  });
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
  const runNotificationUpdate = useCallback(async (update: () => Promise<void>): Promise<void> => {
    try {
      await update();
    } catch {
      Alert.alert(t('settings.notificationUpdateFailedTitle'), t('settings.tryAgain'));
    }
  }, []);
  const commitDailyReminderTime = useCallback(
    (dailyReminderTime: string): void => {
      void runNotificationUpdate(async () => {
        await setDailyReminderTimeAndSchedule(dailyReminderTime);
      });
    },
    [runNotificationUpdate],
  );
  const setFastEndReminderEnabled = async (fastEndReminderEnabled: boolean): Promise<void> => {
    setFastEndReminderUpdating(true);
    await runNotificationUpdate(async () => {
      if (fastEndReminderEnabled && !(await requestLocalNotificationPermission())) {
        Alert.alert(
          t('settings.notificationsOffTitle'),
          t('settings.notificationsOffEndMessage'),
        );
        return;
      }

      setNotificationPermissionState(await getLocalNotificationPermissionState());
      await updateNotificationSettingsAndSchedule((notifications) => ({
        ...notifications,
        fastEndReminderEnabled,
      }));
      await reconcileActiveFastEndNotification();
    }).finally(() => setFastEndReminderUpdating(false));
  };
  const setDailyReminderEnabled = async (dailyReminderEnabled: boolean): Promise<void> => {
    setDailyReminderUpdating(true);
    setDailyReminderTimeExpanded(false);
    await runNotificationUpdate(async () => {
      if (dailyReminderEnabled && !(await requestLocalNotificationPermission())) {
        Alert.alert(
          t('settings.notificationsOffTitle'),
          t('settings.notificationsOffDailyMessage'),
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
    }).finally(() => setDailyReminderUpdating(false));
  };
  const setLiveActivityEnabled = (liveActivitiesEnabled: boolean): void => {
    setLiveActivityUpdating(true);
    setLiveActivitiesEnabled(liveActivitiesEnabled);
    void syncActiveFastingLiveActivity().finally(() => setLiveActivityUpdating(false));
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
      Alert.alert(t('settings.exportFailedTitle'), t('settings.exportFailedMessage'));
    }
  };
  const exportDiagnostics = async (): Promise<void> => {
    try {
      await shareDiagnosticReport();
    } catch {
      Alert.alert(t('settings.shareFailedTitle'), t('settings.shareFailedMessage'));
    }
  };
  const emailDiagnostics = async (): Promise<void> => {
    try {
      await emailDiagnosticReport();
    } catch {
      Alert.alert(t('settings.emailFailedTitle'), t('settings.emailFailedMessage'));
    }
  };
  const reportBug = (): void => {
    const actionButtons: AlertButton[] = [
      { text: t('common.email'), onPress: () => void openExternalAction(openBugReportEmail) },
      ...(canEmailDiagnostics
        ? [{ text: t('settings.emailWithDiagnostics'), onPress: () => void emailDiagnostics() }]
        : []),
      { text: t('settings.getDiagnosticsFile'), onPress: () => void exportDiagnostics() },
    ];
    const buttons =
      Platform.OS === 'android' && actionButtons.length >= 3
        ? actionButtons
        : [{ text: t('common.cancel'), style: 'cancel' as const }, ...actionButtons];

    Alert.alert(
      t('settings.reportBug'),
      t('settings.reportBugMessage'),
      buttons,
    );
  };
  const importData = async (): Promise<void> => {
    if (getActiveFastState().session !== null) {
      Alert.alert(
        t('settings.importUnavailableTitle'),
        t('settings.importUnavailableMessage'),
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
        Alert.alert(t('settings.fileTooLargeTitle'), t('settings.fileTooLargeMessage'));
        return;
      }
      const imported = parseImportData({
        content: await new File(asset.uri).text(),
        filename: asset.name,
      });
      const { saved, skipped: mergeSkipped } = mergeImportedFastSessions(imported.sessions);
      const skipped = imported.skippedSessions + mergeSkipped;
      const importedSettings = mergeImportedSettings(imported.settings);
      if (importedSettings !== null) {
        await reconcileDailyReminderNotification();
        await syncActiveFastingLiveActivity();
      }
      Alert.alert(
        t('settings.importCompleteTitle'),
        [
          t('settings.importCompleteMessage', {
            saved,
            savedLabel: saved === 1 ? t('data.sessionSingular') : t('data.sessionPlural'),
            skipped,
            skippedLabel: skipped === 1 ? 'entry was' : 'entries were',
          }),
          importedSettings === null
            ? t('settings.importSettingsUnchanged')
            : t('settings.importSettingsRestored'),
        ].join('\n'),
      );
    } catch (error) {
      Alert.alert(
        t('settings.importFailedTitle'),
        error instanceof Error ? error.message : t('settings.importFailedMessage'),
      );
    }
  };
  const clearLocalData = (): void => {
    Alert.alert(
      t('settings.clearAllTitle'),
      t('settings.clearAllMessage'),
      [
        { text: t('settings.no'), style: 'cancel' },
        {
          text: t('settings.yesDelete'),
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
                Alert.alert(t('settings.clearFailedTitle'), t('settings.clearFailedMessage'));
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
      Alert.alert(t('settings.unableToOpenTitle'), t('settings.unableToOpenMessage'));
    }
  };

  return (
    <TabScreenShell maxWidth={Math.min(MaxContentWidth, 640)}>
        <ScreenHeading>{t('settings.title')}</ScreenHeading>
        <SettingsSection index={0} title={t('settings.sections.goals')}>
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
            title={t('settings.manageGoals')}
            description={t('settings.manageGoalsDescription', {
              active: settings.goals.filter((goal) => goal.isEnabled).length,
              total: settings.goals.length,
            })}
            onPress={() => router.push('/goals' as Href)}
          />
        </SettingsSection>

        <SettingsSection
          index={1}
          title={t('settings.sections.notifications')}
          description={
            notificationsAvailable
              ? t('settings.notificationsAvailable')
              : t('settings.notificationsUnavailable')
          }>
          {Platform.OS === 'ios' ? (
            <SettingsSwitch
              icon={Activity}
              title={t('settings.liveActivity')}
              description={t('settings.liveActivityDescription')}
              value={settings.liveActivitiesEnabled}
              onValueChange={setLiveActivityEnabled}
              disabled={liveActivityUpdating}
            />
          ) : null}
          {notificationsAvailable ? (
            <>
              <SettingsSwitch
                icon={Timer}
                title={t('settings.endReminder')}
                description={t('settings.endReminderDescription')}
                value={settings.notifications.fastEndReminderEnabled}
                onValueChange={setFastEndReminderEnabled}
                disabled={fastEndReminderUpdating}
              />
              <DailyReminderRow
                value={settings.notifications.dailyReminderTime ?? '20:00'}
                enabled={settings.notifications.dailyReminderEnabled}
                expanded={dailyReminderTimeExpanded}
                updating={dailyReminderUpdating}
                onValueChange={setDailyReminderEnabled}
                onToggleExpanded={() => setDailyReminderTimeExpanded((expanded) => !expanded)}
              />
              {settings.notifications.dailyReminderEnabled && dailyReminderTimeExpanded && (
                <Animated.View
                  entering={FadeInDown.duration(180)}
                  exiting={FadeOutUp.duration(140)}
                  layout={LinearTransition.duration(180)}>
                  <TimePicker
                    value={settings.notifications.dailyReminderTime ?? '20:00'}
                    onChange={commitDailyReminderTime}
                  />
                </Animated.View>
              )}
            </>
          ) : (
            <SettingsActionRow
              icon={Bell}
              title={t('settings.enableNotifications')}
              description={t('settings.enableNotificationsDescription')}
              onPress={() => void enableNotificationsFromSettings()}
            />
          )}
        </SettingsSection>

        <SettingsSection index={2} title={t('settings.sections.appearance')}>
          <ThemePicker
            selectedValue={settings.themePreference}
            onSelect={setThemePreference}
          />
          <AccentPicker
            selectedAccentName={settings.accentColorName}
            onSelect={(accentColorName) => {
              setAccentColorName(accentColorName);
              refreshFastSnapshots();
              void syncActiveFastingLiveActivity();
            }}
          />
        </SettingsSection>

        <SettingsSection index={3} title={t('settings.sections.data')}>
          <SettingsActionRow
            icon={FileInput}
            title={t('settings.import')}
            description={
              importDisabled
                ? t('settings.importDisabledDescription')
                : t('settings.importDescription')
            }
            disabled={importDisabled}
            onPress={() => void importData()}
          />
          <SettingsActionRow
            icon={FileText}
            title={t('settings.exportJson')}
            description={t('settings.exportJsonDescription')}
            onPress={() => exportData(SettingsExportFormat.Json)}
          />
          <SettingsActionRow
            icon={Table2}
            title={t('settings.exportCsv')}
            description={t('settings.exportCsvDescription')}
            onPress={() => exportData(SettingsExportFormat.Csv)}
          />
          <SettingsActionRow
            icon={Trash2}
            title={t('settings.clearData')}
            description={t('settings.clearDataDescription')}
            destructive
            onPress={clearLocalData}
          />
        </SettingsSection>

        <SettingsSection index={4} title={t('settings.sections.about')}>
          <SettingsActionRow
            icon={Globe}
            title={t('settings.website')}
            external
            onPress={() => openExternalAction(openWebsite)}
          />
          <SettingsLinkedDocumentRow
            icon={CircleHelp}
            title={t('navigation.faq')}
            onOpenExternal={() => openExternalAction(openFaq)}
            onOpenLocal={() => router.push('/faq' as Href)}
          />
          <SettingsActionRow
            icon={Sparkles}
            title={t('navigation.whatsNew')}
            description={t('settings.versionHistory')}
            onPress={() => router.push('/whats-new' as Href)}
          />
          {canRateApp ? (
            <SettingsActionRow
              icon={Star}
              title={t('settings.rateApp')}
              onPress={() => openExternalAction(openRateApp)}
            />
          ) : null}
          <SettingsActionRow
            icon={Bug}
            title={t('settings.reportBug')}
            description="bugs@simplefasting.app"
            onPress={reportBug}
          />
          <SettingsActionRow
            icon={Mail}
            title={t('settings.supportEmail')}
            description="support@simplefasting.app"
            onPress={() => openExternalAction(openSupportEmail)}
          />
          <SettingsRow
            icon={Info}
            title={t('settings.build')}
            description={buildDescription}
          />
        </SettingsSection>

        <SettingsSection index={5} title={t('settings.sections.legal')}>
          <SettingsLinkedDocumentRow
            icon={Shield}
            title={t('navigation.privacy')}
            onOpenExternal={() => openExternalAction(openPrivacyPolicy)}
            onOpenLocal={() => router.push('/privacy' as Href)}
          />
          <SettingsLinkedDocumentRow
            icon={FileText}
            title={t('navigation.terms')}
            onOpenExternal={() => openExternalAction(openTerms)}
            onOpenLocal={() => router.push('/terms' as Href)}
          />
        </SettingsSection>

    </TabScreenShell>
  );
}

function DailyReminderRow({
  value,
  enabled,
  expanded,
  updating,
  onValueChange,
  onToggleExpanded,
}: {
  value: string;
  enabled: boolean;
  expanded: boolean;
  updating: boolean;
  onValueChange: (value: boolean) => void;
  onToggleExpanded: () => void;
}) {
  const theme = useTheme();
  const Chevron = expanded ? ChevronUp : ChevronRight;

  return (
    <SettingsRow
      icon={Bell}
      title={t('settings.dailyReminder')}
      description={enabled
        ? t('settings.dailyReminderTimeDescription', { time: value })
        : t('settings.dailyReminderDescription')}
      secondaryDescription={enabled ? t('settings.dailyReminderActiveFastNote') : undefined}
      trailing={
        <View style={styles.dailyReminderTrailing}>
          <View style={styles.chevronSlot}>
            {enabled ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={expanded
                  ? t('settings.collapseDailyReminderTime')
                  : t('settings.expandDailyReminderTime')}
                hitSlop={8}
                onPress={onToggleExpanded}
                style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}>
                <Chevron size={18} color={theme.textSecondary} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
          <Switch
            value={enabled}
            onValueChange={onValueChange}
            disabled={updating}
            trackColor={{ true: theme.accent }}
            thumbColor={Platform.OS === 'android' && enabled ? theme.accentForeground : undefined}
          />
        </View>
      }
    />
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
        <ThemedText type="smallBold">{t('settings.timerView.heading')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('settings.timerView.description')}
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
        const label = t(option.labelKey);

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={t('settings.theme.accessibility', { theme: label })}
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.themeOption,
              {
                backgroundColor: selected ? theme.accentBackground : theme.backgroundElement,
                borderColor: selected ? theme.accentBorder : theme.backgroundSelected,
              },
              pressed && styles.pressed,
            ]}>
            <Icon
              size={24}
              color={selected ? theme.accent : theme.textSecondary}
              strokeWidth={2}
            />
            <ThemedText type="smallBold" style={selected ? { color: theme.accent } : undefined}>
              {label}
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
  const [draft, setDraft] = useState({ sourceValue: value, value });
  const draftValue = draft.sourceValue === value ? draft.value : value;
  const [hour = '20', minute = '00'] = draftValue.split(':');
  const updatePart = (nextHour: string, nextMinute: string): void =>
    setDraft({
      sourceValue: value,
      value: `${nextHour.padStart(2, '0')}:${nextMinute.padStart(2, '0')}`,
    });

  useEffect(() => {
    if (draftValue === value) return;

    const commitTimer = setTimeout(() => {
      onChange(draftValue);
    }, dailyReminderTimeCommitDelayMs);

    return () => {
      clearTimeout(commitTimer);
    };
  }, [draftValue, onChange, value]);

  return (
    <View style={styles.timeControl}>
      <View style={styles.timePickers}>
        <View style={styles.timePickerColumn}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.timeLabel}>
            {t('common.hours').toUpperCase()}
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
              />
            ))}
          </Picker>
        </View>
        <View style={styles.timePickerColumn}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.timeLabel}>
            {t('common.minutes').toUpperCase()}
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
        accessibilityLabel={t('settings.accentAccessibility')}
        itemWidth={accentItemWidth}
        items={accentOptions}
        keyExtractor={(accentName) => accentName}
        getItemAccessibilityLabel={(accentName) =>
          t('settings.accentItemAccessibility', { color: accentColorLabels[accentName] })
        }
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
        <ThemedText type="smallBold">{t('settings.goalDuration.heading')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('settings.goalDuration.description')}
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
                {t(option.labelKey)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t(option.descriptionKey)}
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
            accessibilityLabel={t('settings.openWebsiteAccessibility', { title })}
            hitSlop={4}
            onPress={onOpenExternal}
            style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}>
            <ExternalLink size={18} color={theme.textSecondary} strokeWidth={2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.openOfflineAccessibility', { title })}
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
  secondaryDescription,
  trailing,
  titleColor,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  secondaryDescription?: string;
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
        {secondaryDescription !== undefined ? (
          <ThemedText type="small" themeColor="textSecondary">
            {secondaryDescription}
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
  timePicker: {
    width: '100%',
    minHeight: 116,
    overflow: 'hidden',
    borderRadius: Radius.control,
    borderCurve: 'continuous',
  },
  dailyReminderTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chevronSlot: {
    width: 36,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    borderWidth: 1,
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
