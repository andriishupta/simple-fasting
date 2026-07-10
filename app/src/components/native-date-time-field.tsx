import { useState } from 'react';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppThemeColorScheme, useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';

type NativeDateTimeFieldProps = {
  value: Date | null;
  fallbackDate?: Date;
  maximumDate?: Date;
  onChange: (value: Date | null) => void;
};

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);

const formatTime = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date);

const mergeDatePart = ({ current, selected }: { current: Date | null; selected: Date }): Date => {
  const next = current === null ? new Date() : new Date(current);

  next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return next;
};

const mergeTimePart = ({ current, selected }: { current: Date | null; selected: Date }): Date => {
  const next = current === null ? new Date() : new Date(current);

  next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next;
};

export function NativeDateTimeField({
  value,
  fallbackDate,
  maximumDate,
  onChange,
}: NativeDateTimeFieldProps) {
  const theme = useTheme();
  const colorScheme = useAppThemeColorScheme();
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time' | null>(null);
  const pickerValue = value ?? fallbackDate ?? new Date();
  const applyDate = (selectedDate: Date): void => {
    onChange(mergeDatePart({ current: value, selected: selectedDate }));
  };
  const applyTime = (selectedDate: Date): void => {
    onChange(mergeTimePart({ current: value, selected: selectedDate }));
  };
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date): void => {
    if (Platform.OS === 'android') setAndroidPickerMode(null);
    if (event.type === 'dismissed' || selectedDate === undefined) return;
    applyDate(selectedDate);
  };
  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date): void => {
    if (Platform.OS === 'android') setAndroidPickerMode(null);
    if (event.type === 'dismissed' || selectedDate === undefined) return;
    applyTime(selectedDate);
  };

  if (Platform.OS === 'android') {
    return (
      <View style={styles.androidControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.edit')}
          onPress={() => setAndroidPickerMode('date')}
          style={({ pressed }) => [
            styles.androidButton,
            { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.date')}
          </ThemedText>
          <ThemedText type="smallBold" selectable>
            {formatDate(pickerValue)}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.edit')}
          onPress={() => setAndroidPickerMode('time')}
          style={({ pressed }) => [
            styles.androidButton,
            { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.time')}
          </ThemedText>
          <ThemedText type="smallBold" selectable>
            {formatTime(pickerValue)}
          </ThemedText>
        </Pressable>
        {androidPickerMode === 'date' ? (
          <DateTimePicker
            mode="date"
            display="default"
            value={pickerValue}
            maximumDate={maximumDate}
            themeVariant={colorScheme}
            accentColor={theme.accent}
            textColor={theme.text}
            onChange={onDateChange}
          />
        ) : null}
        {androidPickerMode === 'time' ? (
          <DateTimePicker
            mode="time"
            display="default"
            value={pickerValue}
            themeVariant={colorScheme}
            accentColor={theme.accent}
            textColor={theme.text}
            onChange={onTimeChange}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.iosControls}>
      <DateTimePicker
        mode="date"
        display="compact"
        value={pickerValue}
        maximumDate={maximumDate}
        themeVariant={colorScheme}
        accentColor={theme.accent}
        textColor={theme.text}
        onChange={onDateChange}
      />
      <DateTimePicker
        mode="time"
        display="compact"
        value={pickerValue}
        themeVariant={colorScheme}
        accentColor={theme.accent}
        textColor={theme.text}
        onChange={onTimeChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  androidControls: {
    width: '100%',
    gap: Spacing.xs,
  },
  androidButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    borderWidth: 1,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  iosControls: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  pressed: { opacity: 0.72 },
});
