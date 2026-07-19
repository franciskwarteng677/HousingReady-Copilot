import {
  frozen2026MtspCorpus,
  getVerifiedThresholdComparisonData,
} from "@/data/rules";
import { createProfileFingerprint } from "@/lib/profile-fingerprint";
import { invalidatePrepareSessionForUnderstandChange } from "@/lib/prepare-session";
import type { ProfileSession } from "@/lib/profile-schema";
import type { HouseholdSize, RuleCorpus } from "@/lib/rules-schema";
import {
  getUnderstandProgress,
  inputSnapshotFromCalculation,
  isStoredCalculationValidForProfile,
} from "@/lib/understand-state";
import {
  understandSessionSchema,
  type CalculationInputSnapshot,
  type HouseholdSizeConfirmation,
  type StoredIncomeCalculation,
  type UnderstandReviewAcknowledgement,
  type UnderstandReviewInvalidationReason,
  type UnderstandRuleReviewState,
  type UnderstandSession,
} from "@/lib/understand-schema";

export const UNDERSTAND_SESSION_KEY = "housingready:understand:v2";
export const LEGACY_UNDERSTAND_SESSION_KEY = "housingready:understand:v1";
export const UNDERSTAND_UPDATED_EVENT = "housingready:understand-updated";

export type CreateUnderstandSessionInput = {
  profile: ProfileSession;
  householdSize: HouseholdSizeConfirmation | null;
  calculation: StoredIncomeCalculation | null;
  previousCalculationInputs?: CalculationInputSnapshot | null;
  profileStale?: boolean;
  ruleReviewState: UnderstandRuleReviewState;
  reviewAcknowledgement?: UnderstandReviewAcknowledgement | null;
  reviewInvalidationReason?: UnderstandReviewInvalidationReason | null;
  corpus?: RuleCorpus;
  updatedAt: string;
};

export function createUnderstandSession({
  profile,
  householdSize,
  calculation,
  previousCalculationInputs = null,
  profileStale = false,
  ruleReviewState,
  reviewAcknowledgement = null,
  reviewInvalidationReason = null,
  corpus = frozen2026MtspCorpus,
  updatedAt,
}: CreateUnderstandSessionInput): UnderstandSession {
  const profileFingerprint = createProfileFingerprint(profile);
  const provisional = understandSessionSchema.parse({
    version: 2,
    programIdentifier: corpus.programIdentifier,
    corpusId: corpus.corpusId,
    corpusVersion: corpus.sourceVersion,
    profileFingerprint,
    profileRevision: profile.revision,
    householdSize,
    calculation,
    previousCalculationInputs,
    profileStale,
    ruleReviewState,
    reviewAcknowledgement,
    reviewInvalidationReason,
    understandComplete: false,
    updatedAt,
  });
  const progress = getUnderstandProgress(profile, provisional, corpus);

  return understandSessionSchema.parse({
    ...provisional,
    understandComplete: progress.understandComplete,
  });
}

export function saveUnderstandSession(
  storage: Storage,
  session: UnderstandSession,
): void {
  const validated = understandSessionSchema.parse(session);
  invalidatePrepareSessionForUnderstandChange(storage, validated);
  storage.setItem(
    UNDERSTAND_SESSION_KEY,
    JSON.stringify(validated),
  );
}

export function loadUnderstandSession(
  storage: Storage,
): UnderstandSession | null {
  const serialized = storage.getItem(UNDERSTAND_SESSION_KEY);

  if (!serialized) {
    storage.removeItem(LEGACY_UNDERSTAND_SESSION_KEY);
    return null;
  }

  try {
    return understandSessionSchema.parse(JSON.parse(serialized));
  } catch {
    storage.removeItem(UNDERSTAND_SESSION_KEY);
    return null;
  }
}

export function loadCurrentUnderstandSession(
  storage: Storage,
  profile: ProfileSession,
  corpus: RuleCorpus = frozen2026MtspCorpus,
): UnderstandSession | null {
  const session = loadUnderstandSession(storage);
  const fingerprint = createProfileFingerprint(profile);

  if (
    !session ||
    session.programIdentifier !== corpus.programIdentifier ||
    session.corpusId !== corpus.corpusId ||
    session.corpusVersion !== corpus.sourceVersion ||
    session.profileStale ||
    session.profileRevision !== profile.revision ||
    session.profileFingerprint !== fingerprint ||
    session.calculation?.profileFingerprint !== fingerprint ||
    !session.calculation ||
    !isStoredCalculationValidForProfile(profile, session.calculation)
  ) {
    return null;
  }

  return session;
}

export function invalidateUnderstandSessionForProfileChange(
  storage: Storage,
  nextProfile: ProfileSession,
  updatedAt = new Date().toISOString(),
): boolean {
  const session = loadUnderstandSession(storage);
  if (!session) {
    return false;
  }

  const nextFingerprint = createProfileFingerprint(nextProfile);
  if (
    session.profileFingerprint === nextFingerprint &&
    session.profileRevision === nextProfile.revision &&
    !session.profileStale
  ) {
    return false;
  }

  const previousCalculationInputs = session.calculation
    ? inputSnapshotFromCalculation(session.calculation)
    : session.previousCalculationInputs;
  const staleSession = understandSessionSchema.parse({
    ...session,
    profileFingerprint: nextFingerprint,
    profileRevision: nextProfile.revision,
    calculation: null,
    previousCalculationInputs,
    profileStale: true,
    ruleReviewState:
      session.ruleReviewState === "blocked-missing-verified-data"
        ? "blocked-missing-verified-data"
        : "pending-review",
    reviewAcknowledgement: null,
    reviewInvalidationReason: "profile-changed",
    understandComplete: false,
    updatedAt,
  });

  saveUnderstandSession(storage, staleSession);
  return true;
}

export function clearUnderstandSession(storage: Storage): void {
  storage.removeItem(UNDERSTAND_SESSION_KEY);
  storage.removeItem(LEGACY_UNDERSTAND_SESSION_KEY);
}

export function confirmHouseholdSize(
  value: HouseholdSize,
  confirmedAt: string,
): HouseholdSizeConfirmation {
  return {
    value,
    confirmedAt,
  };
}

export function acknowledgeUnderstandReview(
  profile: ProfileSession,
  session: UnderstandSession,
  reviewedAt: string,
  corpus: RuleCorpus = frozen2026MtspCorpus,
): UnderstandSession {
  const profileFingerprint = createProfileFingerprint(profile);
  const householdSize = session.householdSize;
  const calculation = session.calculation;
  const verifiedThreshold = householdSize
    ? getVerifiedThresholdComparisonData(corpus, householdSize.value)
    : null;

  if (
    !householdSize ||
    !calculation ||
    !verifiedThreshold ||
    session.profileStale ||
    session.profileFingerprint !== profileFingerprint ||
    session.profileRevision !== profile.revision ||
    calculation.profileFingerprint !== profileFingerprint ||
    !isStoredCalculationValidForProfile(profile, calculation)
  ) {
    throw new Error(
      "A current Profile, calculation, household size, and verified threshold are required before acknowledgement.",
    );
  }

  const reviewAcknowledgement = {
    acknowledgedAt: reviewedAt,
    profileRevision: profile.revision,
    profileFingerprint,
    householdSize: householdSize.value,
    calculationInputFingerprint: calculation.inputFingerprint,
    thresholdSourceId: corpus.corpusId,
    thresholdSourceVersion: corpus.sourceVersion,
  } satisfies UnderstandReviewAcknowledgement;

  return createUnderstandSession({
    profile,
    householdSize,
    calculation,
    previousCalculationInputs: session.previousCalculationInputs,
    ruleReviewState: "complete",
    reviewAcknowledgement,
    reviewInvalidationReason: null,
    corpus,
    updatedAt: reviewedAt,
  });
}
