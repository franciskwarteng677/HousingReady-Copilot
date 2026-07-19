import { frozen2026MtspCorpus } from "@/data/rules";
import { isCompletedProfileSession } from "@/lib/profile-fingerprint";
import type { ProfileSession } from "@/lib/profile-schema";
import type { RuleCorpus } from "@/lib/rules-schema";
import { loadProfileSession } from "@/lib/session";
import { loadCurrentUnderstandSession } from "@/lib/understand-session";
import {
  getUnderstandProgress,
  type UnderstandProgress,
} from "@/lib/understand-state";
import type { UnderstandSession } from "@/lib/understand-schema";

export type ProfileIncompleteWorkflowState = {
  status: "profile-incomplete";
  profile: ProfileSession | null;
  understand: null;
  understandProgress: UnderstandProgress;
  redirectTo: "/profile";
};

export type UnderstandIncompleteWorkflowState = {
  status: "understand-incomplete";
  profile: ProfileSession;
  understand: UnderstandSession | null;
  understandProgress: UnderstandProgress;
  redirectTo: "/understand";
};

export type ReadyWorkflowState = {
  status: "ready";
  profile: ProfileSession;
  understand: UnderstandSession;
  understandProgress: UnderstandProgress & {
    profileComplete: true;
    understandComplete: true;
  };
  redirectTo: null;
};

export type CanonicalWorkflowState =
  | ProfileIncompleteWorkflowState
  | UnderstandIncompleteWorkflowState
  | ReadyWorkflowState;

/**
 * Loads the single canonical persisted workflow snapshot used to decide
 * whether Prepare can render. It delegates Profile and Understand completion
 * to their existing validators and never creates a second completion rule.
 */
export function loadCanonicalWorkflowState(
  storage: Storage,
  corpus: RuleCorpus = frozen2026MtspCorpus,
): CanonicalWorkflowState {
  const loadedProfile = loadProfileSession(storage);

  if (!isCompletedProfileSession(loadedProfile)) {
    return {
      status: "profile-incomplete",
      profile: loadedProfile,
      understand: null,
      understandProgress: getUnderstandProgress(null, null, corpus),
      redirectTo: "/profile",
    };
  }

  const understand = loadCurrentUnderstandSession(
    storage,
    loadedProfile,
    corpus,
  );
  const understandProgress = getUnderstandProgress(
    loadedProfile,
    understand,
    corpus,
  );

  if (!understand?.understandComplete || !understandProgress.understandComplete) {
    return {
      status: "understand-incomplete",
      profile: loadedProfile,
      understand,
      understandProgress,
      redirectTo: "/understand",
    };
  }

  return {
    status: "ready",
    profile: loadedProfile,
    understand,
    understandProgress: {
      ...understandProgress,
      profileComplete: true,
      understandComplete: true,
    },
    redirectTo: null,
  };
}
