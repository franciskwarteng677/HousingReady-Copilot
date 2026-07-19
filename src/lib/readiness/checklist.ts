import type {
  ProfileSession,
  SampleDocumentKind,
  StoredDocumentMetadata,
} from "@/lib/profile-schema";

export const READINESS_CHECKLIST_VERSION =
  "housingready-prototype-readiness-v1" as const;

export const READINESS_CHECKLIST_SOURCE_CLASSIFICATION =
  "HousingReady Copilot prototype readiness checklist" as const;

export const PROTOTYPE_READINESS_LABEL =
  "Prototype readiness check — not an official property requirement" as const;

export const READINESS_CHECKLIST_DISCLAIMER =
  "This is a HousingReady Copilot prototype readiness checklist, not an official HUD, property, landlord, or housing-provider rule." as const;

export const READINESS_RESULTS_DISCLAIMER =
  "These statuses do not certify document validity, completeness, acceptance, compliance, or eligibility." as const;

export const READINESS_REQUIREMENT_IDS = [
  "identity-document",
  "income-documentation",
  "residency-documentation",
] as const;

export type ReadinessRequirementId =
  (typeof READINESS_REQUIREMENT_IDS)[number];

export type ReadinessCategory = "identity" | "income" | "residency";

export type DocumentReadinessStatus =
  | "present"
  | "missing"
  | "needs_review";

export type ReadinessMatchBasis =
  | "confirmed-document-type"
  | "sample-kind"
  | "exact-synthetic-filename-fallback";

export type ReadinessChecklistRequirement = Readonly<{
  id: ReadinessRequirementId;
  title: string;
  category: ReadinessCategory;
  description: string;
  allowlistedDocumentTypes: readonly string[];
  allowlistedSampleKinds: readonly SampleDocumentKind[];
  exactSyntheticFilenameFallbacks: readonly string[];
  checklistVersion: typeof READINESS_CHECKLIST_VERSION;
  sourceClassification: typeof READINESS_CHECKLIST_SOURCE_CLASSIFICATION;
  officialRuleDisclaimer: typeof READINESS_CHECKLIST_DISCLAIMER;
}>;

export type ReadinessSupportingDocument = Readonly<{
  documentId: string;
  documentName: string;
  normalizedDocumentType: string | null;
  sampleKind: SampleDocumentKind | null;
  reviewState: StoredDocumentMetadata["reviewState"];
  sourcePages: readonly number[];
  matchBasis: ReadinessMatchBasis;
}>;

export type DocumentReadinessResult = Readonly<{
  requirementId: ReadinessRequirementId;
  title: string;
  category: ReadinessCategory;
  status: DocumentReadinessStatus;
  explanation: string;
  supportingDocuments: readonly ReadinessSupportingDocument[];
  checklistVersion: typeof READINESS_CHECKLIST_VERSION;
  sourceClassification: typeof READINESS_CHECKLIST_SOURCE_CLASSIFICATION;
  prototypeLabel: typeof PROTOTYPE_READINESS_LABEL;
  disclaimer: typeof READINESS_RESULTS_DISCLAIMER;
}>;

export type DocumentReadinessEvaluation = Readonly<{
  checklistVersion: typeof READINESS_CHECKLIST_VERSION;
  sourceClassification: typeof READINESS_CHECKLIST_SOURCE_CLASSIFICATION;
  prototypeLabel: typeof PROTOTYPE_READINESS_LABEL;
  disclaimer: typeof READINESS_RESULTS_DISCLAIMER;
  results: readonly DocumentReadinessResult[];
}>;

type ReadinessProfileMetadata = Pick<
  ProfileSession,
  "documents" | "confirmedFields"
>;

type ConfirmedDocumentType = Readonly<{
  normalizedValue: string;
  sourcePages: readonly number[];
}>;

type ClassifiedDocument = Readonly<{
  support: ReadinessSupportingDocument;
  isConfirmedPresent: boolean;
}>;

function freezeStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

function freezeSampleKinds(
  values: readonly SampleDocumentKind[],
): readonly SampleDocumentKind[] {
  return Object.freeze([...values]);
}

function defineRequirement(
  requirement: Omit<
    ReadinessChecklistRequirement,
    "checklistVersion" | "sourceClassification" | "officialRuleDisclaimer"
  >,
): ReadinessChecklistRequirement {
  return Object.freeze({
    ...requirement,
    allowlistedDocumentTypes: freezeStrings(
      requirement.allowlistedDocumentTypes,
    ),
    allowlistedSampleKinds: freezeSampleKinds(
      requirement.allowlistedSampleKinds,
    ),
    exactSyntheticFilenameFallbacks: freezeStrings(
      requirement.exactSyntheticFilenameFallbacks,
    ),
    checklistVersion: READINESS_CHECKLIST_VERSION,
    sourceClassification: READINESS_CHECKLIST_SOURCE_CLASSIFICATION,
    officialRuleDisclaimer: READINESS_CHECKLIST_DISCLAIMER,
  });
}

export const READINESS_CHECKLIST: readonly ReadinessChecklistRequirement[] =
  Object.freeze([
    defineRequirement({
      id: "identity-document",
      title: "Identity document",
      category: "identity",
      description:
        "Looks only for confirmed metadata matching an explicitly allowlisted identity-document type.",
      allowlistedDocumentTypes: [
        "driver's license",
        "government-issued photo id",
        "passport",
        "state identification card",
      ],
      allowlistedSampleKinds: [],
      exactSyntheticFilenameFallbacks: [],
    }),
    defineRequirement({
      id: "income-documentation",
      title: "Income documentation",
      category: "income",
      description:
        "Looks only for confirmed metadata matching an allowlisted income-document type or one of the provided synthetic income samples.",
      allowlistedDocumentTypes: [
        "benefits letter",
        "pay stub",
        "social security benefits letter",
      ],
      allowlistedSampleKinds: ["pay-stub", "benefits-letter"],
      exactSyntheticFilenameFallbacks: [
        "synthetic-pay-stub.pdf",
        "synthetic-benefits-letter.pdf",
      ],
    }),
    defineRequirement({
      id: "residency-documentation",
      title: "Residency documentation",
      category: "residency",
      description:
        "Looks only for confirmed metadata matching an allowlisted residency-document type or the provided synthetic residency sample.",
      allowlistedDocumentTypes: ["residency document", "utility bill"],
      allowlistedSampleKinds: ["residency-document"],
      exactSyntheticFilenameFallbacks: [
        "synthetic-residency-document.pdf",
      ],
    }),
  ]);

function normalizeDocumentType(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(
    /\s+/g,
    " ",
  );
}

function compareStrings(first: string, second: string): number {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

function getSourcePagesByDocument(
  profile: ReadinessProfileMetadata,
): ReadonlyMap<string, readonly number[]> {
  const pageSets = new Map<string, Set<number>>();

  for (const field of profile.confirmedFields) {
    for (const source of field.sources) {
      const pages = pageSets.get(source.sourceDocumentId) ?? new Set<number>();
      pages.add(source.sourcePage);
      pageSets.set(source.sourceDocumentId, pages);
    }
  }

  return new Map(
    Array.from(pageSets, ([documentId, pages]) => [
      documentId,
      Object.freeze(Array.from(pages).sort((first, second) => first - second)),
    ]),
  );
}

function getConfirmedDocumentTypes(
  profile: ReadinessProfileMetadata,
): ReadonlyMap<string, readonly ConfirmedDocumentType[]> {
  const types = new Map<
    string,
    Map<string, Set<number>>
  >();

  for (const field of profile.confirmedFields) {
    if (field.fieldId !== "documentType") {
      continue;
    }

    const normalizedValue = normalizeDocumentType(field.value);
    if (!normalizedValue) {
      continue;
    }

    for (const source of field.sources) {
      const documentTypes =
        types.get(source.sourceDocumentId) ?? new Map<string, Set<number>>();
      const pages = documentTypes.get(normalizedValue) ?? new Set<number>();
      pages.add(source.sourcePage);
      documentTypes.set(normalizedValue, pages);
      types.set(source.sourceDocumentId, documentTypes);
    }
  }

  return new Map(
    Array.from(types, ([documentId, documentTypes]) => [
      documentId,
      Object.freeze(
        Array.from(documentTypes, ([normalizedValue, pages]) =>
          Object.freeze({
            normalizedValue,
            sourcePages: Object.freeze(
              Array.from(pages).sort((first, second) => first - second),
            ),
          }),
        ).sort((first, second) =>
          compareStrings(first.normalizedValue, second.normalizedValue),
        ),
      ),
    ]),
  );
}

function classifyDocument(
  document: StoredDocumentMetadata,
  requirement: ReadinessChecklistRequirement,
  confirmedTypes: readonly ConfirmedDocumentType[],
  retainedSourcePages: readonly number[],
): ClassifiedDocument | null {
  const allowedTypes = new Set(requirement.allowlistedDocumentTypes);
  const confirmedTypeMatch = confirmedTypes.find((documentType) =>
    allowedTypes.has(documentType.normalizedValue),
  );

  // A confirmed normalized document type is the authoritative local
  // classification. Sample-kind and filename fallbacks are considered only
  // when no confirmed document type is retained for this document.
  let matchBasis: ReadinessMatchBasis | null = null;
  let normalizedDocumentType: string | null = null;
  let sourcePages = retainedSourcePages;

  if (confirmedTypes.length > 0) {
    if (!confirmedTypeMatch) {
      return null;
    }

    matchBasis = "confirmed-document-type";
    normalizedDocumentType = confirmedTypeMatch.normalizedValue;
    sourcePages = confirmedTypeMatch.sourcePages;
  } else if (
    document.sampleKind !== null &&
    requirement.allowlistedSampleKinds.includes(document.sampleKind)
  ) {
    matchBasis = "sample-kind";
  } else if (
    requirement.exactSyntheticFilenameFallbacks.includes(
      document.name.toLocaleLowerCase("en-US"),
    )
  ) {
    matchBasis = "exact-synthetic-filename-fallback";
  }

  if (!matchBasis) {
    return null;
  }

  return Object.freeze({
    support: Object.freeze({
      documentId: document.id,
      documentName: document.name,
      normalizedDocumentType,
      sampleKind: document.sampleKind,
      reviewState: document.reviewState,
      sourcePages: Object.freeze([...sourcePages]),
      matchBasis,
    }),
    isConfirmedPresent: document.reviewState === "reviewed",
  });
}

function buildResult(
  profile: ReadinessProfileMetadata,
  requirement: ReadinessChecklistRequirement,
  confirmedTypesByDocument: ReadonlyMap<
    string,
    readonly ConfirmedDocumentType[]
  >,
  sourcePagesByDocument: ReadonlyMap<string, readonly number[]>,
): DocumentReadinessResult {
  const classifiedDocuments = profile.documents
    .map((document) =>
      classifyDocument(
        document,
        requirement,
        confirmedTypesByDocument.get(document.id) ?? [],
        sourcePagesByDocument.get(document.id) ?? [],
      ),
    )
    .filter((document): document is ClassifiedDocument => document !== null)
    .sort((first, second) => {
      const nameComparison = compareStrings(
        first.support.documentName,
        second.support.documentName,
      );

      return nameComparison === 0
        ? compareStrings(
            first.support.documentId,
            second.support.documentId,
          )
        : nameComparison;
    });
  const confirmedMatches = classifiedDocuments.filter(
    (document) => document.isConfirmedPresent,
  );
  const supportingDocuments = Object.freeze(
    (confirmedMatches.length > 0
      ? confirmedMatches
      : classifiedDocuments
    ).map((document) => document.support),
  );

  let status: DocumentReadinessStatus;
  let explanation: string;

  if (confirmedMatches.length > 0) {
    status = "present";
    explanation =
      "Matching confirmed document metadata is present for this prototype checklist category.";
  } else if (classifiedDocuments.length > 0) {
    status = "needs_review";
    explanation =
      "Potential matching synthetic-sample metadata exists, but its Profile review state is no-call and cannot establish category presence.";
  } else {
    status = "missing";
    explanation =
      "No matching confirmed document metadata was found for this prototype checklist category.";
  }

  return Object.freeze({
    requirementId: requirement.id,
    title: requirement.title,
    category: requirement.category,
    status,
    explanation,
    supportingDocuments,
    checklistVersion: READINESS_CHECKLIST_VERSION,
    sourceClassification: READINESS_CHECKLIST_SOURCE_CLASSIFICATION,
    prototypeLabel: PROTOTYPE_READINESS_LABEL,
    disclaimer: READINESS_RESULTS_DISCLAIMER,
  });
}

/**
 * Deterministically evaluates only retained Profile document metadata and
 * confirmed document-type fields. It accepts no threshold, income,
 * protected-characteristic, or household-composition input.
 */
export function evaluateDocumentReadiness(
  profile: ReadinessProfileMetadata,
): DocumentReadinessEvaluation {
  const confirmedTypesByDocument = getConfirmedDocumentTypes(profile);
  const sourcePagesByDocument = getSourcePagesByDocument(profile);
  const results = Object.freeze(
    READINESS_CHECKLIST.map((requirement) =>
      buildResult(
        profile,
        requirement,
        confirmedTypesByDocument,
        sourcePagesByDocument,
      ),
    ),
  );

  return Object.freeze({
    checklistVersion: READINESS_CHECKLIST_VERSION,
    sourceClassification: READINESS_CHECKLIST_SOURCE_CLASSIFICATION,
    prototypeLabel: PROTOTYPE_READINESS_LABEL,
    disclaimer: READINESS_RESULTS_DISCLAIMER,
    results,
  });
}
