import { describe, expect, it } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import { frozen2026MtspCorpus } from "@/data/rules";
import { applyConfirmedProfileCorrection } from "@/lib/profile-corrections";
import { createProfileFingerprint } from "@/lib/profile-fingerprint";
import {
  acknowledgeUnderstandReview,
  confirmHouseholdSize,
  createUnderstandSession,
  invalidateUnderstandSessionForProfileChange,
  loadCurrentUnderstandSession,
  loadUnderstandSession,
  saveUnderstandSession,
} from "@/lib/understand-session";
import {
  buildIncomeCalculation,
  getUnderstandProgress,
} from "@/lib/understand-state";
import type { ProfileSession } from "@/lib/profile-schema";

const CREATED_AT = "2026-07-18T14:00:00.000Z";
const REVIEWED_AT = "2026-07-18T14:05:00.000Z";

function expectCalculation(profile: ProfileSession) {
  const result = buildIncomeCalculation(profile, CREATED_AT);
  if (result.outcome !== "calculated") {
    throw new Error("The complete income Profile fixture should calculate.");
  }
  return result.calculation;
}

function makePendingUnderstandSession(
  profile: ProfileSession,
  householdSize = 2 as const,
) {
  return createUnderstandSession({
    profile,
    householdSize: confirmHouseholdSize(householdSize, CREATED_AT),
    calculation: expectCalculation(profile),
    ruleReviewState: "pending-review",
    updatedAt: CREATED_AT,
  });
}

function makeCompletedUnderstandSession(profile: ProfileSession) {
  return acknowledgeUnderstandReview(
    profile,
    makePendingUnderstandSession(profile),
    REVIEWED_AT,
  );
}

describe("Understand temporary session", () => {
  it("records household size only through explicit confirmation", () => {
    expect(confirmHouseholdSize(3, CREATED_AT)).toEqual({
      value: 3,
      confirmedAt: CREATED_AT,
    });
  });

  it("invalidates the calculation and acknowledgement when the confirmed Profile changes", () => {
    const originalProfile = makeCompleteIncomeProfile();
    saveUnderstandSession(
      window.sessionStorage,
      makeCompletedUnderstandSession(originalProfile),
    );

    const correction = applyConfirmedProfileCorrection(
      originalProfile,
      "employment.grossPay.currentPeriod",
      "$1,700.00",
      "2026-07-18T15:00:00.000Z",
    );
    if (!correction.ok) {
      throw new Error(correction.error);
    }

    const invalidated = invalidateUnderstandSessionForProfileChange(
      window.sessionStorage,
      correction.session,
      "2026-07-18T15:01:00.000Z",
    );
    const staleSession = loadUnderstandSession(window.sessionStorage);

    expect(invalidated).toBe(true);
    expect(staleSession).toMatchObject({
      profileFingerprint: createProfileFingerprint(correction.session),
      profileRevision: 2,
      profileStale: true,
      calculation: null,
      ruleReviewState: "pending-review",
      reviewAcknowledgement: null,
      reviewInvalidationReason: "profile-changed",
      understandComplete: false,
      previousCalculationInputs: {
        grossPayValue: "$1,620.00",
        payFrequencyValue: "Biweekly",
        monthlyBenefitValue: "$650.00",
      },
    });
    expect(
      loadCurrentUnderstandSession(window.sessionStorage, correction.session),
    ).toBeNull();
  });

  it("does not invalidate a session when neither Profile values nor revision changed", () => {
    const profile = makeCompleteIncomeProfile();
    const session = makePendingUnderstandSession(profile);
    saveUnderstandSession(window.sessionStorage, session);

    expect(
      invalidateUnderstandSessionForProfileChange(
        window.sessionStorage,
        makeCompleteIncomeProfile({
          updatedAt: "2026-07-18T16:00:00.000Z",
        }),
      ),
    ).toBe(false);
    expect(loadUnderstandSession(window.sessionStorage)?.profileStale).toBe(
      false,
    );
  });

  it("rejects a stored Understand review from a different corpus version", () => {
    const profile = makeCompleteIncomeProfile();
    const session = makePendingUnderstandSession(profile);
    saveUnderstandSession(window.sessionStorage, {
      ...session,
      corpusVersion: "superseded-corpus-version",
    });

    expect(
      loadCurrentUnderstandSession(window.sessionStorage, profile),
    ).toBeNull();
  });

  it("rejects a stored calculation whose deterministic result was altered", () => {
    const profile = makeCompleteIncomeProfile();
    const session = makePendingUnderstandSession(profile);
    if (!session.calculation) {
      throw new Error("Expected a deterministic calculation fixture.");
    }
    saveUnderstandSession(window.sessionStorage, {
      ...session,
      calculation: {
        ...session.calculation,
        combined: {
          ...session.calculation.combined,
          resultCents: session.calculation.combined.resultCents + 1,
        },
      },
    });

    expect(
      loadCurrentUnderstandSession(window.sessionStorage, profile),
    ).toBeNull();
  });

  it("serializes only allowlisted Understand state", () => {
    const profile = makeCompleteIncomeProfile();
    const serialized = JSON.stringify(makeCompletedUnderstandSession(profile));

    expect(serialized).not.toContain("sourceText");
    expect(serialized).not.toContain("citationPassages");
    expect(serialized).not.toContain("Ignore the rules");
    expect(serialized).not.toContain("data:application/pdf");
  });
});

describe("Understand completion gate", () => {
  it("cannot complete before explicit acknowledgement", () => {
    const profile = makeCompleteIncomeProfile();
    const pendingReview = makePendingUnderstandSession(profile);

    expect(pendingReview.reviewAcknowledgement).toBeNull();
    expect(pendingReview.understandComplete).toBe(false);
    expect(
      getUnderstandProgress(profile, pendingReview, frozen2026MtspCorpus),
    ).toMatchObject({
      profileComplete: true,
      householdSizeConfirmed: true,
      calculationComplete: true,
      calculationCurrent: true,
      verifiedRuleDataAvailable: true,
      ruleReviewComplete: false,
      hasUnresolvedRuleDataErrors: false,
      understandComplete: false,
    });
  });

  it("completes only after acknowledgement and persists its exact review metadata", () => {
    const profile = makeCompleteIncomeProfile();
    const complete = makeCompletedUnderstandSession(profile);

    expect(complete.reviewAcknowledgement).toEqual({
      acknowledgedAt: REVIEWED_AT,
      profileRevision: profile.revision,
      profileFingerprint: createProfileFingerprint(profile),
      householdSize: 2,
      calculationInputFingerprint: complete.calculation?.inputFingerprint,
      thresholdSourceId: frozen2026MtspCorpus.corpusId,
      thresholdSourceVersion: frozen2026MtspCorpus.sourceVersion,
    });
    expect(complete.understandComplete).toBe(true);
    expect(
      getUnderstandProgress(profile, complete, frozen2026MtspCorpus),
    ).toMatchObject({
      ruleReviewComplete: true,
      hasUnresolvedRuleDataErrors: false,
      understandComplete: true,
    });
  });

  it("allows an above-threshold amount to complete after review", () => {
    const profile = makeCompleteIncomeProfile({ grossPay: "$3,000.00" });
    const complete = makeCompletedUnderstandSession(profile);

    expect(complete.calculation?.combined.resultCents).toBe(8_580_000);
    expect(complete.calculation?.combined.resultCents).toBeGreaterThan(
      8_232_000,
    );
    expect(complete.understandComplete).toBe(true);
  });
});
