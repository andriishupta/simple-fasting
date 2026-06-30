import { LocalDocumentScreen } from '@/components/local-document-screen';
import { sharedDocuments } from '@/content/shared-documents';

export default function WhatsNewScreen() {
  return <LocalDocumentScreen document={sharedDocuments.whatsNew} />;
}
