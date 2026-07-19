export const BIWEEKLY_PAY_PERIODS_PER_YEAR = 26;
export const MONTHS_PER_YEAR = 12;
export const INCOME_CALCULATION_VERSION = "income-annualization-v1";

export const INCOME_CALCULATION_DISCLAIMER =
  "Annualised income is an application-preparation calculation. It is not a determination of countable income or program eligibility.";

export type AnnualizedIncomeInput = {
  grossPayCents: number;
  payFrequency: string;
  monthlyBenefitCents: number;
  calculatedAt: string;
};

export type AnnualizedCalculationLine = {
  inputAmountCents: number;
  periodsPerYear: number;
  formula: string;
  substitution: string;
  resultCents: number;
};

export type AnnualizedIncomeCalculation = {
  calculationVersion: typeof INCOME_CALCULATION_VERSION;
  calculatedAt: string;
  inputFingerprint: string;
  inputs: {
    grossPayCents: number;
    payFrequency: "Biweekly";
    monthlyBenefitCents: number;
  };
  employment: AnnualizedCalculationLine;
  benefits: AnnualizedCalculationLine;
  combined: {
    formula: string;
    substitution: string;
    resultCents: number;
  };
  disclaimer: typeof INCOME_CALCULATION_DISCLAIMER;
};

function assertCurrencyCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer in cents.`);
  }
}

function multiplyCurrencyCents(
  amountCents: number,
  multiplier: number,
  label: string,
): number {
  assertCurrencyCents(amountCents, label);
  const result = amountCents * multiplier;

  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`${label} exceeds the supported currency range.`);
  }

  return result;
}

export function addCurrencyCents(
  firstAmountCents: number,
  secondAmountCents: number,
): number {
  assertCurrencyCents(firstAmountCents, "First amount");
  assertCurrencyCents(secondAmountCents, "Second amount");
  const result = firstAmountCents + secondAmountCents;

  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Combined amount exceeds the supported currency range.");
  }

  return result;
}

/**
 * Parses a nonnegative US-dollar string without using floating-point arithmetic.
 * Accepted examples include "$1,620.00", "650", and "0.5".
 */
export function parseCurrencyToCents(value: string): number {
  const normalized = value.trim();
  const match = /^\$?((?:0|[1-9]\d*)|(?:[1-9]\d{0,2}(?:,\d{3})+))(?:\.(\d{1,2}))?$/.exec(
    normalized,
  );

  if (!match) {
    throw new TypeError(`Invalid US-dollar amount: ${value}`);
  }

  const wholeDollars = BigInt((match[1] ?? "0").replaceAll(",", ""));
  const fractionalDigits = match[2] ?? "";
  const cents = BigInt(fractionalDigits.padEnd(2, "0"));
  const totalCents = wholeDollars * BigInt(100) + cents;

  if (totalCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Currency amount exceeds the supported range.");
  }

  return Number(totalCents);
}

export function formatCurrencyFromCents(amountCents: number): string {
  assertCurrencyCents(amountCents, "Amount");
  const wholeDollars = Math.floor(amountCents / 100);
  const cents = amountCents % 100;

  return `$${wholeDollars.toLocaleString("en-US")}.${cents
    .toString()
    .padStart(2, "0")}`;
}

export function annualizeBiweeklyGrossPay(grossPayCents: number): number {
  return multiplyCurrencyCents(
    grossPayCents,
    BIWEEKLY_PAY_PERIODS_PER_YEAR,
    "Biweekly gross pay",
  );
}

export function annualizeMonthlyBenefit(monthlyBenefitCents: number): number {
  return multiplyCurrencyCents(
    monthlyBenefitCents,
    MONTHS_PER_YEAR,
    "Monthly benefit",
  );
}

export function calculateCombinedAnnualizedIncome(
  annualizedGrossPayCents: number,
  annualizedBenefitsCents: number,
): number {
  return addCurrencyCents(
    annualizedGrossPayCents,
    annualizedBenefitsCents,
  );
}

export function getIncomeCalculationFingerprint(
  input: Pick<
    AnnualizedIncomeInput,
    "grossPayCents" | "payFrequency" | "monthlyBenefitCents"
  >,
): string {
  assertCurrencyCents(input.grossPayCents, "Gross pay");
  assertCurrencyCents(input.monthlyBenefitCents, "Monthly benefit");

  if (input.payFrequency.trim().toLocaleLowerCase("en-US") !== "biweekly") {
    throw new TypeError(
      "This frozen calculation supports only a confirmed biweekly pay frequency.",
    );
  }

  return [
    `grossPayCents:${input.grossPayCents}`,
    "payFrequency:biweekly",
    `monthlyBenefitCents:${input.monthlyBenefitCents}`,
  ].join("|");
}

/**
 * Produces the same result for the same inputs. The caller supplies the ISO
 * timestamp so the arithmetic service never reads the clock or hidden state.
 */
export function calculateAnnualizedIncome(
  input: AnnualizedIncomeInput,
): AnnualizedIncomeCalculation {
  const calculatedAt = new Date(input.calculatedAt);
  if (
    Number.isNaN(calculatedAt.getTime()) ||
    calculatedAt.toISOString() !== input.calculatedAt
  ) {
    throw new TypeError("calculatedAt must be a canonical ISO timestamp.");
  }

  const inputFingerprint = getIncomeCalculationFingerprint(input);
  const annualizedGrossPayCents = annualizeBiweeklyGrossPay(
    input.grossPayCents,
  );
  const annualizedBenefitsCents = annualizeMonthlyBenefit(
    input.monthlyBenefitCents,
  );
  const combinedAnnualizedCents = calculateCombinedAnnualizedIncome(
    annualizedGrossPayCents,
    annualizedBenefitsCents,
  );

  return {
    calculationVersion: INCOME_CALCULATION_VERSION,
    calculatedAt: input.calculatedAt,
    inputFingerprint,
    inputs: {
      grossPayCents: input.grossPayCents,
      payFrequency: "Biweekly",
      monthlyBenefitCents: input.monthlyBenefitCents,
    },
    employment: {
      inputAmountCents: input.grossPayCents,
      periodsPerYear: BIWEEKLY_PAY_PERIODS_PER_YEAR,
      formula: "confirmed gross pay × 26 pay periods",
      substitution: `${formatCurrencyFromCents(input.grossPayCents)} × 26`,
      resultCents: annualizedGrossPayCents,
    },
    benefits: {
      inputAmountCents: input.monthlyBenefitCents,
      periodsPerYear: MONTHS_PER_YEAR,
      formula: "confirmed monthly benefit × 12 months",
      substitution: `${formatCurrencyFromCents(input.monthlyBenefitCents)} × 12`,
      resultCents: annualizedBenefitsCents,
    },
    combined: {
      formula: "annualized gross pay + annualized benefits",
      substitution: `${formatCurrencyFromCents(
        annualizedGrossPayCents,
      )} + ${formatCurrencyFromCents(annualizedBenefitsCents)}`,
      resultCents: combinedAnnualizedCents,
    },
    disclaimer: INCOME_CALCULATION_DISCLAIMER,
  };
}
