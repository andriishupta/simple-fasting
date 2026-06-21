import { LocalDocumentScreen } from '@/components/local-document-screen';
import { sharedDocuments } from '@/content/shared-documents';

export default function PrivacyScreen() {
  return <LocalDocumentScreen document={sharedDocuments.privacy} />;
}
