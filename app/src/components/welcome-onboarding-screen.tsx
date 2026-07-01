import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, Palette, ShieldCheck, Smartphone, Timer, WifiOff } from 'lucide-react-native';

import { AppButton } from '@/components/app-button';
import { ScreenHeading } from '@/components/screen-heading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/locales/i18n';

const features = [
  {
    icon: Timer,
    titleKey: 'onboarding.features.timerTitle',
    descriptionKey: 'onboarding.features.timerDescription',
  },
  {
    icon: WifiOff,
    titleKey: 'onboarding.features.offlineTitle',
    descriptionKey: 'onboarding.features.offlineDescription',
  },
  {
    icon: ShieldCheck,
    titleKey: 'onboarding.features.privacyTitle',
    descriptionKey: 'onboarding.features.privacyDescription',
  },
  {
    icon: Palette,
    titleKey: 'onboarding.features.accentTitle',
    descriptionKey: 'onboarding.features.accentDescription',
  },
  {
    icon: Smartphone,
    titleKey: 'onboarding.features.remindersTitle',
    descriptionKey: 'onboarding.features.remindersDescription',
  },
] as const;

export function WelcomeOnboardingScreen({
  initialAccepted = false,
  onAccept,
  onOpenPrivacyPolicy,
  onOpenTerms,
}: {
  initialAccepted?: boolean;
  onAccept: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenTerms: () => void;
}) {
  const theme = useTheme();
  const [accepted, setAccepted] = useState(initialAccepted);

  return (
    <ThemedView type="backgroundElement" style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <ScreenHeading align="center">{t('onboarding.welcomeTitle')}</ScreenHeading>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              {t('onboarding.welcomeBody')}
            </ThemedText>
          </View>

          <View style={styles.features}>
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <View key={feature.titleKey} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: theme.accentBackground }]}>
                    <Icon size={20} color={theme.accent} strokeWidth={2.2} />
                  </View>
                  <View style={styles.featureCopy}>
                    <ThemedText type="smallBold">{t(feature.titleKey)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t(feature.descriptionKey)}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.legal}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted }}
              accessibilityLabel={t('onboarding.agreementAccessibilityLabel')}
              onPress={() => setAccepted((value) => !value)}
              style={({ pressed }) => [
                styles.checkboxRow,
                { borderColor: accepted ? theme.accentBorder : theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: accepted ? theme.accent : 'transparent',
                    borderColor: accepted ? theme.accent : theme.textSecondary,
                  },
                ]}>
                {accepted ? <Check size={15} color={theme.accentForeground} strokeWidth={3} /> : null}
              </View>
              <ThemedText style={styles.checkboxText}>
                {t('onboarding.agreementAccessibilityLabel')}.
              </ThemedText>
            </Pressable>

            <View style={styles.links}>
              <Pressable
                accessibilityRole="link"
                onPress={onOpenTerms}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">{t('navigation.terms')}</ThemedText>
              </Pressable>
              <ThemedText type="small" themeColor="textSecondary">
                ·
              </ThemedText>
              <Pressable
                accessibilityRole="link"
                onPress={onOpenPrivacyPolicy}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">{t('navigation.privacy')}</ThemedText>
              </Pressable>
            </View>
          </View>

          <AppButton
            accessibilityHint={
              accepted
                ? t('onboarding.continueHint')
                : t('onboarding.agreementBlocked')
            }
            accessibilityState={{ disabled: !accepted }}
            disabled={!accepted}
            label={t('onboarding.continue')}
            onPress={onAccept}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 460),
    gap: Spacing.four,
  },
  hero: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  features: {
    gap: Spacing.three,
  },
  featureRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  featureIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderCurve: 'continuous',
  },
  featureCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  legal: {
    gap: Spacing.two,
  },
  checkboxRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
  },
  checkboxText: {
    flex: 1,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.72,
  },
});
