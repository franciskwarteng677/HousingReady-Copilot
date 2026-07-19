import {
  frozen2026MtspCorpus,
  getVerifiedThresholdComparisonData,
  MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
} from "@/data/rules";
import { formatCurrencyFromCents } from "@/lib/income-calculation";
import type {
  CitationPassage,
  DataVerificationStatus,
  HouseholdSize,
  RuleCorpus,
  RuleGeography,
  RuleSourceType,
} from "@/lib/rules-schema";
import { compareVerifiedThreshold } from "@/lib/understand-state";
import type { StoredIncomeCalculation } from "@/lib/understand-schema";

export const MISSING_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL =
  "HousingReady Copilot does not determine eligibility. It can show your confirmed inputs and transparent calculation, but verified 2026 threshold data has not been loaded. A qualified housing professional must review the applicable official rules.";

export const VERIFIED_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL =
  "HousingReady Copilot does not determine housing eligibility. It can show your confirmed inputs, transparent application-preparation calculation, and the verified HUD reference threshold. A qualified housing professional must apply the complete property-specific and program-specific rules.";

export const ELIGIBILITY_QUESTION_REFUSAL =
  VERIFIED_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL;

export const UNSUPPORTED_RULES_QUESTION_RESPONSE =
  "I cannot answer that from the currently loaded official rule corpus.";

export const HOUSEHOLD_SIZE_REQUIRED_FOR_THRESHOLD_RESPONSE =
  "Confirm the renter-provided household size before asking for a household-size threshold.";

export type RulesAssistantConfidence =
  | "Supported by verified official corpus"
  | "Supported by prototype policy corpus"
  | "Supported by product arithmetic"
  | "Partially supported"
  | "Not supported";

export type RulesAssistantCitation = {
  citationId: string;
  passageOrTableRowIdentifier: string;
  supportingExcerpt: string;
  sourcePublisher: string;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceType: RuleSourceType;
  ruleYear: number;
  effectiveDate: string | null;
  geography: RuleGeography;
  verificationStatus: DataVerificationStatus;
};

export type RulesAssistantResponse = {
  kind: "answer" | "refusal" | "abstention";
  confidence: RulesAssistantConfidence;
  explanation: string;
  citations: RulesAssistantCitation[];
};

export type RulesAssistantContext = {
  corpus?: RuleCorpus;
  householdSize?: HouseholdSize;
  calculation?: StoredIncomeCalculation | null;
};

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function citationForDisplay(
  corpus: RuleCorpus,
  citation: CitationPassage,
): RulesAssistantCitation {
  return {
    citationId: citation.citationId,
    passageOrTableRowIdentifier: citation.sectionOrRowId,
    supportingExcerpt: citation.passage,
    sourcePublisher: citation.sourcePublisher,
    sourceTitle: citation.sourceTitle,
    sourceUrl: citation.sourceUrl,
    sourceType: citation.sourceType,
    ruleYear: corpus.ruleYear,
    effectiveDate: citation.effectiveDate,
    geography: corpus.geography,
    verificationStatus: citation.verificationStatus,
  };
}

function findCitationById(
  corpus: RuleCorpus,
  citationId: string,
): CitationPassage | null {
  return (
    corpus.citationPassages.find(
      (citation) => citation.citationId === citationId,
    ) ?? null
  );
}

function findCitationByTopic(
  corpus: RuleCorpus,
  topic: string,
  sourceType?: RuleSourceType,
): CitationPassage | null {
  const normalizedTopic = topic.toLocaleLowerCase("en-US");

  return (
    corpus.citationPassages.find(
      (citation) =>
        (!sourceType || citation.sourceType === sourceType) &&
        citation.topics.some(
          (candidate) =>
            candidate.toLocaleLowerCase("en-US") === normalizedTopic,
        ),
    ) ?? null
  );
}

function confidenceForCitation(
  citation: CitationPassage,
): RulesAssistantConfidence {
  if (
    citation.sourceType === "official-hud-data" &&
    citation.verificationStatus === "verified_official"
  ) {
    return "Supported by verified official corpus";
  }

  if (citation.sourceType === "product-arithmetic") {
    return "Supported by product arithmetic";
  }

  if (
    citation.sourceType === "product-policy" ||
    citation.sourceType === "application-policy"
  ) {
    return "Supported by prototype policy corpus";
  }

  return "Partially supported";
}

function supportedAnswer(
  corpus: RuleCorpus,
  citation: CitationPassage | null,
  explanation: string,
  extraCitations: CitationPassage[] = [],
): RulesAssistantResponse {
  if (!citation) {
    return {
      kind: "abstention",
      confidence: "Not supported",
      explanation: UNSUPPORTED_RULES_QUESTION_RESPONSE,
      citations: [],
    };
  }

  return {
    kind: "answer",
    confidence: confidenceForCitation(citation),
    explanation,
    citations: [citation, ...extraCitations].map((item) =>
      citationForDisplay(corpus, item),
    ),
  };
}

function eligibilityQuestionRefusal(
  corpus: RuleCorpus,
  householdSize: HouseholdSize | undefined,
): string {
  const lookupSize = householdSize ?? 1;

  return getVerifiedThresholdComparisonData(corpus, lookupSize)
    ? VERIFIED_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL
    : MISSING_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL;
}

function markPartiallySupportedWhenNeeded(
  response: RulesAssistantResponse,
  normalizedQuestion: string,
): RulesAssistantResponse {
  if (
    response.kind !== "answer" ||
    !/\b(pets?|parking|amenit(?:y|ies)|lease terms?|rent amount)\b/.test(
      normalizedQuestion,
    )
  ) {
    return response;
  }

  return {
    ...response,
    confidence: "Partially supported",
    explanation:
      response.explanation +
      " The currently loaded corpus does not support the other part of the question.",
  };
}

function isRuleCorpus(
  input: RuleCorpus | RulesAssistantContext,
): input is RuleCorpus {
  return "corpusId" in input;
}

function requestedHouseholdSize(
  normalizedQuestion: string,
): HouseholdSize | undefined {
  const numericMatch = normalizedQuestion.match(
    /\b([1-8])(?:\s*-\s*person|\s+persons?)\b/,
  );
  if (numericMatch?.[1]) {
    return Number(numericMatch[1]) as HouseholdSize;
  }

  const wordSizes = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
  } as const;

  for (const [word, size] of Object.entries(wordSizes)) {
    if (new RegExp(`\\b${word}(?:\\s*-\\s*person|\\s+persons?)\\b`).test(normalizedQuestion)) {
      return size as HouseholdSize;
    }
  }

  return undefined;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)));
}

function calculationExplanation(
  calculation: StoredIncomeCalculation | null | undefined,
): string {
  if (!calculation) {
    return "The deterministic application-preparation calculation multiplies confirmed biweekly gross pay by 26, multiplies confirmed monthly benefits by 12, and adds the two annualised amounts. It does not determine countable income or make a housing decision.";
  }

  const grossSources = calculation.evidence.grossPay.sources
    .map((source) => source.sourceDocumentName)
    .join(", ");
  const benefitSources = calculation.evidence.monthlyBenefit.sources
    .map((source) => source.sourceDocumentName)
    .join(", ");

  return `Employment: ${formatCurrencyFromCents(calculation.employment.inputAmountCents)} × ${calculation.employment.periodsPerYear} = ${formatCurrencyFromCents(calculation.employment.resultCents)}. Benefits: ${formatCurrencyFromCents(calculation.benefits.inputAmountCents)} × ${calculation.benefits.periodsPerYear} = ${formatCurrencyFromCents(calculation.benefits.resultCents)}. Combined annualised amount: ${formatCurrencyFromCents(calculation.combined.resultCents)}. Confirmed input sources: employment — ${grossSources}; benefits — ${benefitSources}. This is deterministic product arithmetic for application preparation.`;
}

/**
 * Deterministic retrieval over the supplied local corpus. Questions and all
 * corpus passages remain inert data; they cannot execute instructions, alter
 * calculations, change storage, or unlock application stages.
 */
export function answerRulesQuestion(
  question: string,
  corpusOrContext: RuleCorpus | RulesAssistantContext = {},
): RulesAssistantResponse {
  const context = isRuleCorpus(corpusOrContext)
    ? { corpus: corpusOrContext }
    : corpusOrContext;
  const corpus = context.corpus ?? frozen2026MtspCorpus;
  const normalizedQuestion = normalizeQuestion(question);

  if (
    /\b(eligible|eligibility|ineligible|qualify|qualified|qualification|approve|approved|deny|denied|pass|fail|score|rank|acceptance probability|predict acceptance)\b/.test(
      normalizedQuestion,
    )
  ) {
    return {
      kind: "refusal",
      confidence: "Not supported",
      explanation: eligibilityQuestionRefusal(corpus, context.householdSize),
      citations: [],
    };
  }

  if (
    /\bwho\b.*\b(makes?|reviews?|determines?|decides?)\b.*\b(final|housing)\b.*\b(decision|application)\b/.test(
      normalizedQuestion,
    ) ||
    /\bwho\b.*\b(final housing decision|final decision)\b/.test(
      normalizedQuestion,
    )
  ) {
    return markPartiallySupportedWhenNeeded(
      supportedAnswer(
        corpus,
        findCitationById(corpus, "qualified-review-policy"),
        "A qualified housing professional applies the complete property-specific and program-specific rules and makes the final housing decision. HousingReady Copilot only prepares and explains information.",
      ),
      normalizedQuestion,
    );
  }

  if (
    /\b(difference|how far|above|below)\b.*\b(threshold|income limit)\b/.test(
      normalizedQuestion,
    )
  ) {
    const householdSize =
      requestedHouseholdSize(normalizedQuestion) ?? context.householdSize;
    if (!householdSize) {
      return {
        kind: "abstention",
        confidence: "Not supported",
        explanation: HOUSEHOLD_SIZE_REQUIRED_FOR_THRESHOLD_RESPONSE,
        citations: [],
      };
    }
    if (!context.calculation) {
      return {
        kind: "abstention",
        confidence: "Not supported",
        explanation:
          "A current deterministic calculation is required before the difference can be explained.",
        citations: [],
      };
    }

    const comparison = compareVerifiedThreshold(
      corpus,
      householdSize,
      context.calculation.combined.resultCents,
    );
    const verified = getVerifiedThresholdComparisonData(corpus, householdSize);
    if (comparison.outcome === "blocked" || !verified) {
      return {
        kind: "abstention",
        confidence: "Not supported",
        explanation: MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
        citations: [],
      };
    }

    const arithmeticCitation = findCitationById(
      corpus,
      "application-preparation-calculation",
    );
    return supportedAnswer(
      corpus,
      verified.citation,
      `${comparison.differenceCalculation}. ${comparison.neutralStatement}`,
      arithmeticCitation ? [arithmeticCitation] : [],
    );
  }

  if (
    /\b(how|formula|calculation|calculated|annualized amount|annualised amount)\b.*\b(annualized|annualised|amount|calculation|calculated|gross pay|biweekly|monthly benefit|formula)\b/.test(
      normalizedQuestion,
    ) ||
    /\b(annualized|annualised)\b.*\b(calculated|calculation|formula)\b/.test(
      normalizedQuestion,
    )
  ) {
    return markPartiallySupportedWhenNeeded(
      supportedAnswer(
        corpus,
        findCitationById(corpus, "application-preparation-calculation"),
        calculationExplanation(context.calculation),
      ),
      normalizedQuestion,
    );
  }

  if (
    /\b(threshold|income limit|limit source)\b/.test(normalizedQuestion) ||
    /\bsource\b.*\b(supports?|for)\b/.test(normalizedQuestion)
  ) {
    const householdSize =
      requestedHouseholdSize(normalizedQuestion) ?? context.householdSize;
    if (!householdSize) {
      return {
        kind: "abstention",
        confidence: "Not supported",
        explanation: HOUSEHOLD_SIZE_REQUIRED_FOR_THRESHOLD_RESPONSE,
        citations: [],
      };
    }

    const verified = getVerifiedThresholdComparisonData(corpus, householdSize);
    if (!verified || !verified.officialSource) {
      return {
        kind: "abstention",
        confidence: "Not supported",
        explanation: MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
        citations: [],
      };
    }

    const questionAsksSource = /\b(source|supports?|citation|where)\b/.test(
      normalizedQuestion,
    );
    const questionAsksEffective = /\b(effective|when|date)\b/.test(
      normalizedQuestion,
    );
    const explanation = questionAsksEffective
      ? `The frozen FY ${corpus.ruleYear} HUD MTSP limits became effective ${formatDate(verified.effectiveDate)}. The cited Massachusetts row for ${corpus.geography.hudArea} is on PDF page ${verified.officialSource.pdfPage} of ${verified.officialSource.pdfPageCount}.`
      : questionAsksSource
        ? `${verified.officialSource.publisher} published the ${verified.officialSource.datasetTitle}. The relevant Massachusetts row for ${verified.officialSource.hmfaName} appears on PDF page ${verified.officialSource.pdfPage} of ${verified.officialSource.pdfPageCount} and is effective ${formatDate(verified.effectiveDate)}.`
        : `The official ${householdSize}-person 60% MTSP reference threshold is ${formatCurrencyFromCents(verified.threshold.annualIncomeLimitCents)}. It is from the FY ${corpus.ruleYear} HUD table for ${corpus.geography.hudArea}, PDF page ${verified.officialSource.pdfPage}, effective ${formatDate(verified.effectiveDate)}.`;

    return markPartiallySupportedWhenNeeded(
      supportedAnswer(corpus, verified.citation, explanation),
      normalizedQuestion,
    );
  }

  if (
    /\b(what|which)\b.*\b(program|context)\b.*\b(loaded|used|covered|scope)\b/.test(
      normalizedQuestion,
    ) ||
    /\b(loaded|current|frozen)\b.*\b(program|context)\b/.test(
      normalizedQuestion,
    )
  ) {
    return markPartiallySupportedWhenNeeded(
      supportedAnswer(
        corpus,
        findCitationById(corpus, "prototype-scope"),
        `${corpus.programName} is the frozen prototype context for ${corpus.geography.city}, ${corpus.geography.state}, within ${corpus.geography.hudArea}. This product scope is a HousingReady Copilot policy; it does not claim coverage of another program, property, or location.`,
      ),
      normalizedQuestion,
    );
  }

  if (
    /\b(what|which)\b.*\b(geography|location|hud area|hmfa)\b.*\b(loaded|used|covered|scope)\b/.test(
      normalizedQuestion,
    ) ||
    /\b(loaded|current|frozen)\b.*\b(geography|location|hud area|hmfa)\b/.test(
      normalizedQuestion,
    )
  ) {
    return markPartiallySupportedWhenNeeded(
      supportedAnswer(
        corpus,
        findCitationByTopic(corpus, "geography", "official-hud-data"),
        `The official threshold geography is ${corpus.geography.hudArea}. The user scenario is narrowly frozen to ${corpus.geography.city}, ${corpus.geography.state}; no other geography is covered.`,
      ),
      normalizedQuestion,
    );
  }

  if (
    /\brule year\b/.test(normalizedQuestion) ||
    /\b(what|which) year\b.*\b(rule|corpus|program)\b/.test(
      normalizedQuestion,
    )
  ) {
    return markPartiallySupportedWhenNeeded(
      supportedAnswer(
        corpus,
        findCitationByTopic(corpus, "rule year", "official-hud-data"),
        `The loaded official HUD MTSP rule year is ${corpus.ruleYear}. The prototype does not substitute a different year.`,
      ),
      normalizedQuestion,
    );
  }

  if (
    /\b(uncertain|uncertainty|missing information|unverified|not known|unknown information)\b/.test(
      normalizedQuestion,
    )
  ) {
    return markPartiallySupportedWhenNeeded(
      supportedAnswer(
        corpus,
        findCitationById(corpus, "missing-information-policy"),
        "When required information is missing, uncertain, or unverified, HousingReady Copilot abstains instead of estimating, substituting, or silently selecting a value.",
      ),
      normalizedQuestion,
    );
  }

  return {
    kind: "abstention",
    confidence: "Not supported",
    explanation: UNSUPPORTED_RULES_QUESTION_RESPONSE,
    citations: [],
  };
}
