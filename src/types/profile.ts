import type {
  SampleDocumentKind,
  SupportedDocumentMimeType,
} from "@/lib/profile-schema";

export type DocumentExtractionState =
  | "processing"
  | "reviewed"
  | "no-call"
  | "error";

export type ReviewDocument = {
  id: string;
  name: string;
  mimeType: SupportedDocumentMimeType;
  size: number;
  lastModified: number;
  sampleKind: SampleDocumentKind | null;
  extractionState: DocumentExtractionState;
  noCallMessage?: string;
};

export type FileValidationErrorCode =
  | "unsupported-type"
  | "oversized"
  | "invalid-signature";

export type FileValidationError = {
  id: string;
  fileName: string;
  code: FileValidationErrorCode;
  message: string;
};

export type ProfileProgress = {
  documentsReviewed: number;
  recognizedDocumentsReviewed: number;
  fieldsConfirmed: number;
  fieldsExcludedOrUnresolved: number;
  pendingFields: number;
  pendingExtractions: number;
  unresolvedConflictGroupIds: string[];
  profileComplete: boolean;
};
