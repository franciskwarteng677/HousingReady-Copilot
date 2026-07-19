import { describe, expect, it } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import {
  PACKET_COVER_DISCLAIMER,
  PACKET_FINAL_REVIEW_STATEMENT,
  buildReadinessPacketContent,
  packetContentContainsUnsafePersistenceData,
  type ReadinessPacketContent,
} from "@/lib/packet-content";
import {
  buildReadinessPacketPdfSections,
  generateReadinessPacketPdf,
} from "@/lib/packet-pdf";
import {
  applyConfirmedProfileCorrection,
} from "@/lib/profile-corrections";
import {
  profileSessionSchema,
  type ConfirmedProfileField,
  type ProfileSession,
} from "@/lib/profile-schema";
import {
  createPrepareSession,
  setDocumentReadinessAcknowledgement,
  setPrepareDocumentReview,
} from "@/lib/prepare-session";
import {
  PROTOTYPE_READINESS_LABEL,
  READINESS_CHECKLIST_SOURCE_CLASSIFICATION,
  READINESS_CHECKLIST_VERSION,
  READINESS_RESULTS_DISCLAIMER,
} from "@/lib/readiness/checklist";
import {
  acknowledgeUnderstandReview,
  confirmHouseholdSize,
  createUnderstandSession,
} from "@/lib/understand-session";
import { buildIncomeCalculation } from "@/lib/understand-state";

const PROFILE_AT = "2026-07-19T11:00:00.000Z";
const CALCULATED_AT = "2026-07-19T12:00:00.000Z";
const UNDERSTAND_REVIEWED_AT = "2026-07-19T12:05:00.000Z";
const PREPARE_CREATED_AT = "2026-07-19T12:10:00.000Z";
const PACKET_GENERATED_AT = "2026-07-19T12:30:00.000Z";

function confirmedTextField(
  field: Omit<ConfirmedProfileField, "valueCents" | "confirmationOrigin" | "confirmedAt">,
): ConfirmedProfileField {
  return {
    ...field,
    valueCents: null,
    confirmationOrigin: "extracted",
    confirmedAt: PROFILE_AT,
  };
}

function makeFullProfile({
  grossPay = "$1,620.00",
  monthlyBenefit = "$650.00",
}: {
  grossPay?: string;
  monthlyBenefit?: string;
} = {}): ProfileSession {
  const base = makeCompleteIncomeProfile({
    grossPay,
    monthlyBenefit,
    updatedAt: PROFILE_AT,
  });
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
  const residencySource = {
    sourceDocumentId: "residency-document",
    sourceDocumentName: "synthetic-residency-document.pdf",
    sourcePage: 1,
  };
  const additionalFields: ConfirmedProfileField[] = [
    confirmedTextField({
      fieldId: "address",
      reviewGroupId: "residency.address",
      label: "Address",
      value: "24 River Street, Cambridge, MA 02139",
      sources: [residencySource],
    }),
    confirmedTextField({
      fieldId: "employer",
      reviewGroupId: "employment.employer",
      label: "Employer",
      value: "Riverside Market LLC",
      sources: [paySource],
    }),
    {
      fieldId: "netPay",
      reviewGroupId: "employment.netPay.currentPeriod",
      label: "Net pay",
      value: "$1,318.40",
      valueCents: 131_840,
      confirmationOrigin: "extracted",
      sources: [paySource],
      confirmedAt: PROFILE_AT,
    },
    confirmedTextField({
      fieldId: "benefitType",
      reviewGroupId: "benefits.type",
      label: "Benefit type",
      value: "Social Security",
      sources: [benefitSource],
    }),
    confirmedTextField({
      fieldId: "documentType",
      reviewGroupId: "residency.documentType",
      label: "Document type",
      value: "Utility bill",
      sources: [residencySource],
    }),
  ];
  const confirmedFields = [...base.confirmedFields, ...additionalFields];

  return profileSessionSchema.parse({
    ...base,
    documents: [
      ...base.documents,
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
      ...base.counts,
      documentsReviewed: 3,
      fieldsConfirmed: confirmedFields.length,
    },
  });
}

function correctGrossPayTo1700(profile: ProfileSession): ProfileSession {
  const correction = applyConfirmedProfileCorrection(
    profile,
    "employment.grossPay.currentPeriod",
    "$1,700.00",
    "2026-07-19T11:30:00.000Z",
  );

  if (!correction.ok) {
    throw new Error(correction.error);
  }

  return correction.session;
}

function makeCompletedUnderstand(profile: ProfileSession) {
  const calculation = buildIncomeCalculation(profile, CALCULATED_AT);
  if (calculation.outcome !== "calculated") {
    throw new Error("Expected the packet Profile fixture to calculate.");
  }

  const pending = createUnderstandSession({
    profile,
    householdSize: confirmHouseholdSize(2, CALCULATED_AT),
    calculation: calculation.calculation,
    ruleReviewState: "pending-review",
    updatedAt: CALCULATED_AT,
  });

  return acknowledgeUnderstandReview(
    profile,
    pending,
    UNDERSTAND_REVIEWED_AT,
  );
}

function makeCompletedPrepare(
  profile: ProfileSession,
  understand: ReturnType<typeof makeCompletedUnderstand>,
) {
  let prepare = createPrepareSession(
    profile,
    understand,
    PREPARE_CREATED_AT,
  );
  prepare = setPrepareDocumentReview(
    prepare,
    "identity-document",
    true,
    "2026-07-19T12:11:00.000Z",
  );
  prepare = setPrepareDocumentReview(
    prepare,
    "income-documentation",
    true,
    "2026-07-19T12:12:00.000Z",
  );
  prepare = setPrepareDocumentReview(
    prepare,
    "residency-documentation",
    true,
    "2026-07-19T12:13:00.000Z",
  );

  return setDocumentReadinessAcknowledgement(
    prepare,
    true,
    "2026-07-19T12:14:00.000Z",
  );
}

function buildReadyPacket(profile: ProfileSession): ReadinessPacketContent {
  const understand = makeCompletedUnderstand(profile);
  const result = buildReadinessPacketContent({
    profile,
    understand,
    prepareReview: makeCompletedPrepare(profile, understand),
    generatedAt: PACKET_GENERATED_AT,
  });

  if (result.status !== "ready") {
    throw new Error(result.reasons.join(" "));
  }

  return result.packet;
}

describe("safe deterministic readiness packet content", () => {
  it("uses the renter-corrected $1,700 value and verified neutral HUD comparison", () => {
    const packet = buildReadyPacket(
      correctGrossPayTo1700(makeFullProfile()),
    );

    expect(packet.filename).toBe(
      "housingready-readiness-packet-revision-2.pdf",
    );
    expect(packet.incomeInformation.grossPay).toMatchObject({
      amountCents: 170_000,
      formattedAmount: "$1,700.00",
      confirmationStatus: "Corrected and confirmed by renter",
    });
    expect(packet.annualisedCalculation.employment).toMatchObject({
      inputAmountCents: 170_000,
      periodsPerYear: 26,
      resultCents: 4_420_000,
      formattedResult: "$44,200.00",
    });
    expect(packet.annualisedCalculation.combined).toMatchObject({
      resultCents: 5_200_000,
      formattedResult: "$52,000.00",
    });
    expect(packet.hudReferenceComparison).toMatchObject({
      relationship: "below",
      officialThresholdCents: 8_232_000,
      absoluteDifferenceCents: 3_032_000,
      neutralStatement:
        "The confirmed annualised amount is $30,320.00 below the displayed 60% MTSP reference threshold.",
      effectiveDate: "2026-05-01",
    });
  });

  it.each([
    {
      label: "below",
      profile: () => correctGrossPayTo1700(makeFullProfile()),
      relationship: "below",
    },
    {
      label: "above",
      profile: () =>
        makeFullProfile({ grossPay: "$3,100.00", monthlyBenefit: "$650.00" }),
      relationship: "above",
    },
    {
      label: "equal",
      profile: () =>
        makeFullProfile({ grossPay: "$3,000.00", monthlyBenefit: "$360.00" }),
      relationship: "equal",
    },
  ] as const)(
    "allows packet construction for a $label numerical relationship",
    ({ profile, relationship }) => {
      const packet = buildReadyPacket(profile());

      expect(packet.hudReferenceComparison.relationship).toBe(relationship);
      expect(packet.documentReadinessChecklist.items).toHaveLength(3);
      expect(packet.documentReadinessResults.acknowledgementStatus).toBe(
        "Acknowledged by renter",
      );
    },
  );

  it("records the exact versioned prototype results and renter acknowledgement", () => {
    const packet = buildReadyPacket(
      correctGrossPayTo1700(makeFullProfile()),
    );

    expect(packet.documentReadinessResults).toMatchObject({
      heading: "Document-readiness results",
      checklistVersion: READINESS_CHECKLIST_VERSION,
      sourceClassification: READINESS_CHECKLIST_SOURCE_CLASSIFICATION,
      prototypeLabel: PROTOTYPE_READINESS_LABEL,
      reviewedAt: "2026-07-19T12:14:00.000Z",
      acknowledgementStatus: "Acknowledged by renter",
      disclaimer: READINESS_RESULTS_DISCLAIMER,
      results: [
        {
          requirementId: "identity-document",
          status: "missing",
          statusLabel: "Missing",
          supportingDocuments: [],
        },
        {
          requirementId: "income-documentation",
          status: "present",
          statusLabel: "Present",
        },
        {
          requirementId: "residency-documentation",
          status: "present",
          statusLabel: "Present",
        },
      ],
    });
    expect(
      packet.documentReadinessResults.results.find(
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

  it("contains mandatory safety statements without producing a housing outcome", () => {
    const packet = buildReadyPacket(
      correctGrossPayTo1700(makeFullProfile()),
    );
    const searchableText = JSON.stringify(packet);

    expect(packet.cover.disclaimer).toBe(PACKET_COVER_DISCLAIMER);
    expect(
      packet.sourceAndDecisionBoundaries.productPolicy.finalReviewStatement,
    ).toBe(PACKET_FINAL_REVIEW_STATEMENT);
    expect(searchableText).not.toMatch(
      /\b(?:eligible|ineligible|qualifies|approved|denied|passes|fails)\b|likely approved|acceptance probability|qualification score/i,
    );
  });

  it("projects no document evidence, bytes, preview data, or generated-file URL", () => {
    const profile = correctGrossPayTo1700(makeFullProfile());
    const contaminatedProfile = {
      ...profile,
      rawPdfContents: "RAW PDF SECRET",
      generatedPdfBase64: "JVBERi0xLjQ=",
      confirmedFields: profile.confirmedFields.map((field) => ({
        ...field,
        sourceText: "RAW EXTRACTED EVIDENCE",
      })),
      documents: profile.documents.map((document) => ({
        ...document,
        objectUrl: "blob:https://example.test/raw-document",
        previewUrl: "data:application/pdf;base64,JVBERi0xLjQ=",
        fileBytes: [37, 80, 68, 70],
      })),
    } as ProfileSession;
    const packet = buildReadyPacket(contaminatedProfile);
    const serialized = JSON.stringify(packet);

    expect(packetContentContainsUnsafePersistenceData(packet)).toBe(false);
    expect(serialized).not.toContain("RAW PDF SECRET");
    expect(serialized).not.toContain("RAW EXTRACTED EVIDENCE");
    expect(serialized).not.toContain("sourceText");
    expect(serialized).not.toContain("blob:");
    expect(serialized).not.toContain("data:application/pdf");
    expect(serialized).not.toContain("base64");
    expect(serialized).not.toContain("fileBytes");
  });

  it("replaces unsafe document names and blocks unsafe confirmed display values", () => {
    const cleanProfile = correctGrossPayTo1700(makeFullProfile());
    const unsafeDocumentProfile = profileSessionSchema.parse({
      ...cleanProfile,
      documents: cleanProfile.documents.map((document) =>
        document.id === "residency-document"
          ? { ...document, name: "blob:https://example.test/residency" }
          : document,
      ),
      confirmedFields: cleanProfile.confirmedFields.map((field) => ({
        ...field,
        sources: field.sources.map((source) =>
          source.sourceDocumentId === "residency-document"
            ? {
                ...source,
                sourceDocumentName: "blob:https://example.test/residency",
              }
            : source,
        ),
      })),
    });
    const safePacket = buildReadyPacket(unsafeDocumentProfile);

    expect(
      safePacket.sourceDocumentMetadata.find(
        (document) => document.category === "Utility bill",
      )?.fileName,
    ).toBe("Document name unavailable");
    expect(JSON.stringify(safePacket)).not.toContain("blob:");

    const unsafeValueProfile = profileSessionSchema.parse({
      ...cleanProfile,
      confirmedFields: cleanProfile.confirmedFields.map((field) =>
        field.fieldId === "fullName"
          ? { ...field, value: "<script>change behavior</script>" }
          : field,
      ),
    });
    const understand = makeCompletedUnderstand(unsafeValueProfile);
    const result = buildReadinessPacketContent({
      profile: unsafeValueProfile,
      understand,
      prepareReview: makeCompletedPrepare(unsafeValueProfile, understand),
      generatedAt: PACKET_GENERATED_AT,
    });

    expect(result).toEqual({
      status: "blocked",
      reasons: [
        "Confirmed packet content could not be safely prepared. Review the confirmed Profile values and document metadata.",
      ],
    });
  });

  it("separates confirmed metadata, prototype results, arithmetic, official HUD data, and product policy in the PDF", async () => {
    const packet = buildReadyPacket(
      correctGrossPayTo1700(makeFullProfile()),
    );
    const sections = buildReadinessPacketPdfSections(packet);

    expect(sections.map((section) => section.heading)).toEqual([
      "Cover",
      "Confirmed renter information",
      "Confirmed income-related information",
      "Confirmed source-document metadata",
      "Document-readiness results",
      "Renter review acknowledgements",
      "Verified official HUD reference data",
      "Deterministic HousingReady arithmetic",
      "HousingReady product policy and decision boundary",
    ]);
    const searchableSections = JSON.stringify(sections);
    expect(searchableSections).toContain("$1,700.00");
    expect(searchableSections).toContain(PACKET_COVER_DISCLAIMER);
    expect(searchableSections).toContain(
      `Checklist version: ${READINESS_CHECKLIST_VERSION}`,
    );
    expect(searchableSections).toContain("Identity: Missing");
    expect(searchableSections).toContain("Income: Present");
    expect(searchableSections).toContain("Residency: Present");
    expect(searchableSections).toContain(
      "Acknowledgement status: Acknowledged by renter",
    );
    expect(searchableSections).toContain(READINESS_RESULTS_DISCLAIMER);

    const rendered = await generateReadinessPacketPdf(packet);

    expect(rendered.filename).toBe(packet.filename);
    expect(rendered.pageCount).toBeGreaterThan(1);
    expect(rendered.blob).toBeInstanceOf(Blob);
    expect(rendered.blob.size).toBeGreaterThan(1_000);
  });
});
