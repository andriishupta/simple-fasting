import generatedDocuments from '@/content/generated/shared-documents.json';

export type SharedDocumentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

export type SharedDocument = {
  id: string;
  title: string;
  version: string;
  effectiveDate?: string;
  description: string;
  intro: string;
  sections: {
    id: string;
    title: string;
    blocks: SharedDocumentBlock[];
  }[];
};

type SharedDocuments = {
  privacy: SharedDocument;
  terms: SharedDocument;
  faq: SharedDocument;
};

export const sharedDocuments = generatedDocuments as SharedDocuments;
