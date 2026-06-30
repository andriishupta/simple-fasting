import { LocalDocumentScreen } from '@/components/local-document-screen';
import { sharedDocuments } from '@/content/shared-documents';

export default function OnboardingTermsScreen() {
  return <LocalDocumentScreen document={sharedDocuments.terms} />;
}
