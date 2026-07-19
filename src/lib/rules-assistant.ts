import {
  frozen2026MtspCorpus,
  getVerifiedThresholdComparisonData,
  MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
} from "@/data/rules";
import type {
  CitationPassage,
  DataVerificationStatus,
  HouseholdSize,
  RuleCorpus,
  RuleGeography,
  RuleSourceType,
} from "@/lib/rules-schema";

export const MISSING_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL =
  "HousingReady Copilot does not determine eligibility. It can show your confirmed inputs and transparent calculation, but verified 2026 threshold data has not been loaded. A qualified housing professional must review the applicable official rules.";

export const VERIFIED_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL =
  "HousingReady Copilot does not determine eligibility. It can show your confirmed inputs, transparent calculation, the displayed published threshold, and its authoritative source for review by a qualified housing professional.";

// Retain the original export as the safe default for callers without a
// verified, household-size-specific threshold context.
export const ELIGIBILITY_QUESTION_REFUSAL =
  MISSING_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL;

export const UNSUPPORTED_RULES_QUESTION_RESPONSE =
  "I cannot answer that from the currently loaded official rule corpus.";

export const HOUSEHOLD_SIZE_REQUIRED_FOR_THRESHOLD_RESPONSE =
  "Confirm the renter-provided household size before asking for the source supporting a household-size threshold.";

export type RulesAssistantConfidence =
  | "Supported by prototype corpus"
  | "Supported by verified official corpus"
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

function findCitationByTopic(
  corpus: RuleCorpus,
  topic: string,
): CitationPassage | null {
  const normalizedTopic = topic.toLocaleLowerCase("en-US");

  return (
    corpus.citationPassages.find((citation) =>
      citation.topics.some(
        (candidate) =>
          candidate.toLocaleLowerCase("en-US") === normalizedTopic,
      ),
    ) ?? null
  );
}

function supportedAnswer(
  corpus: RuleCorpus,
  topic: string,
  explanation: string,
): RulesAssistantResponse {
  const citation = findCitationByTopic(corpus, topic);

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
    confidence:
      citation.verificationStatus === "verified" &&
      citation.sourceType !== "application-policy"
        ? "Supported by verified official corpus"
        : "Supported by prototype corpus",
    explanation,
    citations: [citationForDisplay(corpus, citation)],
  };
}

function eligibilityQuestionRefusal(
  corpus: RuleCorpus,
  householdSize: HouseholdSize | undefined,
): string {
  if (
    householdSize !== undefined &&
    getVerifiedThresholdComparisonData(corpus, householdSize) !== null
  ) {
    return VERIFIED_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL;
  }

  return MISSING_THRESHOLD_ELIGIBILITY_QUESTION_REFUSAL;
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

/**
 * Deterministic retrieval over the supplied local corpus. User wording and
 * citation text are data only: neither is evaluated as an instruction, and
 * neither can alter the fixed intent routing or response boundaries.
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
        "final decision",
        "A qualified housing professional makes the final housing decision. HousingReady Copilot only prepares and explains information.",
      ),
      normalizedQuestion,
    );
  }

  if (/\b(threshold|income limit|limit source)\b/.test(normalizedQuestion)) {
    const householdSize = context.householdSize;

    if (
      corpus.dataVerificationStatus !== "verified" ||
      corpus.effectiveDate === null
    ) {
      return {
        kind: "abstention",
        confidence: "Not supported",
        explanation: MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
        citations: [],
      };
    }

    if (householdSize === undefined) {
      return {
        kind: "abstention",
        confidence: "Not supported",
        explanation: HOUSEHOLD_SIZE_REQUIRED_FOR_THRESHOLD_RESPONSE,
        citations: [],
      };
    }

    const comparisonData = getVerifiedThresholdComparisonData(
      corpus,
      householdSize,
    );

    if (!comparisonData) {
      return {
        kind: "abstention",
        confidence: "Not supported",
        explanation: MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
        citations: [],
      };
    }

    return markPartiallySupportedWhenNeeded({
      kind: "answer",
      confidence: "Supported by verified official corpus",
      explanation:
        "The displayed threshold is tied to the selected household size and the cited frozen corpus row. The numerical comparison is not an eligibility determination.",
      citations: [citationForDisplay(corpus, comparisonData.citation)],
    }, normalizedQuestion);
  }

  if (
    /\b(what|which)\b.*\b(program|geography|location|hud area|context)\b.*\b(loaded|used|covered|scope)\b/.test(
      normalizedQuestion,
    ) ||
    /\b(loaded|current|frozen)\b.*\b(program|geography|location|hud area|context)\b/.test(
      normalizedQuestion,
    )
  ) {
    return markPartiallySupportedWhenNeeded(
      supportedAnswer(
        corpus,
        "program",
        `${corpus.programName} is loaded for ${corpus.geography.city}, ${corpus.geography.state}, in the ${corpus.geography.hudArea}. The prototype does not cover another location or program.`,
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
        "rule year",
        `The loaded rule year is ${corpus.ruleYear}. The prototype does not substitute a different year.`,
      ),
      normalizedQuestion,
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
        "calculation",
        "The deterministic application-preparation calculation multiplies confirmed biweekly gross pay by 26, multiplies confirmed monthly benefits by 12, and adds the two annualized amounts. It does not determine countable income or eligibility.",
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
        "uncertainty",
        "When required information is missing, uncertain, or unverified, HousingReady Copilot abstains instead of estimating or substituting a value.",
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
