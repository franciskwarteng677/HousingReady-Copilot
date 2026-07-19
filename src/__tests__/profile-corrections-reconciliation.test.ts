import { describe, expect, it } from "vitest";
import {
  makeCompleteIncomeProfile,
  makeField,
} from "@/__tests__/fixtures";
import {
  applyConfirmedProfileCorrection,
  formatCorrectionAudit,
  validateConfirmedFieldValue,
} from "@/lib/profile-corrections";
import {
  applyReuploadChoices,
  buildReuploadComparisons,
} from "@/lib/profile-reconciliation";
import { profileSessionSchema } from "@/lib/profile-schema";

const FIRST_CORRECTION_AT = "2026-07-19T10:00:00.000Z";
const SECOND_CORRECTION_AT = "2026-07-19T10:30:00.000Z";

function correctedGrossPaySession() {
  const result = applyConfirmedProfileCorrection(
    makeCompleteIncomeProfile(),
    "employment.grossPay.currentPeriod",
    "$1,700.00",
    FIRST_CORRECTION_AT,
  );

  if (!result.ok) {
    throw new Error("Expected the correction fixture to be valid.");
  }

  return result.session;
}

describe("confirmed Profile value validation", () => {
  it("normalizes currency text and stores the exact integer-cent value", () => {
    expect(validateConfirmedFieldValue("grossPay", "  $1,700.5  ")).toEqual({
      ok: true,
      value: {
        value: "$1,700.50",
        valueCents: 170_050,
      },
    });
    expect(validateConfirmedFieldValue("monthlyBenefit", "$0.29")).toEqual({
      ok: true,
      value: {
        value: "$0.29",
        valueCents: 29,
      },
    });
  });

  it.each(["-$1.00", "NaN", "Infinity", "-Infinity"])(
    "rejects unsafe or non-finite currency input %s",
    (rawValue) => {
      expect(validateConfirmedFieldValue("grossPay", rawValue)).toEqual({
        ok: false,
        error:
          "Enter a valid non-negative currency amount, such as $1,700.00.",
      });
    },
  );

  it.each([
    "<script>alert('x')</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "data:text/html,unsafe",
  ])("rejects markup or executable-looking plain text: %s", (rawValue) => {
    expect(validateConfirmedFieldValue("fullName", rawValue)).toEqual({
      ok: false,
      error: "Markup, scripts, and control characters are not allowed.",
    });
  });

  it("rejects non-integer, negative, NaN, and infinite stored currency cents", () => {
    const profile = makeCompleteIncomeProfile();
    const invalidCents = [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY];

    for (const valueCents of invalidCents) {
      const result = profileSessionSchema.safeParse({
        ...profile,
        confirmedFields: profile.confirmedFields.map((field) =>
          field.fieldId === "grossPay" ? { ...field, valueCents } : field,
        ),
      });

      expect(result.success).toBe(false);
    }
  });
});

describe("confirmed correction revision history", () => {
  it("increments revisions, appends an audit record, and leaves the prior session immutable", () => {
    const original = makeCompleteIncomeProfile();
    const firstResult = applyConfirmedProfileCorrection(
      original,
      "employment.grossPay.currentPeriod",
      "$1,700.10",
      FIRST_CORRECTION_AT,
    );

    expect(firstResult.ok).toBe(true);
    if (!firstResult.ok) {
      throw new Error("Expected the first correction to succeed.");
    }

    expect(original.revision).toBe(1);
    expect(original.correctionHistory).toEqual([]);
    expect(
      original.confirmedFields.find((field) => field.fieldId === "grossPay"),
    ).toMatchObject({ value: "$1,620.00", valueCents: 162_000 });
    expect(firstResult.session).toMatchObject({
      revision: 2,
      updatedAt: FIRST_CORRECTION_AT,
      correctionHistory: [
        {
          revision: 2,
          updatedAt: FIRST_CORRECTION_AT,
          changedFieldId: "grossPay",
          reviewGroupId: "employment.grossPay.currentPeriod",
          previousConfirmedValue: "$1,620.00",
          newConfirmedValue: "$1,700.10",
          previousValueCents: 162_000,
          newValueCents: 170_010,
        },
      ],
    });
    expect(
      firstResult.session.confirmedFields.find(
        (field) => field.fieldId === "grossPay",
      ),
    ).toMatchObject({
      value: "$1,700.10",
      valueCents: 170_010,
      confirmationOrigin: "renter-corrected",
      confirmedAt: FIRST_CORRECTION_AT,
    });
    expect(formatCorrectionAudit(firstResult.correction)).toBe(
      "Gross pay corrected from $1,620.00 to $1,700.10.",
    );

    const secondResult = applyConfirmedProfileCorrection(
      firstResult.session,
      "employment.grossPay.currentPeriod",
      "$1,725.00",
      SECOND_CORRECTION_AT,
    );
    expect(secondResult.ok).toBe(true);
    if (!secondResult.ok) {
      throw new Error("Expected the second correction to succeed.");
    }

    expect(secondResult.session.revision).toBe(3);
    expect(secondResult.session.correctionHistory).toHaveLength(2);
    expect(secondResult.session.correctionHistory[1]).toMatchObject({
      revision: 3,
      previousConfirmedValue: "$1,700.10",
      newConfirmedValue: "$1,725.00",
      previousValueCents: 170_010,
      newValueCents: 172_500,
    });
  });

  it("does not create a revision when the normalized value has not changed", () => {
    const session = makeCompleteIncomeProfile();

    const result = applyConfirmedProfileCorrection(
      session,
      "employment.grossPay.currentPeriod",
      "$1,620.0",
      FIRST_CORRECTION_AT,
    );

    expect(result).toEqual({
      ok: false,
      error: "Change the value before saving a correction.",
    });
    expect(session.revision).toBe(1);
    expect(session.correctionHistory).toEqual([]);
  });
});

describe("re-upload reconciliation retain versus restore", () => {
  const reuploadedGrossPay = makeField({
    candidateId: "reuploaded-pay:grossPay:0",
    fieldId: "grossPay",
    reviewGroupId: "employment.grossPay.currentPeriod",
    label: "Gross pay",
    originalValue: "$1,620.00",
    confirmedValue: "$1,620.00",
    sourceDocumentId: "reuploaded-pay",
    sourceDocumentName: "synthetic-pay-stub.pdf",
    sourceText: "Gross pay: $1,620.00",
  });

  it("requires an explicit choice, then retains the renter-corrected value unchanged", () => {
    const savedSession = correctedGrossPaySession();
    const comparisons = buildReuploadComparisons(savedSession, [
      reuploadedGrossPay,
    ]);

    expect(comparisons).toEqual([
      expect.objectContaining({
        reviewGroupId: "employment.grossPay.currentPeriod",
        hasDifference: true,
        savedField: expect.objectContaining({
          value: "$1,700.00",
          valueCents: 170_000,
          confirmationOrigin: "renter-corrected",
        }),
        extractedCandidates: [
          expect.objectContaining({
            candidateId: "reuploaded-pay:grossPay:0",
            value: { value: "$1,620.00", valueCents: 162_000 },
          }),
        ],
      }),
    ]);

    expect(
      applyReuploadChoices(
        savedSession,
        comparisons,
        {},
        SECOND_CORRECTION_AT,
      ),
    ).toEqual({
      ok: false,
      error: "Resolve 1 re-upload difference before applying.",
    });

    const retained = applyReuploadChoices(
      savedSession,
      comparisons,
      {
        "employment.grossPay.currentPeriod": { action: "retain" },
      },
      SECOND_CORRECTION_AT,
    );

    expect(retained.ok).toBe(true);
    if (!retained.ok) {
      throw new Error("Expected the saved correction to be retained.");
    }
    expect(retained.retainedCount).toBe(1);
    expect(retained.corrections).toEqual([]);
    expect(retained.session).toBe(savedSession);
    expect(retained.session.revision).toBe(2);
    expect(
      retained.session.confirmedFields.find(
        (field) => field.fieldId === "grossPay",
      ),
    ).toMatchObject({ value: "$1,700.00", valueCents: 170_000 });
  });

  it("restores the extracted value only after selection and records a new correction revision", () => {
    const savedSession = correctedGrossPaySession();
    const comparisons = buildReuploadComparisons(savedSession, [
      reuploadedGrossPay,
    ]);
    const restored = applyReuploadChoices(
      savedSession,
      comparisons,
      {
        "employment.grossPay.currentPeriod": {
          action: "restore",
          candidateId: "reuploaded-pay:grossPay:0",
        },
      },
      SECOND_CORRECTION_AT,
    );

    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      throw new Error("Expected the extracted value to be restored.");
    }

    expect(restored.retainedCount).toBe(0);
    expect(restored.session.revision).toBe(3);
    expect(restored.session.correctionHistory).toHaveLength(2);
    expect(restored.corrections).toEqual([
      expect.objectContaining({
        revision: 3,
        previousConfirmedValue: "$1,700.00",
        newConfirmedValue: "$1,620.00",
        previousValueCents: 170_000,
        newValueCents: 162_000,
      }),
    ]);
    expect(
      restored.session.confirmedFields.find(
        (field) => field.fieldId === "grossPay",
      ),
    ).toMatchObject({
      value: "$1,620.00",
      valueCents: 162_000,
      confirmationOrigin: "renter-corrected",
      confirmedAt: SECOND_CORRECTION_AT,
    });
    expect(
      restored.session.confirmedFields.find(
        (field) => field.fieldId === "monthlyBenefit",
      ),
    ).toMatchObject({ value: "$650.00", valueCents: 65_000 });
  });
});
