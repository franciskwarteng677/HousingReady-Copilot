import {
  deepFreeze,
  verifiedHudFy2026MtspSource,
} from "@/data/rules/hud-fy2026-mtsp-cambridge";
import {
  isVerifiedDataStatus,
  ruleCorpusSchema,
  type CitationPassage,
  type HouseholdSize,
  type HouseholdSizeThreshold,
  type RuleCorpus,
  type VerifiedOfficialHudSource,
  type VerifiedOfficialThresholdRow,
  type VerifiedThreshold,
} from "@/lib/rules-schema";

export const FROZEN_PROGRAM_IDENTIFIER = "lihtc-mtsp-cambridge-2026";
export const FROZEN_PROGRAM_NAME =
  "Low-Income Housing Tax Credit / Multifamily Tax Subsidy Projects";
export const FROZEN_RULE_YEAR = 2026;
export const FROZEN_GEOGRAPHY = {
  city: "Cambridge",
  state: "Massachusetts",
  hudArea: "Boston-Cambridge-Quincy, MA-NH HMFA",
} as const;
export const PRIMARY_COMPARISON_TYPE = "standard-60-percent-mtsp" as const;
export const PRIMARY_COMPARISON_LABEL = "60% MTSP income limit" as const;

/**
 * Preserved for defensive handling of other or malformed corpus inputs. The
 * active local FY 2026 corpus below is verified and does not use this message.
 */
export const MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE =
  "Official 2026 threshold data has not been loaded. HousingReady Copilot will not estimate or substitute an income limit.";

const officialThresholdCitationId =
  "hud-fy2026-mtsp-massachusetts-boston-cambridge-quincy-page-130";

const parsedFrozenCorpus = ruleCorpusSchema.parse({
  schemaVersion: 1,
  corpusId: "hud-fy2026-mtsp-cambridge-official-v1",
  programIdentifier: FROZEN_PROGRAM_IDENTIFIER,
  programName: FROZEN_PROGRAM_NAME,
  geography: FROZEN_GEOGRAPHY,
  ruleYear: FROZEN_RULE_YEAR,
  effectiveDate: verifiedHudFy2026MtspSource.effectiveDate,
  sourceType: "verified-official-hud-frozen-rule-corpus",
  sourceId: verifiedHudFy2026MtspSource.sourceId,
  sourceTitle: verifiedHudFy2026MtspSource.datasetTitle,
  sourcePublisher: verifiedHudFy2026MtspSource.publisher,
  sourceUrl: verifiedHudFy2026MtspSource.datasetPageUrl,
  sourcePdfUrl: verifiedHudFy2026MtspSource.pdfUrl,
  sourcePdfPage: verifiedHudFy2026MtspSource.pdfPage,
  sourceVersion: verifiedHudFy2026MtspSource.sourceVersion,
  primaryComparisonType: PRIMARY_COMPARISON_TYPE,
  officialThresholdSource: verifiedHudFy2026MtspSource,
  citationPassages: [
    {
      citationId: officialThresholdCitationId,
      sectionOrRowId:
        "HERA-Income-Limits-Report-FY26.pdf — PDF page 130 of 326 — Massachusetts — Boston-Cambridge-Quincy, MA-NH HMFA",
      passage:
        "FY 2026 MFI: $164,600. Standard Very Low Income (50%) limits for household sizes 1–8: $60,000; $68,600; $77,150; $85,700; $92,600; $99,450; $106,300; $113,150. Standard 60% MTSP income limits: $72,000; $82,320; $92,580; $102,840; $111,120; $119,340; $127,560; $135,780.",
      topics: [
        "official threshold",
        "income limit",
        "60% MTSP",
        "50% very low income",
        "median family income",
        "effective date",
        "source",
        "PDF page",
        "geography",
        "rule year",
      ],
      sourceType: "official-hud-data",
      sourceTitle: verifiedHudFy2026MtspSource.datasetTitle,
      sourcePublisher: verifiedHudFy2026MtspSource.publisher,
      sourceUrl: verifiedHudFy2026MtspSource.pdfUrl,
      effectiveDate: verifiedHudFy2026MtspSource.effectiveDate,
      verificationStatus: "verified_official",
    },
    {
      citationId: "prototype-scope",
      sectionOrRowId: "housingready-policy.prototype-scope-v2",
      passage:
        "HousingReady Copilot is frozen to a Cambridge, Massachusetts demonstration using the Boston-Cambridge-Quincy, MA-NH HMFA, FY 2026, and the Low-Income Housing Tax Credit / Multifamily Tax Subsidy Projects context. It does not claim coverage of other locations, programs, properties, or rule years.",
      topics: [
        "program",
        "geography",
        "location",
        "HMFA",
        "rule year",
        "prototype scope",
      ],
      sourceType: "product-policy",
      sourceTitle: "HousingReady Copilot frozen prototype scope",
      sourcePublisher: "HousingReady Copilot",
      sourceUrl: "/about",
      effectiveDate: null,
      verificationStatus: "prototype_policy",
    },
    {
      citationId: "application-preparation-calculation",
      sectionOrRowId: "housingready-arithmetic.annualisation-v1",
      passage:
        "For application preparation, confirmed biweekly gross pay is multiplied by 26 pay periods, confirmed monthly benefits are multiplied by 12 months, and the two annualised amounts are added. This deterministic product arithmetic is not a determination of countable income or program eligibility.",
      topics: [
        "calculation",
        "annualised amount",
        "biweekly gross pay",
        "monthly benefit",
        "formula",
        "product arithmetic",
      ],
      sourceType: "product-arithmetic",
      sourceTitle: "HousingReady Copilot deterministic calculation policy",
      sourcePublisher: "HousingReady Copilot",
      sourceUrl: "/about",
      effectiveDate: null,
      verificationStatus: "prototype_policy",
    },
    {
      citationId: "prototype-reference-threshold-policy",
      sectionOrRowId: "housingready-policy.reference-threshold-v1",
      passage:
        "The standard 60% MTSP income limit is a reference threshold selected for this frozen prototype scenario. Different properties, set-asides, project histories, programs, or rules may require different limits.",
      topics: [
        "reference threshold",
        "60% MTSP",
        "property-specific rules",
        "set-asides",
        "project history",
        "scope limitation",
      ],
      sourceType: "product-policy",
      sourceTitle: "HousingReady Copilot reference-threshold policy",
      sourcePublisher: "HousingReady Copilot",
      sourceUrl: "/about",
      effectiveDate: null,
      verificationStatus: "prototype_policy",
    },
    {
      citationId: "missing-information-policy",
      sectionOrRowId: "housingready-policy.uncertainty-v1",
      passage:
        "When information needed for application preparation is missing, uncertain, or unverified, HousingReady Copilot abstains instead of estimating, substituting, or silently choosing a value.",
      topics: [
        "uncertainty",
        "missing information",
        "unverified data",
        "abstention",
      ],
      sourceType: "product-policy",
      sourceTitle: "HousingReady Copilot uncertainty policy",
      sourcePublisher: "HousingReady Copilot",
      sourceUrl: "/about",
      effectiveDate: null,
      verificationStatus: "prototype_policy",
    },
    {
      citationId: "qualified-review-policy",
      sectionOrRowId: "housingready-policy.decision-boundary-v2",
      passage:
        "HousingReady Copilot does not know or determine property-specific set-asides, HERA-special status, asset-income treatment, income exclusions, household-composition rules, student-status rules, verification requirements, local housing-provider policies, or final eligibility. It does not approve, deny, score, rank, or predict acceptance. A qualified housing professional applies the complete property-specific and program-specific rules and makes the final housing decision.",
      topics: [
        "final decision",
        "qualified housing professional",
        "eligibility",
        "decision boundary",
        "property-specific rules",
        "student status",
        "asset income",
        "income exclusions",
      ],
      sourceType: "product-policy",
      sourceTitle: "HousingReady Copilot decision-boundary policy",
      sourcePublisher: "HousingReady Copilot",
      sourceUrl: "/about",
      effectiveDate: null,
      verificationStatus: "prototype_policy",
    },
  ],
  householdSizeThresholds:
    verifiedHudFy2026MtspSource.householdSizeThresholds.map((threshold) => ({
      householdSize: threshold.householdSize,
      annualIncomeLimitCents:
        threshold.standard60PercentMtspIncomeLimitCents,
      currency: "USD",
      citationId: officialThresholdCitationId,
      verificationStatus: "verified_official",
    })),
  calculationRules: [
    {
      ruleId: "annualize-biweekly-gross-pay-v1",
      title: "Biweekly gross-pay annualisation",
      inputField: "grossPay",
      inputCadence: "biweekly",
      periodsPerYear: 26,
      formula: "confirmed gross pay × 26 pay periods",
      explanation:
        "An arithmetic transformation of the renter-confirmed biweekly gross-pay input for application preparation.",
      citationId: "application-preparation-calculation",
    },
    {
      ruleId: "annualize-monthly-benefit-v1",
      title: "Monthly-benefit annualisation",
      inputField: "monthlyBenefit",
      inputCadence: "monthly",
      periodsPerYear: 12,
      formula: "confirmed monthly benefit × 12 months",
      explanation:
        "An arithmetic transformation of the renter-confirmed monthly-benefit input for application preparation.",
      citationId: "application-preparation-calculation",
    },
  ],
  checklistReferences: [],
  dataVerificationStatus: "verified_official",
  verificationNotes:
    "Verified official HUD FY 2026 MTSP source. The HUD table values and provenance are frozen locally; HousingReady-authored arithmetic and safety policies remain separately identified as product material.",
});

/**
 * Existing consumers keep the RuleCorpus type, while the shared production
 * object is recursively frozen at runtime to prevent accidental mutation.
 */
export const frozen2026MtspCorpus: RuleCorpus = deepFreeze(
  parsedFrozenCorpus,
) as RuleCorpus;

export { verifiedHudFy2026MtspSource };

export function loadRuleCorpus(input: unknown): RuleCorpus {
  return ruleCorpusSchema.parse(input);
}

export function isFrozenPrototypeCorpus(corpus: RuleCorpus): boolean {
  return (
    corpus.programIdentifier === FROZEN_PROGRAM_IDENTIFIER &&
    corpus.programName === FROZEN_PROGRAM_NAME &&
    corpus.ruleYear === FROZEN_RULE_YEAR &&
    corpus.geography.city === FROZEN_GEOGRAPHY.city &&
    corpus.geography.state === FROZEN_GEOGRAPHY.state &&
    corpus.geography.hudArea === FROZEN_GEOGRAPHY.hudArea
  );
}

export function getThresholdForHouseholdSize(
  corpus: RuleCorpus,
  householdSize: HouseholdSize,
): HouseholdSizeThreshold | null {
  return (
    corpus.householdSizeThresholds.find(
      (threshold) => threshold.householdSize === householdSize,
    ) ?? null
  );
}

export function getOfficialThresholdRowForHouseholdSize(
  source: {
    readonly householdSizeThresholds: readonly Readonly<VerifiedOfficialThresholdRow>[];
  },
  householdSize: HouseholdSize,
): Readonly<VerifiedOfficialThresholdRow> | null {
  return (
    source.householdSizeThresholds.find(
      (threshold) => threshold.householdSize === householdSize,
    ) ?? null
  );
}

export type VerifiedThresholdCitation = CitationPassage & {
  sourceType: "official-hud-data";
  sourceUrl: string;
  effectiveDate: string;
  verificationStatus: "verified_official";
};

export type VerifiedThresholdComparisonData = {
  corpusId: string;
  sourceVersion: string;
  effectiveDate: string;
  threshold: VerifiedThreshold;
  citation: VerifiedThresholdCitation;
  officialSource: VerifiedOfficialHudSource;
};

/**
 * Sole gate for published-threshold comparisons. Only the embedded verified
 * official HUD record can enable the comparison; legacy or product-authored
 * material can never satisfy this gate.
 */
export function getVerifiedThresholdComparisonData(
  corpus: RuleCorpus,
  householdSize: HouseholdSize,
): VerifiedThresholdComparisonData | null {
  if (
    !isFrozenPrototypeCorpus(corpus) ||
    corpus.dataVerificationStatus !== "verified_official" ||
    corpus.effectiveDate === null ||
    corpus.officialThresholdSource === null ||
    /(?:template|placeholder|not[-_ ]loaded)/i.test(corpus.corpusId) ||
    /(?:template|placeholder|not[-_ ]loaded)/i.test(corpus.sourceVersion)
  ) {
    return null;
  }

  const threshold = getThresholdForHouseholdSize(corpus, householdSize);
  if (
    !threshold ||
    !isVerifiedDataStatus(threshold.verificationStatus) ||
    threshold.annualIncomeLimitCents === null ||
    threshold.citationId === null
  ) {
    return null;
  }

  const citation = corpus.citationPassages.find(
    (candidate) => candidate.citationId === threshold.citationId,
  );
  if (
    !citation ||
    citation.verificationStatus !== "verified_official" ||
    citation.sourceType !== "official-hud-data" ||
    citation.sourceUrl === null ||
    citation.effectiveDate === null
  ) {
    return null;
  }

  const officialSource = corpus.officialThresholdSource;
  const officialThreshold = getOfficialThresholdRowForHouseholdSize(
    officialSource,
    householdSize,
  );

  if (
    officialSource.verificationStatus !== "verified_official" ||
    citation.sourceUrl !== officialSource.pdfUrl ||
    threshold.verificationStatus !== "verified_official" ||
    !officialThreshold ||
    threshold.annualIncomeLimitCents !==
      officialThreshold.standard60PercentMtspIncomeLimitCents
  ) {
    return null;
  }

  return {
    corpusId: corpus.corpusId,
    sourceVersion: corpus.sourceVersion,
    effectiveDate: corpus.effectiveDate,
    threshold: {
      ...threshold,
      annualIncomeLimitCents: threshold.annualIncomeLimitCents,
      citationId: threshold.citationId,
      verificationStatus: threshold.verificationStatus,
    },
    citation: {
      ...citation,
      sourceType: citation.sourceType,
      sourceUrl: citation.sourceUrl,
      effectiveDate: citation.effectiveDate,
      verificationStatus: citation.verificationStatus,
    },
    officialSource,
  };
}
