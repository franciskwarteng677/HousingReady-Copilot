import { z } from "zod";
import { INCOME_CALCULATION_DISCLAIMER } from "@/lib/income-calculation";
import { approvedFieldIdSchema } from "@/lib/profile-schema";
import { householdSizeSchema } from "@/lib/rules-schema";

export const understandRuleReviewStateSchema = z.enum([
  "blocked-missing-verified-data",
  "pending-review",
  "complete",
]);

export const householdSizeConfirmationSchema = z
  .object({
    value: householdSizeSchema,
    confirmedAt: z.string().datetime(),
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
    version: z.literal(1),
    programIdentifier: z.string().min(1),
    corpusId: z.string().min(1),
    corpusVersion: z.string().min(1),
    profileFingerprint: z.string().min(1),
    householdSize: householdSizeConfirmationSchema.nullable(),
    calculation: storedIncomeCalculationSchema.nullable(),
    previousCalculationInputs: calculationInputSnapshotSchema.nullable(),
    profileStale: z.boolean(),
    ruleReviewState: understandRuleReviewStateSchema,
    thresholdReviewCompletedAt: z.string().datetime().nullable(),
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
      session.thresholdReviewCompletedAt === null
    ) {
      context.addIssue({
        code: "custom",
        message: "A completed rule review must record its completion time.",
        path: ["thresholdReviewCompletedAt"],
      });
    }

    if (
      session.understandComplete &&
      (session.profileStale ||
        session.householdSize === null ||
        session.calculation === null ||
        session.ruleReviewState !== "complete" ||
        session.thresholdReviewCompletedAt === null)
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
export type HouseholdSizeConfirmation = z.infer<
  typeof householdSizeConfirmationSchema
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
