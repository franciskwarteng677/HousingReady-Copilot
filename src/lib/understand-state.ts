import {
  getVerifiedThresholdComparisonData,
  MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
} from "@/data/rules";
import {
  calculateAnnualizedIncome,
} from "@/lib/income-calculation";
import {
  createProfileFingerprint,
  isCompletedProfileSession,
} from "@/lib/profile-fingerprint";
import type {
  ApprovedFieldId,
  ConfirmedProfileField,
  ProfileSession,
} from "@/lib/profile-schema";
import type { HouseholdSize, RuleCorpus } from "@/lib/rules-schema";
import {
  calculationInputSnapshotSchema,
  storedIncomeCalculationSchema,
  type CalculationInputEvidence,
  type CalculationInputSnapshot,
  type StoredIncomeCalculation,
  type UnderstandSession,
} from "@/lib/understand-schema";

export const INCOME_INPUT_NO_CALL_MESSAGE =
  "The deterministic calculation needs exactly one confirmed gross pay, one confirmed biweekly pay frequency, and one confirmed monthly benefit. Review or correct the Profile before calculating.";

export type IncomeCalculationBuildResult =
  | {
      outcome: "calculated";
      calculation: StoredIncomeCalculation;
      inputSnapshot: CalculationInputSnapshot;
    }
  | {
      outcome: "no-call";
      message: typeof INCOME_INPUT_NO_CALL_MESSAGE;
    };

function findSingleField(
  profile: ProfileSession,
  fieldId: ApprovedFieldId,
): ConfirmedProfileField | null {
  const matches = profile.confirmedFields.filter(
    (field) => field.fieldId === fieldId,
  );

  return matches.length === 1 ? matches[0] ?? null : null;
}

function toEvidence(field: ConfirmedProfileField): CalculationInputEvidence {
  return {
    fieldId: field.fieldId,
    label: field.label,
    confirmedValue: field.value,
    sources: field.sources,
  };
}

export function buildIncomeCalculation(
  profile: ProfileSession,
  calculatedAt: string,
): IncomeCalculationBuildResult {
  if (!isCompletedProfileSession(profile)) {
    return { outcome: "no-call", message: INCOME_INPUT_NO_CALL_MESSAGE };
  }

  const grossPay = findSingleField(profile, "grossPay");
  const payFrequency = findSingleField(profile, "payFrequency");
  const monthlyBenefit = findSingleField(profile, "monthlyBenefit");

  if (
    !grossPay ||
    grossPay.valueCents === null ||
    !payFrequency ||
    !monthlyBenefit ||
    monthlyBenefit.valueCents === null
  ) {
    return { outcome: "no-call", message: INCOME_INPUT_NO_CALL_MESSAGE };
  }

  const profileFingerprint = createProfileFingerprint(profile);

  try {
    const arithmetic = calculateAnnualizedIncome({
      grossPayCents: grossPay.valueCents,
      payFrequency: payFrequency.value,
      monthlyBenefitCents: monthlyBenefit.valueCents,
      calculatedAt,
    });
    const inputSnapshot = calculationInputSnapshotSchema.parse({
      profileFingerprint,
      grossPayValue: grossPay.value,
      payFrequencyValue: payFrequency.value,
      monthlyBenefitValue: monthlyBenefit.value,
    });

    return {
      outcome: "calculated",
      inputSnapshot,
      calculation: storedIncomeCalculationSchema.parse({
        ...arithmetic,
        profileFingerprint,
        evidence: {
          grossPay: toEvidence(grossPay),
          payFrequency: toEvidence(payFrequency),
          monthlyBenefit: toEvidence(monthlyBenefit),
        },
      }),
    };
  } catch {
    return { outcome: "no-call", message: INCOME_INPUT_NO_CALL_MESSAGE };
  }
}

export function inputSnapshotFromCalculation(
  calculation: StoredIncomeCalculation,
): CalculationInputSnapshot {
  return calculationInputSnapshotSchema.parse({
    profileFingerprint: calculation.profileFingerprint,
    grossPayValue: calculation.evidence.grossPay.confirmedValue,
    payFrequencyValue: calculation.evidence.payFrequency.confirmedValue,
    monthlyBenefitValue:
      calculation.evidence.monthlyBenefit.confirmedValue,
  });
}

export function isStoredCalculationValidForProfile(
  profile: ProfileSession,
  calculation: StoredIncomeCalculation,
): boolean {
  const rebuilt = buildIncomeCalculation(profile, calculation.calculatedAt);

  return (
    rebuilt.outcome === "calculated" &&
    JSON.stringify(rebuilt.calculation) === JSON.stringify(calculation)
  );
}

export function describeCalculationUpdate(
  previous: CalculationInputSnapshot | null,
  current: CalculationInputSnapshot,
): string {
  if (!previous) {
    return "Annualised income calculation updated because the confirmed Profile changed.";
  }

  if (previous.grossPayValue !== current.grossPayValue) {
    return `Annualised income calculation updated because confirmed gross pay changed from ${previous.grossPayValue} to ${current.grossPayValue}.`;
  }

  if (previous.monthlyBenefitValue !== current.monthlyBenefitValue) {
    return `Annualised income calculation updated because confirmed monthly benefit changed from ${previous.monthlyBenefitValue} to ${current.monthlyBenefitValue}.`;
  }

  if (previous.payFrequencyValue !== current.payFrequencyValue) {
    return `Annualised income calculation updated because confirmed pay frequency changed from ${previous.payFrequencyValue} to ${current.payFrequencyValue}.`;
  }

  return "Annualised income calculation updated because the confirmed Profile or source documents changed.";
}

export type ThresholdComparisonResult =
  | {
      outcome: "blocked";
      message: typeof MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE;
    }
  | {
      outcome: "available";
      householdSize: HouseholdSize;
      combinedAnnualizedCents: number;
      publishedThresholdCents: number;
      relation: "below" | "equal" | "above";
      mathematicalComparison: string;
      neutralStatement: string;
      sourceVersion: string;
      effectiveDate: string;
      citationId: string;
    };

export function compareVerifiedThreshold(
  corpus: RuleCorpus,
  householdSize: HouseholdSize,
  combinedAnnualizedCents: number,
): ThresholdComparisonResult {
  const verified = getVerifiedThresholdComparisonData(corpus, householdSize);

  if (!verified) {
    return {
      outcome: "blocked",
      message: MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
    };
  }

  const publishedThresholdCents =
    verified.threshold.annualIncomeLimitCents;
  const relation =
    combinedAnnualizedCents < publishedThresholdCents
      ? "below"
      : combinedAnnualizedCents > publishedThresholdCents
        ? "above"
        : "equal";
  const neutralStatement =
    relation === "equal"
      ? "The confirmed annualised amount is numerically equal to the displayed published threshold."
      : `The confirmed annualised amount is numerically ${relation} the displayed published threshold.`;

  return {
    outcome: "available",
    householdSize,
    combinedAnnualizedCents,
    publishedThresholdCents,
    relation,
    mathematicalComparison: `${combinedAnnualizedCents} cents ${
      relation === "below" ? "<" : relation === "above" ? ">" : "="
    } ${publishedThresholdCents} cents`,
    neutralStatement,
    sourceVersion: verified.sourceVersion,
    effectiveDate: verified.effectiveDate,
    citationId: verified.citation.citationId,
  };
}

export type UnderstandProgress = {
  profileComplete: boolean;
  householdSizeConfirmed: boolean;
  calculationComplete: boolean;
  calculationCurrent: boolean;
  verifiedRuleDataAvailable: boolean;
  ruleReviewComplete: boolean;
  hasUnresolvedRuleDataErrors: boolean;
  understandComplete: boolean;
};

export function getUnderstandProgress(
  profile: ProfileSession | null,
  session: UnderstandSession | null,
  corpus: RuleCorpus,
): UnderstandProgress {
  const profileComplete = isCompletedProfileSession(profile);
  const expectedFingerprint = profileComplete
    ? createProfileFingerprint(profile)
    : null;
  const calculationCurrent = Boolean(
    profileComplete &&
      profile &&
      session &&
      !session.profileStale &&
      session.profileFingerprint === expectedFingerprint &&
      session.calculation?.profileFingerprint === expectedFingerprint &&
      session.calculation &&
      isStoredCalculationValidForProfile(profile, session.calculation),
  );
  const calculationComplete = Boolean(session?.calculation) && calculationCurrent;
  const householdSizeConfirmed = session?.householdSize !== null && Boolean(session);
  const corpusCurrent = Boolean(
    session &&
      session.programIdentifier === corpus.programIdentifier &&
      session.corpusId === corpus.corpusId &&
      session.corpusVersion === corpus.sourceVersion,
  );
  const verifiedRuleDataAvailable = Boolean(
    corpusCurrent &&
      session?.householdSize &&
      getVerifiedThresholdComparisonData(
        corpus,
        session.householdSize.value,
      ),
  );
  const ruleReviewComplete = Boolean(
    session?.ruleReviewState === "complete" &&
      session.thresholdReviewCompletedAt &&
      verifiedRuleDataAvailable,
  );
  const hasUnresolvedRuleDataErrors = !verifiedRuleDataAvailable;
  const understandComplete = Boolean(
    profileComplete &&
      householdSizeConfirmed &&
      calculationComplete &&
      calculationCurrent &&
      !hasUnresolvedRuleDataErrors &&
      ruleReviewComplete,
  );

  return {
    profileComplete,
    householdSizeConfirmed,
    calculationComplete,
    calculationCurrent,
    verifiedRuleDataAvailable,
    ruleReviewComplete,
    hasUnresolvedRuleDataErrors,
    understandComplete,
  };
}
