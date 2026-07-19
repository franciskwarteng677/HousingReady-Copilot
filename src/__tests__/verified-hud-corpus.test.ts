import { describe, expect, it } from "vitest";

import {
  frozen2026MtspCorpus,
  getOfficialThresholdRowForHouseholdSize,
  getThresholdForHouseholdSize,
  getVerifiedThresholdComparisonData,
  verifiedHudFy2026MtspSource,
} from "@/data/rules";
import {
  ruleCorpusSchema,
  verifiedOfficialHudSourceSchema,
} from "@/lib/rules-schema";

const expectedStandard50PercentCents = [
  6_000_000, 6_860_000, 7_715_000, 8_570_000, 9_260_000, 9_945_000,
  10_630_000, 11_315_000,
];

const expectedStandard60PercentCents = [
  7_200_000, 8_232_000, 9_258_000, 10_284_000, 11_112_000,
  11_934_000, 12_756_000, 13_578_000,
];

describe("verified official HUD FY 2026 MTSP corpus", () => {
  it("records the exact verified official source provenance", () => {
    expect(() =>
      verifiedOfficialHudSourceSchema.parse(verifiedHudFy2026MtspSource),
    ).not.toThrow();
    expect(() => ruleCorpusSchema.parse(frozen2026MtspCorpus)).not.toThrow();

    expect(verifiedHudFy2026MtspSource).toMatchObject({
      sourceId: "hud-user-fy2026-mtsp-boston-cambridge-quincy-hmfa",
      publisher:
        "U.S. Department of Housing and Urban Development — HUD USER",
      datasetTitle:
        "FY 2026 Multifamily Tax Subsidy Projects (MTSP) Income Limits",
      datasetPageUrl:
        "https://www.huduser.gov/portal/datasets/mtsp.html",
      pdfUrl:
        "https://www.huduser.gov/portal/datasets/mtsp/mtsp26/HERA-Income-Limits-Report-FY26.pdf",
      pdfPage: 130,
      pdfPageCount: 326,
      effectiveDate: "2026-05-01",
      ruleYear: 2026,
      hmfaName: "Boston-Cambridge-Quincy, MA-NH HMFA",
      medianFamilyIncomeCents: 16_460_000,
      primaryComparisonType: "standard-60-percent-mtsp",
      verificationStatus: "verified_official",
    });
    expect(frozen2026MtspCorpus.dataVerificationStatus).toBe(
      "verified_official",
    );
    expect(frozen2026MtspCorpus.effectiveDate).toBe("2026-05-01");
  });

  it("stores all standard 50% and 60% household-size values in cents", () => {
    expect(verifiedHudFy2026MtspSource.householdSizeThresholds).toHaveLength(
      8,
    );

    for (let householdSize = 1; householdSize <= 8; householdSize += 1) {
      const row = getOfficialThresholdRowForHouseholdSize(
        verifiedHudFy2026MtspSource,
        householdSize as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
      );

      expect(row).toMatchObject({
        householdSize,
        standard50PercentVeryLowIncomeLimitCents:
          expectedStandard50PercentCents[householdSize - 1],
        standard60PercentMtspIncomeLimitCents:
          expectedStandard60PercentCents[householdSize - 1],
      });
    }
  });

  it("stores the exact two-person values", () => {
    const row = getOfficialThresholdRowForHouseholdSize(
      verifiedHudFy2026MtspSource,
      2,
    );

    expect(row?.standard50PercentVeryLowIncomeLimitCents).toBe(6_860_000);
    expect(row?.standard60PercentMtspIncomeLimitCents).toBe(8_232_000);
  });

  it("uses the standard 60% series as the primary comparison threshold", () => {
    for (let householdSize = 1; householdSize <= 8; householdSize += 1) {
      const size = householdSize as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
      const threshold = getThresholdForHouseholdSize(
        frozen2026MtspCorpus,
        size,
      );
      const comparisonData = getVerifiedThresholdComparisonData(
        frozen2026MtspCorpus,
        size,
      );

      expect(threshold?.annualIncomeLimitCents).toBe(
        expectedStandard60PercentCents[householdSize - 1],
      );
      expect(threshold?.verificationStatus).toBe("verified_official");
      expect(comparisonData?.threshold.annualIncomeLimitCents).toBe(
        expectedStandard60PercentCents[householdSize - 1],
      );
      expect(comparisonData?.officialSource?.verificationStatus).toBe(
        "verified_official",
      );
    }
  });

  it("keeps official HUD data separate from product arithmetic and policy", () => {
    const officialCitation = frozen2026MtspCorpus.citationPassages.find(
      (citation) => citation.sourceType === "official-hud-data",
    );
    const arithmeticCitation = frozen2026MtspCorpus.citationPassages.find(
      (citation) => citation.sourceType === "product-arithmetic",
    );
    const policyCitations = frozen2026MtspCorpus.citationPassages.filter(
      (citation) => citation.sourceType === "product-policy",
    );

    expect(officialCitation).toMatchObject({
      sourcePublisher:
        "U.S. Department of Housing and Urban Development — HUD USER",
      verificationStatus: "verified_official",
    });
    expect(officialCitation?.sectionOrRowId).toContain("PDF page 130 of 326");
    expect(arithmeticCitation).toMatchObject({
      sourcePublisher: "HousingReady Copilot",
      verificationStatus: "prototype_policy",
    });
    expect(policyCitations.length).toBeGreaterThan(0);
    expect(
      policyCitations.every(
        (citation) =>
          citation.sourcePublisher === "HousingReady Copilot" &&
          citation.verificationStatus === "prototype_policy",
      ),
    ).toBe(true);
  });

  it("freezes the local record and active corpus against mutation", () => {
    expect(Object.isFrozen(verifiedHudFy2026MtspSource)).toBe(true);
    expect(
      Object.isFrozen(verifiedHudFy2026MtspSource.householdSizeThresholds),
    ).toBe(true);
    expect(
      Object.isFrozen(
        verifiedHudFy2026MtspSource.householdSizeThresholds[0],
      ),
    ).toBe(true);
    expect(Object.isFrozen(frozen2026MtspCorpus)).toBe(true);
    expect(Object.isFrozen(frozen2026MtspCorpus.citationPassages)).toBe(true);
  });

  it("rejects a primary threshold that differs from the embedded HUD row", () => {
    const unsafeCopy = structuredClone(frozen2026MtspCorpus);
    const twoPersonThreshold = unsafeCopy.householdSizeThresholds.find(
      (threshold) => threshold.householdSize === 2,
    );
    if (!twoPersonThreshold) {
      throw new Error("Expected the two-person threshold.");
    }
    twoPersonThreshold.annualIncomeLimitCents = 1;

    expect(() => ruleCorpusSchema.parse(unsafeCopy)).toThrow(
      /must match the verified HUD 60% MTSP row/i,
    );
  });
});
