import { describe, expect, it } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import {
  annualizeBiweeklyGrossPay,
  annualizeMonthlyBenefit,
  calculateAnnualizedIncome,
  calculateCombinedAnnualizedIncome,
  formatCurrencyFromCents,
  parseCurrencyToCents,
} from "@/lib/income-calculation";
import {
  buildIncomeCalculation,
  describeCalculationUpdate,
} from "@/lib/understand-state";

const CALCULATED_AT = "2026-07-18T12:30:00.000Z";

describe("decimal-safe annualized income arithmetic", () => {
  it("annualizes confirmed biweekly gross pay using 26 pay periods", () => {
    const grossPayCents = parseCurrencyToCents("$1,620.00");

    expect(annualizeBiweeklyGrossPay(grossPayCents)).toBe(4_212_000);
    expect(formatCurrencyFromCents(4_212_000)).toBe("$42,120.00");
  });

  it("annualizes a confirmed monthly benefit using 12 months", () => {
    const monthlyBenefitCents = parseCurrencyToCents("$650.00");

    expect(annualizeMonthlyBenefit(monthlyBenefitCents)).toBe(780_000);
    expect(formatCurrencyFromCents(780_000)).toBe("$7,800.00");
  });

  it("combines employment and benefit annualizations transparently", () => {
    const calculation = calculateAnnualizedIncome({
      grossPayCents: 162_000,
      payFrequency: "Biweekly",
      monthlyBenefitCents: 65_000,
      calculatedAt: CALCULATED_AT,
    });

    expect(
      calculateCombinedAnnualizedIncome(
        calculation.employment.resultCents,
        calculation.benefits.resultCents,
      ),
    ).toBe(4_992_000);
    expect(calculation).toMatchObject({
      calculatedAt: CALCULATED_AT,
      employment: {
        formula: "confirmed gross pay × 26 pay periods",
        substitution: "$1,620.00 × 26",
        resultCents: 4_212_000,
      },
      benefits: {
        formula: "confirmed monthly benefit × 12 months",
        substitution: "$650.00 × 12",
        resultCents: 780_000,
      },
      combined: {
        formula: "annualized gross pay + annualized benefits",
        substitution: "$42,120.00 + $7,800.00",
        resultCents: 4_992_000,
      },
    });
    expect(formatCurrencyFromCents(calculation.combined.resultCents)).toBe(
      "$49,920.00",
    );
  });

  it("uses integer cents without floating-point currency drift", () => {
    const calculation = calculateAnnualizedIncome({
      grossPayCents: parseCurrencyToCents("$0.10"),
      payFrequency: "biweekly",
      monthlyBenefitCents: parseCurrencyToCents("$0.29"),
      calculatedAt: CALCULATED_AT,
    });

    expect(calculation.employment.resultCents).toBe(260);
    expect(calculation.benefits.resultCents).toBe(348);
    expect(calculation.combined.resultCents).toBe(608);
    expect(formatCurrencyFromCents(calculation.combined.resultCents)).toBe(
      "$6.08",
    );
    expect(() => parseCurrencyToCents("$0.001")).toThrow(
      "Invalid US-dollar amount",
    );
  });
});

describe("Profile-driven calculation updates", () => {
  it("recalculates when corrected confirmed Profile data changes", () => {
    const original = buildIncomeCalculation(
      makeCompleteIncomeProfile(),
      CALCULATED_AT,
    );
    const corrected = buildIncomeCalculation(
      makeCompleteIncomeProfile({
        grossPay: "$1,700.00",
        updatedAt: "2026-07-18T13:00:00.000Z",
      }),
      "2026-07-18T13:05:00.000Z",
    );

    expect(original.outcome).toBe("calculated");
    expect(corrected.outcome).toBe("calculated");
    if (original.outcome !== "calculated" || corrected.outcome !== "calculated") {
      throw new Error("Expected both deterministic calculations to succeed.");
    }

    expect(original.calculation.combined.resultCents).toBe(4_992_000);
    expect(corrected.calculation.combined.resultCents).toBe(5_200_000);
    expect(corrected.calculation.inputFingerprint).not.toBe(
      original.calculation.inputFingerprint,
    );
    expect(
      describeCalculationUpdate(
        original.inputSnapshot,
        corrected.inputSnapshot,
      ),
    ).toBe(
      "Annualised income calculation updated because confirmed gross pay changed from $1,620.00 to $1,700.00.",
    );
  });

  it("abstains when a required confirmed calculation input is missing", () => {
    const result = buildIncomeCalculation(
      makeCompleteIncomeProfile({ omitFields: ["monthlyBenefit"] }),
      CALCULATED_AT,
    );

    expect(result).toEqual({
      outcome: "no-call",
      message:
        "The deterministic calculation needs exactly one confirmed gross pay, one confirmed biweekly pay frequency, and one confirmed monthly benefit. Review or correct the Profile before calculating.",
    });
  });
});
