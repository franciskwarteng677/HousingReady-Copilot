import { z } from "zod";
import { INCOME_CALCULATION_DISCLAIMER } from "@/lib/income-calculation";
import { approvedFieldIdSchema } from "@/lib/profile-schema";
import { householdSizeSchema } from "@/lib/rules-schema";

export const understandRuleReviewStateSchema = z.enum([
  "blocked-missing-verified-data",
  "pending-review",
  "complete",
]);

export const understandReviewInvalidationReasonSchema = z.enum([
  "profile-changed",
  "household-size-changed",
  "threshold-source-changed",
]);

export const householdSizeConfirmationSchema = z
  .object({
    value: householdSizeSchema,
    confirmedAt: z.string().datetime(),
  })
  .strict();

export const understandReviewAcknowledgementSchema = z
  .object({
    acknowledgedAt: z.string().datetime(),
    profileRevision: z.number().int().positive(),
    profileFingerprint: z.string().min(1),
    householdSize: householdSizeSchema,
    calculationInputFingerprint: z.string().min(1),
    thresholdSourceId: z.string().min(1),
    thresholdSourceVersion: z.string().min(1),
  })
  .strict();

export const calculationSourceSchema = z
  .object({
    sourceDocumentId: z.string().min(1),
    sourceDocumentName: z.string().min(1),
    sourcePage: z.number().int().positive(),
  })
  .strict();

export const calculationInputEvidenceSchema = z
  .object({
    fieldId: approvedFieldIdSchema,
    label: z.string().min(1),
    confirmedValue: z.string().min(1),
    sources: z.array(calculationSourceSchema).min(1),
  })
  .strict();

export const calculationInputSnapshotSchema = z
  .object({
    profileFingerprint: z.string().min(1),
    grossPayValue: z.string().min(1),
    payFrequencyValue: z.string().min(1),
    monthlyBenefitValue: z.string().min(1),
  })
  .strict();

const calculationLineSchema = z
  .object({
    inputAmountCents: z.number().int().nonnegative().safe(),
    periodsPerYear: z.number().int().positive(),
    formula: z.string().min(1),
    substitution: z.string().min(1),
    resultCents: z.number().int().nonnegative().safe(),
  })
  .strict();

export const storedIncomeCalculationSchema = z
  .object({
    calculationVersion: z.string().min(1),
    calculatedAt: z.string().datetime(),
    profileFingerprint: z.string().min(1),
    inputFingerprint: z.string().min(1),
    inputs: z
      .object({
        grossPayCents: z.number().int().nonnegative().safe(),
        payFrequency: z.literal("Biweekly"),
        monthlyBenefitCents: z.number().int().nonnegative().safe(),
      })
      .strict(),
    evidence: z
      .object({
        grossPay: calculationInputEvidenceSchema,
        payFrequency: calculationInputEvidenceSchema,
        monthlyBenefit: calculationInputEvidenceSchema,
      })
      .strict(),
    employment: calculationLineSchema,
    benefits: calculationLineSchema,
    combined: z
      .object({
        formula: z.string().min(1),
        substitution: z.string().min(1),
        resultCents: z.number().int().nonnegative().safe(),
      })
      .strict(),
    disclaimer: z.literal(INCOME_CALCULATION_DISCLAIMER),
  })
  .strict();

export const understandSessionSchema = z
  .object({
    version: z.literal(2),
    programIdentifier: z.string().min(1),
    corpusId: z.string().min(1),
    corpusVersion: z.string().min(1),
    profileFingerprint: z.string().min(1),
    profileRevision: z.number().int().positive(),
    householdSize: householdSizeConfirmationSchema.nullable(),
    calculation: storedIncomeCalculationSchema.nullable(),
    previousCalculationInputs: calculationInputSnapshotSchema.nullable(),
    profileStale: z.boolean(),
    ruleReviewState: understandRuleReviewStateSchema,
    reviewAcknowledgement: understandReviewAcknowledgementSchema.nullable(),
    reviewInvalidationReason:
      understandReviewInvalidationReasonSchema.nullable(),
    understandComplete: z.boolean(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((session, context) => {
    if (session.profileStale && session.calculation !== null) {
      context.addIssue({
        code: "custom",
        message: "A stale session cannot retain a calculation result.",
        path: ["calculation"],
      });
    }

    if (session.profileStale && session.reviewAcknowledgement !== null) {
      context.addIssue({
        code: "custom",
        message: "A stale session cannot retain a review acknowledgement.",
        path: ["reviewAcknowledgement"],
      });
    }

    if (
      session.calculation !== null &&
      session.calculation.profileFingerprint !== session.profileFingerprint
    ) {
      context.addIssue({
        code: "custom",
        message: "The calculation must match the Profile fingerprint.",
        path: ["calculation", "profileFingerprint"],
      });
    }

    if (
      session.ruleReviewState === "complete" &&
      session.reviewAcknowledgement === null
    ) {
      context.addIssue({
        code: "custom",
        message: "A completed rule review must record its acknowledgement.",
        path: ["reviewAcknowledgement"],
      });
    }

    if (
      session.ruleReviewState !== "complete" &&
      session.reviewAcknowledgement !== null
    ) {
      context.addIssue({
        code: "custom",
        message: "A pending rule review cannot retain an acknowledgement.",
        path: ["reviewAcknowledgement"],
      });
    }

    if (session.reviewAcknowledgement !== null) {
      const acknowledgement = session.reviewAcknowledgement;

      if (
        session.householdSize === null ||
        acknowledgement.householdSize !== session.householdSize.value
      ) {
        context.addIssue({
          code: "custom",
          message: "The acknowledgement must match the confirmed household size.",
          path: ["reviewAcknowledgement", "householdSize"],
        });
      }

      if (acknowledgement.profileRevision !== session.profileRevision) {
        context.addIssue({
          code: "custom",
          message: "The acknowledgement must match the current Profile revision.",
          path: ["reviewAcknowledgement", "profileRevision"],
        });
      }

      if (acknowledgement.profileFingerprint !== session.profileFingerprint) {
        context.addIssue({
          code: "custom",
          message: "The acknowledgement must match the current Profile values.",
          path: ["reviewAcknowledgement", "profileFingerprint"],
        });
      }

      if (
        session.calculation === null ||
        acknowledgement.calculationInputFingerprint !==
          session.calculation.inputFingerprint
      ) {
        context.addIssue({
          code: "custom",
          message: "The acknowledgement must match the current calculation inputs.",
          path: ["reviewAcknowledgement", "calculationInputFingerprint"],
        });
      }

      if (acknowledgement.thresholdSourceId !== session.corpusId) {
        context.addIssue({
          code: "custom",
          message: "The acknowledgement must match the threshold source.",
          path: ["reviewAcknowledgement", "thresholdSourceId"],
        });
      }

      if (
        acknowledgement.thresholdSourceVersion !== session.corpusVersion
      ) {
        context.addIssue({
          code: "custom",
          message: "The acknowledgement must match the threshold source version.",
          path: ["reviewAcknowledgement", "thresholdSourceVersion"],
        });
      }

      if (session.reviewInvalidationReason !== null) {
        context.addIssue({
          code: "custom",
          message: "A current acknowledgement cannot retain a stale-review reason.",
          path: ["reviewInvalidationReason"],
        });
      }
    }

    if (
      session.understandComplete &&
      (session.profileStale ||
        session.householdSize === null ||
        session.calculation === null ||
        session.ruleReviewState !== "complete" ||
        session.reviewAcknowledgement === null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Understand completion requires every current review step.",
        path: ["understandComplete"],
      });
    }
  });

export type UnderstandRuleReviewState = z.infer<
  typeof understandRuleReviewStateSchema
>;
export type UnderstandReviewInvalidationReason = z.infer<
  typeof understandReviewInvalidationReasonSchema
>;
export type HouseholdSizeConfirmation = z.infer<
  typeof householdSizeConfirmationSchema
>;
export type UnderstandReviewAcknowledgement = z.infer<
  typeof understandReviewAcknowledgementSchema
>;
export type CalculationInputEvidence = z.infer<
  typeof calculationInputEvidenceSchema
>;
export type CalculationInputSnapshot = z.infer<
  typeof calculationInputSnapshotSchema
>;
export type StoredIncomeCalculation = z.infer<
  typeof storedIncomeCalculationSchema
>;
export type UnderstandSession = z.infer<typeof understandSessionSchema>;
