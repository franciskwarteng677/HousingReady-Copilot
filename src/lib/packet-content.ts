import {
  frozen2026MtspCorpus,
  getVerifiedThresholdComparisonData,
} from "@/data/rules";
import { formatCurrencyFromCents } from "@/lib/income-calculation";
import { confirmationOriginLabel } from "@/lib/profile-corrections";
import { isCompletedProfileSession } from "@/lib/profile-fingerprint";
import type {
  ApprovedFieldId,
  ConfirmedProfileField,
  ProfileSession,
} from "@/lib/profile-schema";
import {
  PREPARE_DOCUMENT_CATEGORY_IDS,
  type PrepareSession,
} from "@/lib/prepare-schema";
import { getPrepareReviewProgress } from "@/lib/prepare-session";
import type { RuleCorpus } from "@/lib/rules-schema";
import type { UnderstandSession } from "@/lib/understand-schema";
import {
  compareVerifiedThreshold,
  getUnderstandProgress,
} from "@/lib/understand-state";

export const PACKET_COVER_DISCLAIMER =
  "Application-preparation information only — not an eligibility determination.";

export const PACKET_CHECKLIST_DISCLAIMER =
  "Reviewed records the renter’s review action only. It does not certify document validity, completeness, acceptance, or compliance with a property’s rules.";

export const PACKET_FINAL_REVIEW_STATEMENT =
  "A qualified housing professional must apply all property-specific and program-specific rules and make any final housing decision.";

export const PACKET_ARITHMETIC_EXPLANATION =
  "This is deterministic HousingReady Copilot product arithmetic using renter-confirmed inputs. It is not an official countable-income determination.";

export const PACKET_THRESHOLD_CONTEXT =
  "The 60% MTSP value is a reference threshold selected for this frozen prototype scenario. Different properties, set-asides, project histories, programs, or rules may require different limits.";

export type PacketFieldSource = Readonly<{
  documentName: string;
  page: number;
}>;

export type PacketConfirmedTextField = Readonly<{
  label: string;
  value: string;
  confirmationStatus: string;
  sources: readonly PacketFieldSource[];
}>;

export type PacketConfirmedMoneyField = Readonly<{
  label: string;
  amountCents: number;
  formattedAmount: string;
  confirmationStatus: string;
  sources: readonly PacketFieldSource[];
}>;

export type PacketDocumentMetadata = Readonly<{
  fileName: string;
  category: string;
  profileReviewStatus: "Profile review recorded" | "Profile no-call recorded";
  sourcePages: readonly number[];
}>;

export type ThresholdRelationship = "below" | "above" | "equal";

export type ReadinessPacketContent = Readonly<{
  schemaVersion: 1;
  filename: string;
  cover: Readonly<{
    productName: "HousingReady Copilot";
    packetTitle: "Application Readiness Packet";
    generatedAt: string;
    generatedAtDisplay: string;
    profileRevision: number;
    disclaimer: typeof PACKET_COVER_DISCLAIMER;
  }>;
  renterInformation: Readonly<{
    fullName: PacketConfirmedTextField | null;
    address: PacketConfirmedTextField | null;
    householdSize: number;
    householdSizeStatus: "Confirmed by renter; not document-extracted";
  }>;
  incomeInformation: Readonly<{
    employer: PacketConfirmedTextField | null;
    grossPay: PacketConfirmedMoneyField | null;
    payFrequency: PacketConfirmedTextField | null;
    netPay: PacketConfirmedMoneyField | null;
    netPayNote: "Displayed information only; not used in the current gross-pay calculation.";
    benefitType: PacketConfirmedTextField | null;
    monthlyBenefit: PacketConfirmedMoneyField | null;
  }>;
  annualisedCalculation: Readonly<{
    calculatedAt: string;
    calculatedAtDisplay: string;
    employment: Readonly<{
      inputAmountCents: number;
      formattedInputAmount: string;
      periodsPerYear: number;
      formula: string;
      substitution: string;
      resultCents: number;
      formattedResult: string;
      sources: readonly PacketFieldSource[];
    }>;
    benefits: Readonly<{
      inputAmountCents: number;
      formattedInputAmount: string;
      periodsPerYear: number;
      formula: string;
      substitution: string;
      resultCents: number;
      formattedResult: string;
      sources: readonly PacketFieldSource[];
    }>;
    combined: Readonly<{
      formula: string;
      substitution: string;
      resultCents: number;
      formattedResult: string;
    }>;
    explanation: typeof PACKET_ARITHMETIC_EXPLANATION;
  }>;
  hudReferenceComparison: Readonly<{
    ruleYear: number;
    effectiveDate: string;
    effectiveDateDisplay: string;
    geography: string;
    householdSize: number;
    thresholdType: "60% MTSP";
    officialThresholdCents: number;
    formattedOfficialThreshold: string;
    confirmedAnnualisedAmountCents: number;
    formattedConfirmedAnnualisedAmount: string;
    absoluteDifferenceCents: number;
    formattedAbsoluteDifference: string;
    relationship: ThresholdRelationship;
    differenceCalculation: string;
    neutralStatement: string;
    context: typeof PACKET_THRESHOLD_CONTEXT;
  }>;
  documentReadinessChecklist: Readonly<{
    reviewedAt: string;
    reviewedAtDisplay: string;
    items: readonly Readonly<{
      id:
        | (typeof PREPARE_DOCUMENT_CATEGORY_IDS)[number]
        | "missing-or-expired-items";
      label: string;
      status: "Reviewed by renter";
    }>[];
    disclaimer: typeof PACKET_CHECKLIST_DISCLAIMER;
  }>;
  sourceDocumentMetadata: readonly PacketDocumentMetadata[];
  sourceAndDecisionBoundaries: Readonly<{
    officialHudData: Readonly<{
      classification: "Official HUD source data";
      verificationLabel: "Verified official HUD source";
      publisher: string;
      datasetTitle: string;
      ruleYear: number;
      effectiveDate: string;
      geography: string;
      citationIdentifier: string;
      pdfPage: number;
      pdfPageCount: number;
      datasetPageUrl: string;
      pdfUrl: string;
      sourceVersion: string;
    }>;
    productArithmetic: Readonly<{
      classification: "Deterministic HousingReady arithmetic";
      calculationVersion: string;
      explanation: typeof PACKET_ARITHMETIC_EXPLANATION;
    }>;
    productPolicy: Readonly<{
      classification: "HousingReady Copilot product-policy language";
      coverDisclaimer: typeof PACKET_COVER_DISCLAIMER;
      finalReviewStatement: typeof PACKET_FINAL_REVIEW_STATEMENT;
    }>;
  }>;
}>;

export type PacketContentBuildResult =
  | Readonly<{
      status: "blocked";
      reasons: readonly string[];
    }>
  | Readonly<{
      status: "ready";
      packet: ReadinessPacketContent;
    }>;

export type BuildReadinessPacketContentInput = Readonly<{
  profile: ProfileSession;
  understand: UnderstandSession;
  prepareReview: PrepareSession | null;
  generatedAt: string;
  corpus?: RuleCorpus;
}>;

const documentCategoryLabels = {
  "pay-stub": "Synthetic pay stub",
  "benefits-letter": "Synthetic benefits letter",
  "residency-document": "Synthetic residency document",
} as const;

const unsafeDisplayTextPattern =
  /(?:<\s*\/?\s*(?:script|style|iframe|object|embed|svg|img)\b)|(?:\b(?:blob|data|javascript):)|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/i;

function isCanonicalIsoTimestamp(value: string): boolean {
  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
}

function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0)));
}

function assertSafeDisplayText(
  value: string,
  label: string,
  maximumLength = 240,
): string {
  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.length > maximumLength ||
    unsafeDisplayTextPattern.test(trimmed)
  ) {
    throw new TypeError(`${label} contains unsafe or unsupported display text.`);
  }

  return trimmed;
}

function safeDocumentName(value: string): string {
  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.length > 180 ||
    unsafeDisplayTextPattern.test(trimmed)
  ) {
    return "Document name unavailable";
  }

  return trimmed;
}

function packetFilename(profileRevision: number): string {
  if (!Number.isSafeInteger(profileRevision) || profileRevision < 1) {
    throw new RangeError("Profile revision must be a positive safe integer.");
  }

  return `housingready-readiness-packet-revision-${profileRevision}.pdf`;
}

function uniqueSources(field: ConfirmedProfileField): PacketFieldSource[] {
  const unique = new Map<string, PacketFieldSource>();

  for (const source of field.sources) {
    const documentName = safeDocumentName(source.sourceDocumentName);
    const key = `${documentName}:${source.sourcePage}`;
    unique.set(key, {
      documentName,
      page: source.sourcePage,
    });
  }

  return Array.from(unique.values()).sort((first, second) =>
    `${first.documentName}:${first.page}`.localeCompare(
      `${second.documentName}:${second.page}`,
    ),
  );
}

function getSingleConfirmedField(
  profile: ProfileSession,
  fieldId: ApprovedFieldId,
): ConfirmedProfileField | null {
  const candidates = profile.confirmedFields.filter(
    (field) => field.fieldId === fieldId,
  );

  if (candidates.length === 0) {
    return null;
  }

  const [first] = candidates;
  if (!first) {
    return null;
  }

  const allValuesMatch = candidates.every(
    (candidate) =>
      candidate.value === first.value && candidate.valueCents === first.valueCents,
  );

  if (!allValuesMatch) {
    throw new Error(
      `The completed Profile contains multiple confirmed values for ${fieldId}.`,
    );
  }

  return first;
}

function buildTextField(
  field: ConfirmedProfileField | null,
): PacketConfirmedTextField | null {
  if (!field) {
    return null;
  }

  return {
    label: assertSafeDisplayText(field.label, "Confirmed field label", 100),
    value: assertSafeDisplayText(field.value, field.label),
    confirmationStatus: confirmationOriginLabel(field.confirmationOrigin),
    sources: uniqueSources(field),
  };
}

function buildMoneyField(
  field: ConfirmedProfileField | null,
): PacketConfirmedMoneyField | null {
  if (!field) {
    return null;
  }

  if (field.valueCents === null) {
    throw new Error(`${field.label} does not contain validated integer cents.`);
  }

  return {
    label: assertSafeDisplayText(
      field.label,
      "Confirmed currency field label",
      100,
    ),
    amountCents: field.valueCents,
    formattedAmount: formatCurrencyFromCents(field.valueCents),
    confirmationStatus: confirmationOriginLabel(field.confirmationOrigin),
    sources: uniqueSources(field),
  };
}

function buildSourceDocumentMetadata(
  profile: ProfileSession,
): PacketDocumentMetadata[] {
  const confirmedSourceDocumentIds = new Set(
    profile.confirmedFields.flatMap((field) =>
      field.sources.map((source) => source.sourceDocumentId),
    ),
  );

  return profile.documents
    .filter((document) => confirmedSourceDocumentIds.has(document.id))
    .map((document) => {
    const pages = new Set<number>();
    const confirmedDocumentTypes = new Set<string>();
    for (const field of profile.confirmedFields) {
      for (const source of field.sources) {
        if (source.sourceDocumentId === document.id) {
          pages.add(source.sourcePage);
          if (field.fieldId === "documentType") {
            confirmedDocumentTypes.add(
              assertSafeDisplayText(field.value, "Confirmed document type"),
            );
          }
        }
      }
    }

    const confirmedDocumentType =
      confirmedDocumentTypes.size === 1
        ? Array.from(confirmedDocumentTypes)[0]
        : null;

    return {
      fileName: safeDocumentName(document.name),
      category:
        confirmedDocumentType ??
        (document.sampleKind === null
          ? "Supporting document"
          : documentCategoryLabels[document.sampleKind]),
      profileReviewStatus:
        document.reviewState === "reviewed"
          ? "Profile review recorded"
          : "Profile no-call recorded",
      sourcePages: Array.from(pages).sort((first, second) => first - second),
    };
    });
}

function prepareReviewReasons(
  profile: ProfileSession,
  understand: UnderstandSession,
  prepareReview: PrepareSession | null,
  corpus: RuleCorpus,
): string[] {
  if (!prepareReview) {
    return ["Prepare review has not been started."];
  }

  const reasons: string[] = [];
  const progress = getPrepareReviewProgress(
    profile,
    understand,
    prepareReview,
    corpus,
  );

  if (!progress.sessionCurrent) {
    reasons.push(
      "Prepare review does not match the current Profile revision and Understand review.",
    );
  }

  const categoryReasonLabels = {
    "identity-document": "Identity document review is incomplete.",
    "income-documentation": "Income documentation review is incomplete.",
    "residency-documentation": "Residency documentation review is incomplete.",
  } as const;

  for (const categoryId of PREPARE_DOCUMENT_CATEGORY_IDS) {
    if (progress.pendingReviewIds.includes(categoryId)) {
      reasons.push(categoryReasonLabels[categoryId]);
    }
  }

  if (progress.pendingReviewIds.includes("missing-or-expired")) {
    reasons.push("Missing or expired items review is incomplete.");
  }

  return reasons;
}

function profileField(
  profile: ProfileSession,
  fieldId: ApprovedFieldId,
): ConfirmedProfileField | null {
  return getSingleConfirmedField(profile, fieldId);
}

/**
 * Constructs an allowlisted, deterministic packet projection. The return value
 * deliberately has no slots for uploaded bytes, evidence passages, browser
 * preview state, or generated-file URLs.
 */
export function buildReadinessPacketContent({
  profile,
  understand,
  prepareReview,
  generatedAt,
  corpus = frozen2026MtspCorpus,
}: BuildReadinessPacketContentInput): PacketContentBuildResult {
  const reasons: string[] = [];
  const understandProgress = getUnderstandProgress(profile, understand, corpus);

  if (!isCompletedProfileSession(profile)) {
    reasons.push("Profile must be complete before packet generation.");
  }

  if (profile.counts.unresolvedConflicts !== 0) {
    reasons.push("Profile must have zero unresolved conflicts.");
  }

  if (!understandProgress.understandComplete) {
    reasons.push(
      "The current verified Understand comparison must be acknowledged before packet generation.",
    );
  }

  if (!understand.householdSize) {
    reasons.push("Household size must be explicitly confirmed.");
  }

  if (!isCanonicalIsoTimestamp(generatedAt)) {
    reasons.push("A valid packet generation timestamp is required.");
  }

  reasons.push(
    ...prepareReviewReasons(profile, understand, prepareReview, corpus),
  );

  if (reasons.length > 0) {
    return { status: "blocked", reasons };
  }

  if (
    !prepareReview ||
    !understand.householdSize ||
    !understand.calculation ||
    !understand.reviewAcknowledgement
  ) {
    return {
      status: "blocked",
      reasons: ["Current reviewed workflow data is unavailable."],
    };
  }

  const verifiedSource = getVerifiedThresholdComparisonData(
    corpus,
    understand.householdSize.value,
  );
  const comparison = compareVerifiedThreshold(
    corpus,
    understand.householdSize.value,
    understand.calculation.combined.resultCents,
  );

  if (!verifiedSource || comparison.outcome !== "available") {
    return {
      status: "blocked",
      reasons: ["Verified HUD reference-threshold data is unavailable."],
    };
  }

  try {
    const fullName = buildTextField(profileField(profile, "fullName"));
    const address = buildTextField(profileField(profile, "address"));
    const employer = buildTextField(profileField(profile, "employer"));
    const grossPay = buildMoneyField(profileField(profile, "grossPay"));
    const netPay = buildMoneyField(profileField(profile, "netPay"));
    const payFrequency = buildTextField(
      profileField(profile, "payFrequency"),
    );
    const benefitType = buildTextField(profileField(profile, "benefitType"));
    const monthlyBenefit = buildMoneyField(
      profileField(profile, "monthlyBenefit"),
    );
    const officialSource = verifiedSource.officialSource;
    const calculation = understand.calculation;

    return {
      status: "ready",
      packet: {
      schemaVersion: 1,
      filename: packetFilename(profile.revision),
      cover: {
        productName: "HousingReady Copilot",
        packetTitle: "Application Readiness Packet",
        generatedAt,
        generatedAtDisplay: formatTimestamp(generatedAt),
        profileRevision: profile.revision,
        disclaimer: PACKET_COVER_DISCLAIMER,
      },
      renterInformation: {
        fullName,
        address,
        householdSize: understand.householdSize.value,
        householdSizeStatus: "Confirmed by renter; not document-extracted",
      },
      incomeInformation: {
        employer,
        grossPay,
        payFrequency,
        netPay,
        netPayNote:
          "Displayed information only; not used in the current gross-pay calculation.",
        benefitType,
        monthlyBenefit,
      },
      annualisedCalculation: {
        calculatedAt: calculation.calculatedAt,
        calculatedAtDisplay: formatTimestamp(calculation.calculatedAt),
        employment: {
          inputAmountCents: calculation.employment.inputAmountCents,
          formattedInputAmount: formatCurrencyFromCents(
            calculation.employment.inputAmountCents,
          ),
          periodsPerYear: calculation.employment.periodsPerYear,
          formula: calculation.employment.formula,
          substitution: calculation.employment.substitution,
          resultCents: calculation.employment.resultCents,
          formattedResult: formatCurrencyFromCents(
            calculation.employment.resultCents,
          ),
          sources: calculation.evidence.grossPay.sources.map((source) => ({
            documentName: safeDocumentName(source.sourceDocumentName),
            page: source.sourcePage,
          })),
        },
        benefits: {
          inputAmountCents: calculation.benefits.inputAmountCents,
          formattedInputAmount: formatCurrencyFromCents(
            calculation.benefits.inputAmountCents,
          ),
          periodsPerYear: calculation.benefits.periodsPerYear,
          formula: calculation.benefits.formula,
          substitution: calculation.benefits.substitution,
          resultCents: calculation.benefits.resultCents,
          formattedResult: formatCurrencyFromCents(
            calculation.benefits.resultCents,
          ),
          sources: calculation.evidence.monthlyBenefit.sources.map(
            (source) => ({
              documentName: safeDocumentName(source.sourceDocumentName),
              page: source.sourcePage,
            }),
          ),
        },
        combined: {
          formula: calculation.combined.formula,
          substitution: calculation.combined.substitution,
          resultCents: calculation.combined.resultCents,
          formattedResult: formatCurrencyFromCents(
            calculation.combined.resultCents,
          ),
        },
        explanation: PACKET_ARITHMETIC_EXPLANATION,
      },
      hudReferenceComparison: {
        ruleYear: corpus.ruleYear,
        effectiveDate: verifiedSource.effectiveDate,
        effectiveDateDisplay: formatIsoDate(verifiedSource.effectiveDate),
        geography: corpus.geography.hudArea,
        householdSize: understand.householdSize.value,
        thresholdType: comparison.thresholdType,
        officialThresholdCents: comparison.publishedThresholdCents,
        formattedOfficialThreshold: formatCurrencyFromCents(
          comparison.publishedThresholdCents,
        ),
        confirmedAnnualisedAmountCents: comparison.combinedAnnualizedCents,
        formattedConfirmedAnnualisedAmount: formatCurrencyFromCents(
          comparison.combinedAnnualizedCents,
        ),
        absoluteDifferenceCents: comparison.differenceCents,
        formattedAbsoluteDifference: formatCurrencyFromCents(
          comparison.differenceCents,
        ),
        relationship: comparison.relation,
        differenceCalculation: comparison.differenceCalculation,
        neutralStatement: comparison.neutralStatement,
        context: PACKET_THRESHOLD_CONTEXT,
      },
      documentReadinessChecklist: {
        reviewedAt: prepareReview.updatedAt,
        reviewedAtDisplay: formatTimestamp(prepareReview.updatedAt),
        items: [
          {
            id: "identity-document",
            label: "Identity document",
            status: "Reviewed by renter",
          },
          {
            id: "income-documentation",
            label: "Income documentation",
            status: "Reviewed by renter",
          },
          {
            id: "residency-documentation",
            label: "Residency documentation",
            status: "Reviewed by renter",
          },
          {
            id: "missing-or-expired-items",
            label: "Missing or expired items",
            status: "Reviewed by renter",
          },
        ],
        disclaimer: PACKET_CHECKLIST_DISCLAIMER,
      },
      sourceDocumentMetadata: buildSourceDocumentMetadata(profile),
      sourceAndDecisionBoundaries: {
        officialHudData: {
          classification: "Official HUD source data",
          verificationLabel: "Verified official HUD source",
          publisher: officialSource.publisher,
          datasetTitle: officialSource.datasetTitle,
          ruleYear: officialSource.ruleYear,
          effectiveDate: officialSource.effectiveDate,
          geography: officialSource.hmfaName,
          citationIdentifier: verifiedSource.citation.sectionOrRowId,
          pdfPage: officialSource.pdfPage,
          pdfPageCount: officialSource.pdfPageCount,
          datasetPageUrl: officialSource.datasetPageUrl,
          pdfUrl: officialSource.pdfUrl,
          sourceVersion: officialSource.sourceVersion,
        },
        productArithmetic: {
          classification: "Deterministic HousingReady arithmetic",
          calculationVersion: calculation.calculationVersion,
          explanation: PACKET_ARITHMETIC_EXPLANATION,
        },
        productPolicy: {
          classification: "HousingReady Copilot product-policy language",
          coverDisclaimer: PACKET_COVER_DISCLAIMER,
          finalReviewStatement: PACKET_FINAL_REVIEW_STATEMENT,
        },
      },
      },
    };
  } catch {
    return {
      status: "blocked",
      reasons: [
        "Confirmed packet content could not be safely prepared. Review the confirmed Profile values and document metadata.",
      ],
    };
  }
}

export function packetContentContainsUnsafePersistenceData(
  packet: ReadinessPacketContent,
): boolean {
  const serialized = JSON.stringify(packet);

  return /(?:"sourceText"|"raw(?:Pdf|Image|Document|File|Bytes|Content)"|"(?:object|blob|preview)Url"|blob:|data:application\/pdf|;base64,)/i.test(
    serialized,
  );
}
