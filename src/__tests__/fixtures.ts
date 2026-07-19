import type {
  ApprovedFieldId,
  ConfirmedProfileField,
  ExtractedField,
  ProfileSession,
} from "@/lib/profile-schema";
import { profileSessionSchema } from "@/lib/profile-schema";
import { frozen2026MtspCorpus } from "@/data/rules";
import { parseCurrencyToCents } from "@/lib/income-calculation";
import {
  ruleCorpusSchema,
  type RuleCorpus,
} from "@/lib/rules-schema";
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

type CompleteIncomeProfileOptions = {
  grossPay?: string;
  payFrequency?: string;
  monthlyBenefit?: string;
  fullName?: string;
  omitFields?: readonly ApprovedFieldId[];
  profileComplete?: boolean;
  updatedAt?: string;
};

export function makeCompleteIncomeProfile({
  grossPay = "$1,620.00",
  payFrequency = "Biweekly",
  monthlyBenefit = "$650.00",
  fullName = "Maria Johnson",
  omitFields = [],
  profileComplete = true,
  updatedAt = "2026-07-18T12:00:00.000Z",
}: CompleteIncomeProfileOptions = {}): ProfileSession {
  const paySource = {
    sourceDocumentId: "pay-document",
    sourceDocumentName: "synthetic-pay-stub.pdf",
    sourcePage: 1,
  };
  const benefitSource = {
    sourceDocumentId: "benefit-document",
    sourceDocumentName: "synthetic-benefits-letter.pdf",
    sourcePage: 1,
  };
  const candidateFields: ConfirmedProfileField[] = [
    {
      fieldId: "fullName",
      reviewGroupId: "person.fullName",
      label: "Full name",
      value: fullName,
      valueCents: null,
      confirmationOrigin: "extracted",
      sources: [paySource],
      confirmedAt: updatedAt,
    },
    {
      fieldId: "grossPay",
      reviewGroupId: "employment.grossPay.currentPeriod",
      label: "Gross pay",
      value: grossPay,
      valueCents: parseCurrencyToCents(grossPay),
      confirmationOrigin: "extracted",
      sources: [paySource],
      confirmedAt: updatedAt,
    },
    {
      fieldId: "payFrequency",
      reviewGroupId: "employment.payFrequency",
      label: "Pay frequency",
      value: payFrequency,
      valueCents: null,
      confirmationOrigin: "extracted",
      sources: [paySource],
      confirmedAt: updatedAt,
    },
    {
      fieldId: "monthlyBenefit",
      reviewGroupId: "benefits.monthlyBenefit",
      label: "Monthly benefit",
      value: monthlyBenefit,
      valueCents: parseCurrencyToCents(monthlyBenefit),
      confirmationOrigin: "extracted",
      sources: [benefitSource],
      confirmedAt: updatedAt,
    },
  ];
  const fields = candidateFields.filter(
    (field) => !omitFields.includes(field.fieldId),
  );

  return profileSessionSchema.parse({
    version: 3,
    revision: 1,
    correctionHistory: [],
    documents: [
      {
        id: "pay-document",
        name: "synthetic-pay-stub.pdf",
        mimeType: "application/pdf",
        size: 2_048,
        lastModified: 1_782_000_000_000,
        sampleKind: "pay-stub",
        reviewState: "reviewed",
      },
      {
        id: "benefit-document",
        name: "synthetic-benefits-letter.pdf",
        mimeType: "application/pdf",
        size: 1_536,
        lastModified: 1_781_000_000_000,
        sampleKind: "benefits-letter",
        reviewState: "reviewed",
      },
    ],
    confirmedFields: fields,
    profileComplete,
    counts: {
      documentsReviewed: 2,
      fieldsConfirmed: fields.length,
      fieldsExcluded: 0,
      unresolvedConflicts: 0,
    },
    updatedAt,
  });
}

export function makeVerifiedRuleCorpus(): RuleCorpus {
  const syntheticCitation = {
    citationId: "synthetic-threshold-sentinel-household-2",
    sectionOrRowId: "synthetic-test-row.household-2",
    passage:
      "Synthetic test sentinel used only to verify citation plumbing. This is not an official rule or published threshold.",
    topics: ["threshold", "income limit", "limit source"],
    sourceType: "organizer-pack" as const,
    sourceTitle: "Synthetic threshold test sentinel — not official data",
    sourcePublisher: "HousingReady Copilot test fixture — not an official publisher",
    sourceUrl: "https://example.test/synthetic-threshold-sentinel",
    effectiveDate: "2026-04-01",
    verificationStatus: "verified" as const,
  };

  return ruleCorpusSchema.parse({
    ...frozen2026MtspCorpus,
    corpusId: "verified-test-corpus",
    effectiveDate: "2026-04-01",
    sourceVersion: "verified-test-2026-v1",
    citationPassages: [
      ...frozen2026MtspCorpus.citationPassages,
      syntheticCitation,
    ],
    householdSizeThresholds:
      frozen2026MtspCorpus.householdSizeThresholds.map((threshold) =>
        threshold.householdSize === 2
          ? {
              ...threshold,
              annualIncomeLimitCents: 12_345,
              citationId: syntheticCitation.citationId,
              verificationStatus: "verified" as const,
            }
          : threshold,
      ),
    dataVerificationStatus: "verified",
    verificationNotes:
      "Synthetic sentinel fixture used only to exercise verified-data code paths. It is not official rule data.",
  });
}
