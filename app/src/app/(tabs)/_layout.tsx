import { useMemo } from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';

export const unstable_settings = {
  anchor: 'index',
};

export default function TabLayout() {
  const theme = useTheme();
  const contentStyle = useMemo(
    () => ({ backgroundColor: theme.backgroundElement }),
    [theme.backgroundElement],
  );

  return (
    <NativeTabs
      tintColor={theme.accent}
      backgroundColor={theme.background}
      blurEffect="systemMaterial"
      disableTransparentOnScrollEdge
      minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger
        name="history"
        role="history"
        contentStyle={contentStyle}
        disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md="analytics"
        />
        <NativeTabs.Trigger.Label>{t('tabs.data')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index" contentStyle={contentStyle} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'timer', selected: 'timer' }}
          md="timer"
        />
        <NativeTabs.Trigger.Label>{t('tabs.fast')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" contentStyle={contentStyle} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
