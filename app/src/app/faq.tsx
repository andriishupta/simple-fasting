import { LocalDocumentScreen } from '@/components/local-document-screen';
import { sharedDocuments } from '@/content/shared-documents';

export default function FaqScreen() {
  return <LocalDocumentScreen document={sharedDocuments.faq} />;
}
