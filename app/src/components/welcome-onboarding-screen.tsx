import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, Palette, ShieldCheck, Smartphone, Timer, WifiOff } from 'lucide-react-native';

import { AppButton } from '@/components/app-button';
import { ScreenHeading } from '@/components/screen-heading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const features = [
  {
    icon: Timer,
    title: 'Simple fasting timer',
    description: 'Start a fast quickly and keep your elapsed or remaining time visible.',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    description: 'Your active fast, history, goals, and settings stay on this device.',
  },
  {
    icon: ShieldCheck,
    title: 'No tracking',
    description: 'No account, no ads, no behavioral profiling, and no advertising identifiers.',
  },
  {
    icon: Palette,
    title: 'Customisation',
    description: 'Personalize the app with a calm accent color that also appears in widgets.',
  },
  {
    icon: Smartphone,
    title: 'Simple reminders',
    description: 'Optional local notifications can remind you when a fasting goal is reached.',
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
            <ScreenHeading align="center">Welcome to Simple Fasting</ScreenHeading>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              Simple Fasting helps you track fasts calmly, privately, and without unnecessary
              accounts or clutter.
            </ThemedText>
          </View>

          <View style={styles.features}>
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <View key={feature.title} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: theme.accentBackground }]}>
                    <Icon size={20} color={theme.accent} strokeWidth={2.2} />
                  </View>
                  <View style={styles.featureCopy}>
                    <ThemedText type="smallBold">{feature.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {feature.description}
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
              accessibilityLabel="I agree to the Terms of Use and Privacy Policy"
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
                I agree to the Terms of Use and Privacy Policy.
              </ThemedText>
            </Pressable>

            <View style={styles.links}>
              <Pressable
                accessibilityRole="link"
                onPress={onOpenTerms}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">Terms of Use</ThemedText>
              </Pressable>
              <ThemedText type="small" themeColor="textSecondary">
                ·
              </ThemedText>
              <Pressable
                accessibilityRole="link"
                onPress={onOpenPrivacyPolicy}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary">Privacy Policy</ThemedText>
              </Pressable>
            </View>
          </View>

          <AppButton
            accessibilityHint={
              accepted
                ? 'Continues to notification setup'
                : 'Check the agreement box before continuing'
            }
            accessibilityState={{ disabled: !accepted }}
            disabled={!accepted}
            label="Agree and Continue"
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
