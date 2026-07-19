import organizerPackTemplate from "@/data/rules/organizer-pack.template.json";
import {
  ruleCorpusSchema,
  type CitationPassage,
  type HouseholdSize,
  type HouseholdSizeThreshold,
  type RuleCorpus,
  type VerifiedThreshold,
} from "@/lib/rules-schema";

export const FROZEN_PROGRAM_IDENTIFIER = "lihtc-mtsp-cambridge-2026";
export const FROZEN_PROGRAM_NAME =
  "Low-Income Housing Tax Credit / Multifamily Tax Subsidy Projects";
export const FROZEN_RULE_YEAR = 2026;
export const FROZEN_GEOGRAPHY = {
  city: "Cambridge",
  state: "Massachusetts",
  hudArea: "Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area",
} as const;

export const MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE =
  "Official 2026 threshold data has not been loaded. HousingReady Copilot will not estimate or substitute an income limit.";

export const frozen2026MtspCorpus = ruleCorpusSchema.parse(
  organizerPackTemplate,
);

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

export type VerifiedThresholdCitation = CitationPassage & {
  sourceType: "organizer-pack" | "official-rule";
  sourceUrl: string;
  effectiveDate: string;
  verificationStatus: "verified";
};

export type VerifiedThresholdComparisonData = {
  corpusId: string;
  sourceVersion: string;
  effectiveDate: string;
  threshold: VerifiedThreshold;
  citation: VerifiedThresholdCitation;
};

/**
 * This is the sole gate for displaying a published-threshold comparison.
 * It deliberately returns null unless all frozen-scope and provenance checks
 * pass. Unverified numeric values are never returned by this function.
 */
export function getVerifiedThresholdComparisonData(
  corpus: RuleCorpus,
  householdSize: HouseholdSize,
): VerifiedThresholdComparisonData | null {
  if (
    !isFrozenPrototypeCorpus(corpus) ||
    corpus.dataVerificationStatus !== "verified" ||
    corpus.effectiveDate === null ||
    /(?:template|placeholder|not[-_ ]loaded)/i.test(corpus.corpusId) ||
    /(?:template|placeholder|not[-_ ]loaded)/i.test(corpus.sourceVersion)
  ) {
    return null;
  }

  const threshold = getThresholdForHouseholdSize(corpus, householdSize);
  if (
    !threshold ||
    threshold.verificationStatus !== "verified" ||
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
    citation.verificationStatus !== "verified" ||
    citation.sourceType === "application-policy" ||
    citation.sourceUrl === null ||
    citation.effectiveDate === null
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
      verificationStatus: "verified",
    },
    citation: {
      ...citation,
      sourceType: citation.sourceType,
      sourceUrl: citation.sourceUrl,
      effectiveDate: citation.effectiveDate,
      verificationStatus: "verified",
    },
  };
}
