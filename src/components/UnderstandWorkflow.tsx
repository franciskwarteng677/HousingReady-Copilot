"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmedProfilePanel } from "@/components/ConfirmedProfilePanel";
import { HouseholdSizeControl } from "@/components/HouseholdSizeControl";
import { IncomeCalculationPanel } from "@/components/IncomeCalculationPanel";
import { ProgramScopePanel } from "@/components/ProgramScopePanel";
import { RulesAssistant } from "@/components/RulesAssistant";
import { ThresholdComparisonPanel } from "@/components/ThresholdComparisonPanel";
import {
  frozen2026MtspCorpus,
  getVerifiedThresholdComparisonData,
  MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
} from "@/data/rules";
import {
  createProfileFingerprint,
  isCompletedProfileSession,
} from "@/lib/profile-fingerprint";
import type { ProfileSession } from "@/lib/profile-schema";
import type { HouseholdSize } from "@/lib/rules-schema";
import {
  loadProfileSession,
  PROFILE_UPDATED_EVENT,
  SESSION_ACTIVE_EVENT,
  SESSION_DELETED_EVENT,
} from "@/lib/session";
import {
  confirmHouseholdSize,
  createUnderstandSession,
  loadUnderstandSession,
  saveUnderstandSession,
  UNDERSTAND_UPDATED_EVENT,
} from "@/lib/understand-session";
import {
  buildIncomeCalculation,
  describeCalculationUpdate,
  getUnderstandProgress,
  inputSnapshotFromCalculation,
  INCOME_INPUT_NO_CALL_MESSAGE,
} from "@/lib/understand-state";
import type {
  StoredIncomeCalculation,
  UnderstandSession,
} from "@/lib/understand-schema";

type AccessState = "checking" | "ready" | "redirecting";

export function UnderstandWorkflow() {
  const { push, replace } = useRouter();
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [profile, setProfile] = useState<ProfileSession | null>(null);
  const [session, setSession] = useState<UnderstandSession | null>(null);
  const [draftHouseholdSize, setDraftHouseholdSize] =
    useState<HouseholdSize>(1);
  const [calculationNoCall, setCalculationNoCall] = useState<string | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState(
    "Checking the confirmed Profile session.",
  );
  const [updateNotice, setUpdateNotice] = useState<string | null>(null);

  const progress = useMemo(
    () => getUnderstandProgress(profile, session, frozen2026MtspCorpus),
    [profile, session],
  );

  const persistSession = useCallback((nextSession: UnderstandSession) => {
    saveUnderstandSession(window.sessionStorage, nextSession);
    setSession(nextSession);
    window.dispatchEvent(new Event(UNDERSTAND_UPDATED_EVENT));
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));
  }, []);

  const synchronizeFromStorage = useCallback(
    (reason: "initial" | "profile-update") => {
      const loadedProfile = loadProfileSession(window.sessionStorage);

      if (!isCompletedProfileSession(loadedProfile)) {
        setProfile(null);
        setSession(null);
        setAccessState("redirecting");
        setAnnouncement(
          "A completed confirmed Profile is required. Returning to Profile.",
        );
        replace("/profile");
        return;
      }

      const existing = loadUnderstandSession(window.sessionStorage);
      const currentFingerprint = createProfileFingerprint(loadedProfile);
      const built = buildIncomeCalculation(
        loadedProfile,
        new Date().toISOString(),
      );
      const previousInputs = existing?.calculation
        ? inputSnapshotFromCalculation(existing.calculation)
        : existing?.previousCalculationInputs ?? null;
      const profileChanged = Boolean(
        existing &&
          (existing.profileStale ||
            existing.profileFingerprint !== currentFingerprint),
      );
      let calculation: StoredIncomeCalculation | null = null;

      if (built.outcome === "calculated") {
        // sessionStorage is untrusted. Always use the freshly re-derived
        // integer-cent result, never a previously stored result value.
        calculation = built.calculation;
        setCalculationNoCall(null);

        if (profileChanged) {
          const notice = describeCalculationUpdate(
            previousInputs,
            built.inputSnapshot,
          );
          setUpdateNotice(notice);
          setAnnouncement(notice);
        } else if (reason === "initial") {
          setAnnouncement(
            "Confirmed Profile loaded and deterministic calculation completed.",
          );
        }
      } else {
        setCalculationNoCall(built.message);
        if (profileChanged) {
          setUpdateNotice(
            "The prior calculation was invalidated because the confirmed Profile changed. A current calculation cannot be completed from the available confirmed inputs.",
          );
        }
        setAnnouncement("The deterministic calculation could not be completed.");
      }

      const householdSize = existing?.householdSize ?? null;
      const verifiedThreshold = householdSize
        ? getVerifiedThresholdComparisonData(
            frozen2026MtspCorpus,
            householdSize.value,
          )
        : null;
      const canPreserveRuleReview = Boolean(
        verifiedThreshold &&
          existing?.ruleReviewState === "complete" &&
          existing.thresholdReviewCompletedAt &&
          !profileChanged &&
          existing.corpusId === frozen2026MtspCorpus.corpusId &&
          existing.corpusVersion === frozen2026MtspCorpus.sourceVersion &&
          existing.calculation?.inputFingerprint === calculation?.inputFingerprint,
      );
      const now = new Date().toISOString();
      const nextSession = createUnderstandSession({
        profile: loadedProfile,
        householdSize,
        calculation,
        ruleReviewState: verifiedThreshold
          ? canPreserveRuleReview
            ? "complete"
            : "pending-review"
          : "blocked-missing-verified-data",
        thresholdReviewCompletedAt: canPreserveRuleReview
          ? existing?.thresholdReviewCompletedAt ?? null
          : null,
        updatedAt: now,
      });

      setProfile(loadedProfile);
      setDraftHouseholdSize(householdSize?.value ?? 1);
      persistSession(nextSession);
      setAccessState("ready");
    },
    [persistSession, replace],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => synchronizeFromStorage("initial"),
      0,
    );

    function handleProfileUpdate() {
      synchronizeFromStorage("profile-update");
    }

    function handleSessionDeleted() {
      setProfile(null);
      setSession(null);
      setUpdateNotice(null);
      setCalculationNoCall(null);
      setAccessState("redirecting");
      setAnnouncement("The temporary Understand session was deleted.");
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    window.addEventListener(SESSION_DELETED_EVENT, handleSessionDeleted);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
      window.removeEventListener(SESSION_DELETED_EVENT, handleSessionDeleted);
    };
  }, [synchronizeFromStorage]);

  function handleHouseholdSizeChange(value: HouseholdSize) {
    setDraftHouseholdSize(value);

    if (
      !profile ||
      !session ||
      !session.householdSize ||
      session.householdSize.value === value
    ) {
      return;
    }

    const nextSession = createUnderstandSession({
      profile,
      householdSize: null,
      calculation: session.calculation,
      ruleReviewState: "blocked-missing-verified-data",
      updatedAt: new Date().toISOString(),
    });
    persistSession(nextSession);
    setAnnouncement(
      `Household size changed to ${value}. Confirm the renter-provided value before continuing.`,
    );
  }

  function handleHouseholdSizeConfirm() {
    if (!profile || !session) {
      return;
    }

    const confirmedAt = new Date().toISOString();
    const householdSize = confirmHouseholdSize(
      draftHouseholdSize,
      confirmedAt,
    );
    const verifiedThreshold = getVerifiedThresholdComparisonData(
      frozen2026MtspCorpus,
      draftHouseholdSize,
    );
    const nextSession = createUnderstandSession({
      profile,
      householdSize,
      calculation: session.calculation,
      ruleReviewState: verifiedThreshold
        ? "pending-review"
        : "blocked-missing-verified-data",
      updatedAt: confirmedAt,
    });
    persistSession(nextSession);
    setAnnouncement(
      `Household size ${draftHouseholdSize} was explicitly confirmed. Downstream rule data was checked again.`,
    );
  }

  function handleRuleReviewConfirm() {
    if (!profile || !session?.householdSize || !session.calculation) {
      return;
    }

    const verifiedThreshold = getVerifiedThresholdComparisonData(
      frozen2026MtspCorpus,
      session.householdSize.value,
    );
    if (!verifiedThreshold) {
      setAnnouncement(MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE);
      return;
    }

    const completedAt = new Date().toISOString();
    const nextSession = createUnderstandSession({
      profile,
      householdSize: session.householdSize,
      calculation: session.calculation,
      ruleReviewState: "complete",
      thresholdReviewCompletedAt: completedAt,
      updatedAt: completedAt,
    });
    persistSession(nextSession);
    setAnnouncement("The verified published comparison was reviewed.");
  }

  if (accessState !== "ready" || !profile || !session) {
    return (
      <section
        aria-labelledby="understand-access-heading"
        className="rounded-2xl border border-line bg-white p-8 text-center shadow-card"
      >
        <LoaderCircle
          aria-hidden="true"
          size={28}
          className="mx-auto animate-spin text-brand"
        />
        <h2 id="understand-access-heading" className="mt-4 text-xl font-bold text-ink">
          {accessState === "redirecting"
            ? "Completed Profile required"
            : "Checking temporary Profile session"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" role="status">
          {announcement}
        </p>
      </section>
    );
  }

  let continueMessage =
    "Complete each Understand requirement before continuing to Prepare.";

  if (!progress.householdSizeConfirmed) {
    continueMessage = "Select and explicitly confirm household size.";
  } else if (!progress.calculationComplete || !progress.calculationCurrent) {
    continueMessage =
      "A current deterministic calculation is required before continuing.";
  } else if (progress.hasUnresolvedRuleDataErrors) {
    continueMessage = MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE;
  } else if (!progress.ruleReviewComplete) {
    continueMessage = "Review and confirm the verified published comparison.";
  } else if (progress.understandComplete) {
    continueMessage = "Understand requirements are complete. You can continue to Prepare.";
  }

  return (
    <div className="space-y-6">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {updateNotice ? (
        <div
          className="rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-bold leading-6 text-brand-dark"
          role="status"
        >
          {updateNotice}
        </div>
      ) : null}

      <ProgramScopePanel corpus={frozen2026MtspCorpus} />
      <ConfirmedProfilePanel profile={profile} />
      <HouseholdSizeControl
        draftValue={draftHouseholdSize}
        confirmed={session.householdSize}
        onChange={handleHouseholdSizeChange}
        onConfirm={handleHouseholdSizeConfirm}
      />
      <IncomeCalculationPanel
        calculation={session.calculation}
        noCallMessage={calculationNoCall ?? INCOME_INPUT_NO_CALL_MESSAGE}
      />
      <ThresholdComparisonPanel
        corpus={frozen2026MtspCorpus}
        householdSize={session.householdSize}
        calculation={session.calculation}
        ruleReviewComplete={progress.ruleReviewComplete}
        onConfirmReview={handleRuleReviewConfirm}
      />
      <RulesAssistant
        key={`${frozen2026MtspCorpus.corpusId}:${frozen2026MtspCorpus.sourceVersion}:${session.householdSize?.value ?? "unconfirmed"}`}
        corpus={frozen2026MtspCorpus}
        householdSize={session.householdSize?.value}
      />

      <nav
        aria-label="Stage navigation"
        className="rounded-2xl border border-line bg-white p-5 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6"
      >
        <Link
          href="/profile"
          className="link-focus inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 font-bold text-ink hover:bg-slate-50 sm:w-auto"
        >
          <ArrowLeft aria-hidden="true" size={19} />
          Back to Profile
        </Link>
        <div className="mt-4 sm:mt-0 sm:text-right">
          <p
            id="continue-prepare-help"
            className="max-w-xl text-sm leading-6 text-slate-600"
          >
            {continueMessage}
          </p>
          <button
            type="button"
            disabled={!progress.understandComplete}
            aria-describedby="continue-prepare-help"
            onClick={() => push("/prepare")}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 sm:w-auto"
          >
            {!progress.understandComplete ? (
              <LockKeyhole aria-hidden="true" size={18} />
            ) : null}
            Continue to Prepare
            <ArrowRight aria-hidden="true" size={19} />
          </button>
          {!progress.understandComplete ? (
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-amber-900">
              <CircleAlert aria-hidden="true" size={15} />
              Prepare remains locked
            </p>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
