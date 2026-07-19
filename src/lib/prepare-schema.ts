import { z } from "zod";
import { householdSizeSchema } from "@/lib/rules-schema";

export const PREPARE_DOCUMENT_CATEGORY_IDS = [
  "identity-document",
  "income-documentation",
  "residency-documentation",
] as const;

export const prepareDocumentCategoryIdSchema = z.enum(
  PREPARE_DOCUMENT_CATEGORY_IDS,
);

export const prepareWorkflowBindingSchema = z
  .object({
    profileRevision: z.number().int().positive(),
    profileFingerprint: z.string().min(1),
    understandAcknowledgedAt: z.string().datetime(),
    householdSize: householdSizeSchema,
    calculationInputFingerprint: z.string().min(1),
    thresholdSourceId: z.string().min(1),
    thresholdSourceVersion: z.string().min(1),
  })
  .strict();

export const prepareDocumentReviewsSchema = z
  .object({
    "identity-document": z.boolean(),
    "income-documentation": z.boolean(),
    "residency-documentation": z.boolean(),
  })
  .strict();

export const prepareSessionSchema = z
  .object({
    version: z.literal(1),
    binding: prepareWorkflowBindingSchema,
    documentReviews: prepareDocumentReviewsSchema,
    missingOrExpiredReviewed: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((session, context) => {
    if (Date.parse(session.updatedAt) < Date.parse(session.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "Prepare updatedAt cannot be earlier than createdAt.",
        path: ["updatedAt"],
      });
    }
  });

export type PrepareDocumentCategoryId = z.infer<
  typeof prepareDocumentCategoryIdSchema
>;
export type PrepareWorkflowBinding = z.infer<
  typeof prepareWorkflowBindingSchema
>;
export type PrepareDocumentReviews = z.infer<
  typeof prepareDocumentReviewsSchema
>;
export type PrepareSession = z.infer<typeof prepareSessionSchema>;
