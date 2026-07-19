import { describe, expect, it } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import {
  frozen2026MtspCorpus,
  getThresholdForHouseholdSize,
  getVerifiedThresholdComparisonData,
} from "@/data/rules";
import type { HouseholdSize } from "@/lib/rules-schema";
import {
  buildIncomeCalculation,
  compareVerifiedThreshold,
} from "@/lib/understand-state";

const expected60PercentThresholds = [
  [1, 7_200_000],
  [2, 8_232_000],
  [3, 9_258_000],
  [4, 10_284_000],
  [5, 11_112_000],
  [6, 11_934_000],
  [7, 12_756_000],
  [8, 13_578_000],
] as const;

describe("FY 2026 standard 60% MTSP threshold mapping", () => {
  it.each(expected60PercentThresholds)(
    "maps household size %i to %i cents with the verified effective date",
    (householdSize, expectedCents) => {
      const threshold = getThresholdForHouseholdSize(
        frozen2026MtspCorpus,
        householdSize,
      );
      const verified = getVerifiedThresholdComparisonData(
        frozen2026MtspCorpus,
        householdSize,
      );

      expect(threshold).toMatchObject({
        householdSize,
        annualIncomeLimitCents: expectedCents,
        currency: "USD",
        verificationStatus: "verified_official",
      });
      expect(verified).toMatchObject({
        effectiveDate: "2026-05-01",
        threshold: {
          householdSize,
          annualIncomeLimitCents: expectedCents,
          verificationStatus: "verified_official",
        },
        citation: {
          sourceType: "official-hud-data",
          verificationStatus: "verified_official",
          effectiveDate: "2026-05-01",
        },
        officialSource: {
          primaryComparisonType: "standard-60-percent-mtsp",
          effectiveDate: "2026-05-01",
          pdfPage: 130,
        },
      });
    },
  );
});

describe("neutral published-threshold comparison", () => {
  it("compares the corrected $52,000.00 amount to $82,320.00 and exposes the exact difference", () => {
    const built = buildIncomeCalculation(
      makeCompleteIncomeProfile({ grossPay: "$1,700.00" }),
      "2026-07-19T12:00:00.000Z",
    );
    if (built.outcome !== "calculated") {
      throw new Error("Expected the corrected Profile to calculate.");
    }
    expect(built.calculation.combined.resultCents).toBe(5_200_000);

    const comparison = compareVerifiedThreshold(
      frozen2026MtspCorpus,
      2,
      built.calculation.combined.resultCents,
    );

    expect(comparison).toMatchObject({
      outcome: "available",
      householdSize: 2,
      combinedAnnualizedCents: 5_200_000,
      publishedThresholdCents: 8_232_000,
      differenceCents: 3_032_000,
      relation: "below",
      mathematicalComparison: "$52,000.00 < $82,320.00",
      neutralStatement:
        "The confirmed annualised amount is $30,320.00 below the displayed 60% MTSP reference threshold.",
      effectiveDate: "2026-05-01",
    });
    expect(8_232_000 - 5_200_000).toBe(3_032_000);
  });

  it("describes an above-threshold amount numerically without an eligibility conclusion", () => {
    const comparison = compareVerifiedThreshold(
      frozen2026MtspCorpus,
      2,
      9_000_000,
    );

    expect(comparison).toMatchObject({
      outcome: "available",
      combinedAnnualizedCents: 9_000_000,
      publishedThresholdCents: 8_232_000,
      differenceCents: 768_000,
      relation: "above",
      neutralStatement:
        "The confirmed annualised amount is $7,680.00 above the displayed 60% MTSP reference threshold.",
    });
    if (comparison.outcome !== "available") {
      throw new Error("Expected the verified comparison to be available.");
    }
    expect(comparison.neutralStatement).not.toMatch(
      /eligible|ineligible|qualif|approve|deny|pass|fail|score|rank/i,
    );
  });

  it("selects the requested household row rather than another household size", () => {
    for (const [size, expectedCents] of expected60PercentThresholds) {
      const comparison = compareVerifiedThreshold(
        frozen2026MtspCorpus,
        size as HouseholdSize,
        5_200_000,
      );

      expect(comparison).toMatchObject({
        outcome: "available",
        householdSize: size,
        publishedThresholdCents: expectedCents,
        effectiveDate: "2026-05-01",
      });
    }
  });
});
