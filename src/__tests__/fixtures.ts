import type {
  ApprovedFieldId,
  ExtractedField,
} from "@/lib/profile-schema";
import type { ReviewDocument } from "@/types/profile";

type TestFileOptions = {
  name?: string;
  type?: string;
  bytes?: Uint8Array;
  size?: number;
  lastModified?: number;
};

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function makeTestFile({
  name = "test.pdf",
  type = "application/pdf",
  bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]),
  size = bytes.byteLength,
  lastModified = 1_782_000_000_000,
}: TestFileOptions = {}): File {
  return {
    name,
    type,
    size,
    lastModified,
    arrayBuffer: async () => copyToArrayBuffer(bytes),
    slice: (start = 0, end = bytes.byteLength) => {
      const slice = bytes.slice(start, end);

      return {
        size: slice.byteLength,
        type,
        arrayBuffer: async () => copyToArrayBuffer(slice),
      } as Blob;
    },
  } as File;
}

export function makeField(
  overrides: Partial<ExtractedField> = {},
): ExtractedField {
  const fieldId: ApprovedFieldId = overrides.fieldId ?? "fullName";

  return {
    candidateId: "document-1:" + fieldId + ":0",
    fieldId,
    reviewGroupId: "person.fullName",
    label: "Full name",
    originalValue: "Maria Johnson",
    confirmedValue: "Maria Johnson",
    confidence: 0.99,
    sourceDocumentId: "document-1",
    sourceDocumentName: "synthetic-pay-stub.pdf",
    sourcePage: 1,
    sourceText: "Employee: Maria Johnson",
    status: "extracted",
    decision: "pending",
    ...overrides,
  };
}

export function makeReviewDocument(
  overrides: Partial<ReviewDocument> = {},
): ReviewDocument {
  return {
    id: "document-1",
    name: "synthetic-pay-stub.pdf",
    mimeType: "application/pdf",
    size: 2_048,
    lastModified: 1_782_000_000_000,
    sampleKind: "pay-stub",
    extractionState: "reviewed",
    ...overrides,
  };
}
