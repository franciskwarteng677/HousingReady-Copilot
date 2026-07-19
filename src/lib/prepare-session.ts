import { frozen2026MtspCorpus } from "@/data/rules";
import {
  createProfileFingerprint,
  isCompletedProfileSession,
} from "@/lib/profile-fingerprint";
import type { ProfileSession } from "@/lib/profile-schema";
import {
  PREPARE_DOCUMENT_CATEGORY_IDS,
  prepareDocumentCategoryIdSchema,
  prepareSessionSchema,
  type PrepareDocumentCategoryId,
  type PrepareSession,
  type PrepareWorkflowBinding,
} from "@/lib/prepare-schema";
import type { RuleCorpus } from "@/lib/rules-schema";
import type { UnderstandSession } from "@/lib/understand-schema";
import { getUnderstandProgress } from "@/lib/understand-state";

export const PREPARE_SESSION_KEY = "housingready:prepare:v1";
export const PREPARE_UPDATED_EVENT = "housingready:prepare-updated";

export const PREPARE_REVIEW_REQUIREMENT_IDS = [
  ...PREPARE_DOCUMENT_CATEGORY_IDS,
  "missing-or-expired",
] as const;

export type PrepareReviewRequirementId =
  (typeof PREPARE_REVIEW_REQUIREMENT_IDS)[number];

export type PrepareReviewProgress = {
  sessionCurrent: boolean;
  reviewedDocumentCount: number;
  completedReviewCount: number;
  totalReviewCount: 4;
  missingOrExpiredReviewed: boolean;
  pendingReviewIds: PrepareReviewRequirementId[];
  allReviewsComplete: boolean;
  packetReady: boolean;
};

function bindingsMatch(
  first: PrepareWorkflowBinding,
  second: PrepareWorkflowBinding,
): boolean {
  return (
    first.profileRevision === second.profileRevision &&
    first.profileFingerprint === second.profileFingerprint &&
    first.understandAcknowledgedAt === second.understandAcknowledgedAt &&
    first.householdSize === second.householdSize &&
    first.calculationInputFingerprint ===
      second.calculationInputFingerprint &&
    first.thresholdSourceId === second.thresholdSourceId &&
    first.thresholdSourceVersion === second.thresholdSourceVersion
  );
}

function bindingFromUnderstand(
  understand: UnderstandSession,
): PrepareWorkflowBinding | null {
  const acknowledgement = understand.reviewAcknowledgement;

  if (
    !understand.understandComplete ||
    understand.profileStale ||
    understand.ruleReviewState !== "complete" ||
    !acknowledgement
  ) {
    return null;
  }

  return {
    profileRevision: acknowledgement.profileRevision,
    profileFingerprint: acknowledgement.profileFingerprint,
    understandAcknowledgedAt: acknowledgement.acknowledgedAt,
    householdSize: acknowledgement.householdSize,
    calculationInputFingerprint:
      acknowledgement.calculationInputFingerprint,
    thresholdSourceId: acknowledgement.thresholdSourceId,
    thresholdSourceVersion: acknowledgement.thresholdSourceVersion,
  };
}

export function getCurrentPrepareWorkflowBinding(
  profile: ProfileSession,
  understand: UnderstandSession,
  corpus: RuleCorpus = frozen2026MtspCorpus,
): PrepareWorkflowBinding | null {
  const understandProgress = getUnderstandProgress(
    profile,
    understand,
    corpus,
  );
  const binding = bindingFromUnderstand(understand);
  const profileFingerprint = createProfileFingerprint(profile);

  if (
    !isCompletedProfileSession(profile) ||
    !understandProgress.understandComplete ||
    !binding ||
    binding.profileRevision !== profile.revision ||
    binding.profileFingerprint !== profileFingerprint
  ) {
    return null;
  }

  return binding;
}

export function createPrepareSession(
  profile: ProfileSession,
  understand: UnderstandSession,
  createdAt = new Date().toISOString(),
  corpus: RuleCorpus = frozen2026MtspCorpus,
): PrepareSession {
  const binding = getCurrentPrepareWorkflowBinding(
    profile,
    understand,
    corpus,
  );

  if (!binding) {
    throw new Error(
      "Prepare review requires a completed current Profile and acknowledged Understand review.",
    );
  }

  return prepareSessionSchema.parse({
    version: 1,
    binding,
    documentReviews: {
      "identity-document": false,
      "income-documentation": false,
      "residency-documentation": false,
    },
    missingOrExpiredReviewed: false,
    createdAt,
    updatedAt: createdAt,
  });
}

export function savePrepareSession(
  storage: Storage,
  session: PrepareSession,
): void {
  storage.setItem(
    PREPARE_SESSION_KEY,
    JSON.stringify(prepareSessionSchema.parse(session)),
  );
}

export function loadPrepareSession(storage: Storage): PrepareSession | null {
  const serialized = storage.getItem(PREPARE_SESSION_KEY);
  if (!serialized) {
    return null;
  }

  try {
    return prepareSessionSchema.parse(JSON.parse(serialized));
  } catch {
    storage.removeItem(PREPARE_SESSION_KEY);
    return null;
  }
}

export function isPrepareSessionCurrent(
  profile: ProfileSession,
  understand: UnderstandSession,
  session: PrepareSession,
  corpus: RuleCorpus = frozen2026MtspCorpus,
): boolean {
  const expectedBinding = getCurrentPrepareWorkflowBinding(
    profile,
    understand,
    corpus,
  );

  return Boolean(
    expectedBinding && bindingsMatch(session.binding, expectedBinding),
  );
}

export function loadCurrentPrepareSession(
  storage: Storage,
  profile: ProfileSession,
  understand: UnderstandSession,
  corpus: RuleCorpus = frozen2026MtspCorpus,
): PrepareSession | null {
  const session = loadPrepareSession(storage);

  if (!session) {
    return null;
  }

  if (!isPrepareSessionCurrent(profile, understand, session, corpus)) {
    storage.removeItem(PREPARE_SESSION_KEY);
    return null;
  }

  return session;
}

export function setPrepareDocumentReview(
  session: PrepareSession,
  categoryId: PrepareDocumentCategoryId,
  reviewed: boolean,
  updatedAt = new Date().toISOString(),
): PrepareSession {
  const parsedCategoryId = prepareDocumentCategoryIdSchema.parse(categoryId);

  return prepareSessionSchema.parse({
    ...session,
    documentReviews: {
      ...session.documentReviews,
      [parsedCategoryId]: reviewed,
    },
    updatedAt,
  });
}

export function setMissingOrExpiredReview(
  session: PrepareSession,
  reviewed: boolean,
  updatedAt = new Date().toISOString(),
): PrepareSession {
  return prepareSessionSchema.parse({
    ...session,
    missingOrExpiredReviewed: reviewed,
    updatedAt,
  });
}

export function getPrepareReviewProgress(
  profile: ProfileSession,
  understand: UnderstandSession,
  session: PrepareSession | null,
  corpus: RuleCorpus = frozen2026MtspCorpus,
): PrepareReviewProgress {
  const sessionCurrent = Boolean(
    session && isPrepareSessionCurrent(profile, understand, session, corpus),
  );
  const currentSession = sessionCurrent ? session : null;
  const reviewedDocumentIds = PREPARE_DOCUMENT_CATEGORY_IDS.filter(
    (categoryId) => currentSession?.documentReviews[categoryId] === true,
  );
  const missingOrExpiredReviewed =
    currentSession?.missingOrExpiredReviewed === true;
  const pendingReviewIds: PrepareReviewRequirementId[] = [
    ...PREPARE_DOCUMENT_CATEGORY_IDS.filter(
      (categoryId) => !reviewedDocumentIds.includes(categoryId),
    ),
    ...(missingOrExpiredReviewed
      ? []
      : (["missing-or-expired"] as const)),
  ];
  const completedReviewCount =
    reviewedDocumentIds.length + (missingOrExpiredReviewed ? 1 : 0);
  const allReviewsComplete = completedReviewCount === 4;

  return {
    sessionCurrent,
    reviewedDocumentCount: reviewedDocumentIds.length,
    completedReviewCount,
    totalReviewCount: 4,
    missingOrExpiredReviewed,
    pendingReviewIds,
    allReviewsComplete,
    packetReady: sessionCurrent && allReviewsComplete,
  };
}

export function invalidatePrepareSessionForProfileChange(
  storage: Storage,
  nextProfile: ProfileSession,
): boolean {
  const session = loadPrepareSession(storage);
  if (!session) {
    return false;
  }

  const profileCurrent =
    isCompletedProfileSession(nextProfile) &&
    session.binding.profileRevision === nextProfile.revision &&
    session.binding.profileFingerprint ===
      createProfileFingerprint(nextProfile);

  if (profileCurrent) {
    return false;
  }

  storage.removeItem(PREPARE_SESSION_KEY);
  return true;
}

export function invalidatePrepareSessionForUnderstandChange(
  storage: Storage,
  nextUnderstand: UnderstandSession,
): boolean {
  const session = loadPrepareSession(storage);
  if (!session) {
    return false;
  }

  const nextBinding = bindingFromUnderstand(nextUnderstand);
  if (nextBinding && bindingsMatch(session.binding, nextBinding)) {
    return false;
  }

  storage.removeItem(PREPARE_SESSION_KEY);
  return true;
}

export function clearPrepareSession(storage: Storage): void {
  storage.removeItem(PREPARE_SESSION_KEY);
}
