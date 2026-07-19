import {
  verifiedOfficialHudSourceSchema,
  type VerifiedOfficialHudSource,
} from "@/lib/rules-schema";

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((child) => {
      deepFreeze(child);
    });
    Object.freeze(value);
  }

  return value as DeepReadonly<T>;
}

const verifiedHudFy2026MtspSourceInput: VerifiedOfficialHudSource = {
  sourceId: "hud-user-fy2026-mtsp-boston-cambridge-quincy-hmfa",
  sourceVersion: "hud-fy2026-mtsp-effective-2026-05-01-pdf-page-130",
  publisher: "U.S. Department of Housing and Urban Development — HUD USER",
  datasetTitle:
    "FY 2026 Multifamily Tax Subsidy Projects (MTSP) Income Limits",
  datasetPageUrl: "https://www.huduser.gov/portal/datasets/mtsp.html",
  pdfUrl:
    "https://www.huduser.gov/portal/datasets/mtsp/mtsp26/HERA-Income-Limits-Report-FY26.pdf",
  pdfPage: 130,
  pdfPageCount: 326,
  effectiveDate: "2026-05-01",
  ruleYear: 2026,
  geography: {
    city: "Cambridge",
    state: "Massachusetts",
    hudArea: "Boston-Cambridge-Quincy, MA-NH HMFA",
  },
  hmfaName: "Boston-Cambridge-Quincy, MA-NH HMFA",
  medianFamilyIncomeCents: 16_460_000,
  primaryComparisonType: "standard-60-percent-mtsp",
  primaryComparisonLabel: "60% MTSP income limit",
  verificationStatus: "verified_official",
  verificationNote:
    "Verified against the official HUD USER FY 2026 MTSP dataset page and the Massachusetts table for Boston-Cambridge-Quincy, MA-NH HMFA on PDF page 130 of 326. This structured record is frozen locally for the Cambridge prototype.",
  householdSizeThresholds: [
    {
      householdSize: 1,
      standard50PercentVeryLowIncomeLimitCents: 6_000_000,
      standard60PercentMtspIncomeLimitCents: 7_200_000,
    },
    {
      householdSize: 2,
      standard50PercentVeryLowIncomeLimitCents: 6_860_000,
      standard60PercentMtspIncomeLimitCents: 8_232_000,
    },
    {
      householdSize: 3,
      standard50PercentVeryLowIncomeLimitCents: 7_715_000,
      standard60PercentMtspIncomeLimitCents: 9_258_000,
    },
    {
      householdSize: 4,
      standard50PercentVeryLowIncomeLimitCents: 8_570_000,
      standard60PercentMtspIncomeLimitCents: 10_284_000,
    },
    {
      householdSize: 5,
      standard50PercentVeryLowIncomeLimitCents: 9_260_000,
      standard60PercentMtspIncomeLimitCents: 11_112_000,
    },
    {
      householdSize: 6,
      standard50PercentVeryLowIncomeLimitCents: 9_945_000,
      standard60PercentMtspIncomeLimitCents: 11_934_000,
    },
    {
      householdSize: 7,
      standard50PercentVeryLowIncomeLimitCents: 10_630_000,
      standard60PercentMtspIncomeLimitCents: 12_756_000,
    },
    {
      householdSize: 8,
      standard50PercentVeryLowIncomeLimitCents: 11_315_000,
      standard60PercentMtspIncomeLimitCents: 13_578_000,
    },
  ],
};

/**
 * The verified local source record is immutable at both the TypeScript and
 * runtime levels. UI and calculation code consume this frozen record without
 * making a live request to HUD during a demonstration.
 */
export const verifiedHudFy2026MtspSource = deepFreeze(
  verifiedOfficialHudSourceSchema.parse(verifiedHudFy2026MtspSourceInput),
);

export { deepFreeze };
