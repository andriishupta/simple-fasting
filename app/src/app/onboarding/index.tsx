import { router } from 'expo-router';

import { WelcomeOnboardingScreen } from '@/components/welcome-onboarding-screen';
import {
  acceptLegalConsent,
  refreshSettingsSnapshot,
  useSettings,
} from '@/storage/settings-storage';

export default function WelcomeOnboardingRoute() {
  const settings = useSettings();

  const continueToNotifications = (): void => {
    if (!settings.legalConsentAccepted) {
      acceptLegalConsent();
      refreshSettingsSnapshot();
    }
    router.push('/onboarding/notifications');
  };

  return (
    <WelcomeOnboardingScreen
      initialAccepted={settings.legalConsentAccepted}
      onAccept={continueToNotifications}
      onOpenPrivacyPolicy={() => router.push('/onboarding/privacy')}
      onOpenTerms={() => router.push('/onboarding/terms')}
    />
  );
}
