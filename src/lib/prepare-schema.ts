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
    checklistVersion: z.string().min(1),
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

export const readinessResultsAcknowledgementSchema = z
  .object({
    acknowledgedAt: z.string().datetime(),
  })
  .strict();

export const prepareSessionSchema = z
  .object({
    version: z.literal(2),
    binding: prepareWorkflowBindingSchema,
    documentReviews: prepareDocumentReviewsSchema,
    readinessResultsAcknowledgement:
      readinessResultsAcknowledgementSchema.nullable(),
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

    if (
      session.readinessResultsAcknowledgement &&
      Date.parse(session.readinessResultsAcknowledgement.acknowledgedAt) <
        Date.parse(session.createdAt)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Document-readiness acknowledgement cannot be earlier than Prepare creation.",
        path: ["readinessResultsAcknowledgement", "acknowledgedAt"],
      });
    }

    if (
      session.readinessResultsAcknowledgement &&
      Date.parse(session.readinessResultsAcknowledgement.acknowledgedAt) >
        Date.parse(session.updatedAt)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Prepare updatedAt cannot be earlier than the document-readiness acknowledgement.",
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
export type ReadinessResultsAcknowledgement = z.infer<
  typeof readinessResultsAcknowledgementSchema
>;
export type PrepareSession = z.infer<typeof prepareSessionSchema>;
