import { describe, expect, it } from "vitest";
import {
  makeCompleteIncomeProfile,
  makeVerifiedRuleCorpus,
} from "@/__tests__/fixtures";
import { frozen2026MtspCorpus } from "@/data/rules";
import { createProfileFingerprint } from "@/lib/profile-fingerprint";
import {
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

const CREATED_AT = "2026-07-18T14:00:00.000Z";

function expectCalculation(
  profile: ReturnType<typeof makeCompleteIncomeProfile>,
) {
  const result = buildIncomeCalculation(profile, CREATED_AT);
  if (result.outcome !== "calculated") {
    throw new Error("The complete income Profile fixture should calculate.");
  }
  return result.calculation;
}

describe("Understand temporary session", () => {
  it("records household size only through explicit confirmation", () => {
    const confirmation = confirmHouseholdSize(3, CREATED_AT);

    expect(confirmation).toEqual({
      value: 3,
      confirmedAt: CREATED_AT,
    });
  });

  it("invalidates a stale calculation when the confirmed Profile changes", () => {
    const originalProfile = makeCompleteIncomeProfile();
    const originalCalculation = expectCalculation(originalProfile);
    const originalSession = createUnderstandSession({
      profile: originalProfile,
      householdSize: confirmHouseholdSize(2, CREATED_AT),
      calculation: originalCalculation,
      ruleReviewState: "blocked-missing-verified-data",
      updatedAt: CREATED_AT,
    });
    saveUnderstandSession(window.sessionStorage, originalSession);

    const correctedProfile = makeCompleteIncomeProfile({
      grossPay: "$1,700.00",
      updatedAt: "2026-07-18T15:00:00.000Z",
    });
    const invalidated = invalidateUnderstandSessionForProfileChange(
      window.sessionStorage,
      correctedProfile,
      "2026-07-18T15:01:00.000Z",
    );
    const staleSession = loadUnderstandSession(window.sessionStorage);

    expect(invalidated).toBe(true);
    expect(staleSession).toMatchObject({
      profileFingerprint: createProfileFingerprint(correctedProfile),
      profileStale: true,
      calculation: null,
      understandComplete: false,
      thresholdReviewCompletedAt: null,
      previousCalculationInputs: {
        grossPayValue: "$1,620.00",
        payFrequencyValue: "Biweekly",
        monthlyBenefitValue: "$650.00",
      },
    });
    expect(
      loadCurrentUnderstandSession(window.sessionStorage, correctedProfile),
    ).toBeNull();
  });

  it("does not invalidate a session when the confirmed Profile projection is unchanged", () => {
    const profile = makeCompleteIncomeProfile();
    const session = createUnderstandSession({
      profile,
      householdSize: null,
      calculation: expectCalculation(profile),
      ruleReviewState: "blocked-missing-verified-data",
      updatedAt: CREATED_AT,
    });
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
    const session = createUnderstandSession({
      profile,
      householdSize: confirmHouseholdSize(2, CREATED_AT),
      calculation: expectCalculation(profile),
      ruleReviewState: "blocked-missing-verified-data",
      updatedAt: CREATED_AT,
    });
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
    const session = createUnderstandSession({
      profile,
      householdSize: confirmHouseholdSize(2, CREATED_AT),
      calculation: expectCalculation(profile),
      ruleReviewState: "blocked-missing-verified-data",
      updatedAt: CREATED_AT,
    });
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
    const session = createUnderstandSession({
      profile,
      householdSize: confirmHouseholdSize(2, CREATED_AT),
      calculation: expectCalculation(profile),
      ruleReviewState: "blocked-missing-verified-data",
      updatedAt: CREATED_AT,
    });
    const serialized = JSON.stringify(session);

    expect(serialized).not.toContain("sourceText");
    expect(serialized).not.toContain("citationPassages");
    expect(serialized).not.toContain("Ignore the rules");
    expect(serialized).not.toContain("data:application/pdf");
  });
});

describe("Understand completion gate", () => {
  it("remains incomplete until household, current calculation, verified data, and review are complete", () => {
    const profile = makeCompleteIncomeProfile();
    const calculation = expectCalculation(profile);
    const verifiedCorpus = makeVerifiedRuleCorpus();
    const householdSize = confirmHouseholdSize(2, CREATED_AT);

    const withoutHousehold = createUnderstandSession({
      profile,
      householdSize: null,
      calculation,
      ruleReviewState: "blocked-missing-verified-data",
      corpus: verifiedCorpus,
      updatedAt: CREATED_AT,
    });
    expect(
      getUnderstandProgress(profile, withoutHousehold, verifiedCorpus)
        .understandComplete,
    ).toBe(false);

    const pendingReview = createUnderstandSession({
      profile,
      householdSize,
      calculation,
      ruleReviewState: "pending-review",
      corpus: verifiedCorpus,
      updatedAt: CREATED_AT,
    });
    expect(
      getUnderstandProgress(profile, pendingReview, verifiedCorpus),
    ).toMatchObject({
      profileComplete: true,
      householdSizeConfirmed: true,
      calculationComplete: true,
      calculationCurrent: true,
      verifiedRuleDataAvailable: true,
      ruleReviewComplete: false,
      understandComplete: false,
    });

    const complete = createUnderstandSession({
      profile,
      householdSize,
      calculation,
      ruleReviewState: "complete",
      thresholdReviewCompletedAt: CREATED_AT,
      corpus: verifiedCorpus,
      updatedAt: CREATED_AT,
    });
    expect(complete.understandComplete).toBe(true);
    expect(getUnderstandProgress(profile, complete, verifiedCorpus)).toMatchObject(
      {
        ruleReviewComplete: true,
        hasUnresolvedRuleDataErrors: false,
        understandComplete: true,
      },
    );
  });

  it("stays blocked when the organizer-provided official threshold data is missing", () => {
    const profile = makeCompleteIncomeProfile();
    const session = createUnderstandSession({
      profile,
      householdSize: confirmHouseholdSize(2, CREATED_AT),
      calculation: expectCalculation(profile),
      ruleReviewState: "blocked-missing-verified-data",
      updatedAt: CREATED_AT,
    });

    expect(getUnderstandProgress(profile, session, frozen2026MtspCorpus)).toMatchObject(
      {
        verifiedRuleDataAvailable: false,
        hasUnresolvedRuleDataErrors: true,
        ruleReviewComplete: false,
        understandComplete: false,
      },
    );
  });
});
