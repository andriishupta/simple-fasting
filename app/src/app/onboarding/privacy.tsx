import { LocalDocumentScreen } from '@/components/local-document-screen';
import { sharedDocuments } from '@/content/shared-documents';

export default function OnboardingPrivacyScreen() {
  return <LocalDocumentScreen document={sharedDocuments.privacy} />;
}
