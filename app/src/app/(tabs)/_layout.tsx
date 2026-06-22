import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const theme = useTheme();
  const contentStyle = { backgroundColor: theme.backgroundElement };

  return (
    <NativeTabs tintColor={theme.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger
        name="history"
        role="history"
        contentStyle={contentStyle}
        disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md="analytics"
        />
        <NativeTabs.Trigger.Label>Data</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index" contentStyle={contentStyle} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'timer', selected: 'timer' }}
          md="timer"
        />
        <NativeTabs.Trigger.Label>Fast</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" contentStyle={contentStyle} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
