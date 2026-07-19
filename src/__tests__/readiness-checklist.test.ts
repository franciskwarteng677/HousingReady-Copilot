import { describe, expect, it } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import {
  READINESS_CHECKLIST,
  READINESS_CHECKLIST_VERSION,
  evaluateDocumentReadiness,
  type DocumentReadinessEvaluation,
} from "@/lib/readiness/checklist";
import {
  profileSessionSchema,
  type ProfileSession,
} from "@/lib/profile-schema";

const timestamp = "2026-07-18T12:00:00.000Z";

function makeCurrentSyntheticProfile(): ProfileSession {
  const profile = makeCompleteIncomeProfile();
  const residencySource = {
    sourceDocumentId: "residency-document",
    sourceDocumentName: "synthetic-residency-document.pdf",
    sourcePage: 1,
  };
  const confirmedFields = [
    ...profile.confirmedFields,
    {
      fieldId: "documentType" as const,
      reviewGroupId: "residency.documentType",
      label: "Document type",
      value: "Utility bill",
      valueCents: null,
      confirmationOrigin: "extracted" as const,
      sources: [residencySource],
      confirmedAt: timestamp,
    },
  ];

  return profileSessionSchema.parse({
    ...profile,
    documents: [
      ...profile.documents,
      {
        id: "residency-document",
        name: "synthetic-residency-document.pdf",
        mimeType: "application/pdf",
        size: 1_024,
        lastModified: 1_782_000_000_000,
        sampleKind: "residency-document",
        reviewState: "reviewed",
      },
    ],
    confirmedFields,
    counts: {
      ...profile.counts,
      documentsReviewed: 3,
      fieldsConfirmed: confirmedFields.length,
    },
  });
}

function statuses(
  evaluation: DocumentReadinessEvaluation,
): Record<string, string> {
  return Object.fromEntries(
    evaluation.results.map((result) => [
      result.requirementId,
      result.status,
    ]),
  );
}

function withoutDocumentKinds(
  profile: ProfileSession,
  sampleKinds: readonly string[],
): ProfileSession {
  const removedIds = new Set(
    profile.documents
      .filter(
        (document) =>
          document.sampleKind !== null &&
          sampleKinds.includes(document.sampleKind),
      )
      .map((document) => document.id),
  );
  const documents = profile.documents.filter(
    (document) => !removedIds.has(document.id),
  );
  const confirmedFields = profile.confirmedFields
    .map((field) => ({
      ...field,
      sources: field.sources.filter(
        (source) => !removedIds.has(source.sourceDocumentId),
      ),
    }))
    .filter((field) => field.sources.length > 0);

  return profileSessionSchema.parse({
    ...profile,
    documents,
    confirmedFields,
    counts: {
      ...profile.counts,
      documentsReviewed: documents.length,
      fieldsConfirmed: confirmedFields.length,
    },
  });
}

describe("deterministic prototype document-readiness checklist", () => {
  it("marks the current three synthetic samples as identity missing, income present, and residency present", () => {
    const evaluation = evaluateDocumentReadiness(
      makeCurrentSyntheticProfile(),
    );

    expect(statuses(evaluation)).toEqual({
      "identity-document": "missing",
      "income-documentation": "present",
      "residency-documentation": "present",
    });
    expect(
      evaluation.results.find(
        (result) => result.requirementId === "residency-documentation",
      )?.supportingDocuments,
    ).toEqual([
      expect.objectContaining({
        documentName: "synthetic-residency-document.pdf",
        normalizedDocumentType: "utility bill",
        sourcePages: [1],
        matchBasis: "confirmed-document-type",
      }),
    ]);
  });

  it("marks income missing after all income-document metadata is removed", () => {
    const profile = withoutDocumentKinds(makeCurrentSyntheticProfile(), [
      "pay-stub",
      "benefits-letter",
    ]);

    expect(statuses(evaluateDocumentReadiness(profile))).toMatchObject({
      "income-documentation": "missing",
      "residency-documentation": "present",
    });
  });

  it("marks residency missing after residency-document metadata is removed", () => {
    const profile = withoutDocumentKinds(makeCurrentSyntheticProfile(), [
      "residency-document",
    ]);

    expect(statuses(evaluateDocumentReadiness(profile))).toMatchObject({
      "income-documentation": "present",
      "residency-documentation": "missing",
    });
  });

  it("does not let unknown metadata satisfy an allowlisted category", () => {
    const base = makeCompleteIncomeProfile();
    const unknownProfile = profileSessionSchema.parse({
      ...base,
      documents: [
        {
          id: "unknown-document",
          name: "pay-stub-from-an-unknown-source.pdf",
          mimeType: "application/pdf",
          size: 512,
          lastModified: 1_782_000_000_000,
          sampleKind: null,
          reviewState: "no-call",
        },
      ],
      confirmedFields: [],
      counts: {
        ...base.counts,
        documentsReviewed: 1,
        fieldsConfirmed: 0,
      },
    });

    expect(statuses(evaluateDocumentReadiness(unknownProfile))).toEqual({
      "identity-document": "missing",
      "income-documentation": "missing",
      "residency-documentation": "missing",
    });
  });

  it("never emits an expired status because this version has no expiration rule", () => {
    const evaluation = evaluateDocumentReadiness(
      makeCurrentSyntheticProfile(),
    );

    expect(evaluation.results.map((result) => result.status)).not.toContain(
      "expired",
    );
    expect(JSON.stringify(evaluation).toLocaleLowerCase("en-US")).not.toContain(
      "expired",
    );
  });

  it("is independent of income and HUD threshold values", () => {
    const profile = makeCurrentSyntheticProfile();
    const changedIncomeProfile = {
      ...profile,
      confirmedFields: profile.confirmedFields.map((field) =>
        field.fieldId === "grossPay"
          ? { ...field, value: "$99,999.99", valueCents: 9_999_999 }
          : field,
      ),
      hudThresholdCents: 1,
    };

    expect(statuses(evaluateDocumentReadiness(changedIncomeProfile))).toEqual(
      statuses(evaluateDocumentReadiness(profile)),
    );
  });

  it("returns identical immutable output for identical confirmed metadata", () => {
    const profile = makeCurrentSyntheticProfile();
    const first = evaluateDocumentReadiness(profile);
    const second = evaluateDocumentReadiness(structuredClone(profile));

    expect(second).toEqual(first);
    expect(first.checklistVersion).toBe(READINESS_CHECKLIST_VERSION);
    expect(Object.isFrozen(READINESS_CHECKLIST)).toBe(true);
    expect(READINESS_CHECKLIST.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.results)).toBe(true);
    expect(first.results.every(Object.isFrozen)).toBe(true);
  });

  it("does not let filename fallback override a conflicting confirmed type", () => {
    const base = makeCurrentSyntheticProfile();
    const payTypeSource = {
      sourceDocumentId: "pay-document",
      sourceDocumentName: "synthetic-pay-stub.pdf",
      sourcePage: 1,
    };
    const confirmedFields = [
      ...base.confirmedFields,
      {
        fieldId: "documentType" as const,
        reviewGroupId: "pay.documentType",
        label: "Document type",
        value: "Unrecognized record",
        valueCents: null,
        confirmationOrigin: "renter-corrected" as const,
        sources: [payTypeSource],
        confirmedAt: timestamp,
      },
    ];
    const onlyPayDocument = base.documents.filter(
      (document) => document.id === "pay-document",
    );
    const onlyPayFields = confirmedFields.filter((field) =>
      field.sources.some(
        (source) => source.sourceDocumentId === "pay-document",
      ),
    );
    const profile = profileSessionSchema.parse({
      ...base,
      documents: onlyPayDocument,
      confirmedFields: onlyPayFields,
      counts: {
        ...base.counts,
        documentsReviewed: onlyPayDocument.length,
        fieldsConfirmed: onlyPayFields.length,
      },
    });

    expect(statuses(evaluateDocumentReadiness(profile))).toMatchObject({
      "income-documentation": "missing",
    });
  });
});
