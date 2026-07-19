import { sampleDocuments } from "@/data/sample-documents";
import {
  documentExtractionResultSchema,
  type DocumentExtractionResult,
} from "@/lib/profile-schema";

export const NO_CALL_MESSAGE =
  "This document could not be reliably extracted in the current prototype. Review it manually or use one of the provided synthetic samples.";

export type ExtractionRequest = {
  documentId: string;
  file: File;
};

export interface ExtractionService {
  extract(request: ExtractionRequest): Promise<DocumentExtractionResult>;
}

export async function fingerprintFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export class SyntheticDemoExtractionService implements ExtractionService {
  async extract({
    documentId,
    file,
  }: ExtractionRequest): Promise<DocumentExtractionResult> {
    // The file is fingerprinted only. Its text is never interpreted, followed,
    // executed, or sent anywhere.
    const fingerprint = await fingerprintFile(file);
    const sample = sampleDocuments.find(
      (document) => document.sha256 === fingerprint,
    );

    if (!sample) {
      return documentExtractionResultSchema.parse({
        outcome: "no-call",
        fields: [],
        message: NO_CALL_MESSAGE,
      });
    }

    return documentExtractionResultSchema.parse({
      outcome: "fields",
      sampleKind: sample.kind,
      fields: sample.fields.map((definition, index) => ({
        candidateId: documentId + ":" + definition.fieldId + ":" + index,
        fieldId: definition.fieldId,
        reviewGroupId: definition.reviewGroupId,
        label: definition.label,
        originalValue: definition.value,
        confirmedValue: definition.value,
        confidence: definition.confidence,
        sourceDocumentId: documentId,
        sourceDocumentName: file.name,
        sourcePage: definition.sourcePage,
        sourceText: definition.sourceText,
        evidenceCoordinates: definition.evidenceCoordinates,
        status: "extracted",
        decision: "pending",
      })),
    });
  }
}

export const syntheticDemoExtractor = new SyntheticDemoExtractionService();
