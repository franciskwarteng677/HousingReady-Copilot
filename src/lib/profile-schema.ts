import { z } from "zod";

export const approvedFieldIdSchema = z.enum([
  "fullName",
  "employer",
  "benefitType",
  "grossPay",
  "netPay",
  "monthlyBenefit",
  "payFrequency",
  "payPeriodStart",
  "payPeriodEnd",
  "documentDate",
  "effectiveDate",
  "address",
  "documentType",
]);

export const currencyFieldIds = [
  "grossPay",
  "netPay",
  "monthlyBenefit",
] as const;

export const dateFieldIds = [
  "payPeriodStart",
  "payPeriodEnd",
  "documentDate",
  "effectiveDate",
] as const;

export const supportedPayFrequencySchema = z.enum([
  "Weekly",
  "Biweekly",
  "Semimonthly",
  "Monthly",
]);

export const confirmationOriginSchema = z.enum([
  "extracted",
  "renter-corrected",
  "legacy-confirmed",
]);

export const extractedFieldStatusSchema = z.enum([
  "extracted",
  "corrected",
  "confirmed",
  "no-call",
]);

export const fieldDecisionSchema = z.enum([
  "pending",
  "retained",
  "excluded",
]);

export const evidenceCoordinatesSchema = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    width: z.number().finite().min(0).max(1),
    height: z.number().finite().min(0).max(1),
  })
  .strict();

export const extractedFieldSchema = z
  .object({
    candidateId: z.string().min(1),
    fieldId: approvedFieldIdSchema,
    reviewGroupId: z.string().min(1),
    label: z.string().min(1),
    originalValue: z.string().min(1),
    confirmedValue: z.string(),
    confidence: z.number().finite().min(0).max(1),
    sourceDocumentId: z.string().min(1),
    sourceDocumentName: z.string().min(1),
    sourcePage: z.number().int().positive(),
    sourceText: z.string().min(1),
    evidenceCoordinates: evidenceCoordinatesSchema.optional(),
    status: extractedFieldStatusSchema,
    decision: fieldDecisionSchema,
  })
  .strict();

export const sampleDocumentKindSchema = z.enum([
  "pay-stub",
  "benefits-letter",
  "residency-document",
]);

export const noCallMessageSchema = z.literal(
  "This document could not be reliably extracted in the current prototype. Review it manually or use one of the provided synthetic samples.",
);

export const documentExtractionResultSchema = z.discriminatedUnion("outcome", [
  z
    .object({
      outcome: z.literal("fields"),
      sampleKind: sampleDocumentKindSchema,
      fields: z.array(extractedFieldSchema).min(1),
    })
    .strict(),
  z
    .object({
      outcome: z.literal("no-call"),
      fields: z.array(extractedFieldSchema).length(0),
      message: noCallMessageSchema,
    })
    .strict(),
]);

export const supportedDocumentMimeTypeSchema = z.enum([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export const storedDocumentMetadataSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    mimeType: supportedDocumentMimeTypeSchema,
    size: z.number().int().nonnegative(),
    lastModified: z.number().int().nonnegative(),
    sampleKind: sampleDocumentKindSchema.nullable(),
    reviewState: z.enum(["reviewed", "no-call"]),
  })
  .strict();

export const confirmedFieldSourceSchema = z
  .object({
    sourceDocumentId: z.string().min(1),
    sourceDocumentName: z.string().min(1),
    sourcePage: z.number().int().positive(),
  })
  .strict();

export const confirmedProfileFieldSchema = z
  .object({
    fieldId: approvedFieldIdSchema,
    reviewGroupId: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
    valueCents: z.number().int().nonnegative().safe().nullable(),
    confirmationOrigin: confirmationOriginSchema,
    sources: z.array(confirmedFieldSourceSchema).min(1),
    confirmedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((field, context) => {
    const isCurrency = currencyFieldIds.some(
      (fieldId) => fieldId === field.fieldId,
    );

    if (isCurrency && field.valueCents === null) {
      context.addIssue({
        code: "custom",
        message: "A confirmed currency field must store integer cents.",
        path: ["valueCents"],
      });
    }

    if (!isCurrency && field.valueCents !== null) {
      context.addIssue({
        code: "custom",
        message: "Only confirmed currency fields may store integer cents.",
        path: ["valueCents"],
      });
    }
  });

export const profileCorrectionSchema = z
  .object({
    revision: z.number().int().min(2),
    updatedAt: z.string().datetime(),
    changedFieldId: approvedFieldIdSchema,
    reviewGroupId: z.string().min(1),
    label: z.string().min(1),
    previousConfirmedValue: z.string().min(1),
    newConfirmedValue: z.string().min(1),
    previousValueCents: z.number().int().nonnegative().safe().nullable(),
    newValueCents: z.number().int().nonnegative().safe().nullable(),
  })
  .strict();

export const profileSessionBaseSchema = z
  .object({
    version: z.literal(3),
    revision: z.number().int().positive(),
    correctionHistory: z.array(profileCorrectionSchema),
    documents: z.array(storedDocumentMetadataSchema),
    confirmedFields: z.array(confirmedProfileFieldSchema),
    profileComplete: z.boolean(),
    counts: z
      .object({
        documentsReviewed: z.number().int().nonnegative(),
        fieldsConfirmed: z.number().int().nonnegative(),
        fieldsExcluded: z.number().int().nonnegative(),
        unresolvedConflicts: z.number().int().nonnegative(),
      })
      .strict(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const profileSessionSchema = profileSessionBaseSchema.superRefine(
  (session, context) => {
    if (session.counts.documentsReviewed !== session.documents.length) {
      context.addIssue({
        code: "custom",
        message: "The reviewed-document count must match stored metadata.",
        path: ["counts", "documentsReviewed"],
      });
    }

    if (session.counts.fieldsConfirmed !== session.confirmedFields.length) {
      context.addIssue({
        code: "custom",
        message: "The confirmed-field count must match stored fields.",
        path: ["counts", "fieldsConfirmed"],
      });
    }

    if (session.profileComplete && session.counts.unresolvedConflicts !== 0) {
      context.addIssue({
        code: "custom",
        message: "A completed Profile cannot contain unresolved conflicts.",
        path: ["counts", "unresolvedConflicts"],
      });
    }

    if (session.revision !== session.correctionHistory.length + 1) {
      context.addIssue({
        code: "custom",
        message: "The Profile revision must match its correction history.",
        path: ["revision"],
      });
    }

    session.correctionHistory.forEach((correction, index) => {
      if (correction.revision !== index + 2) {
        context.addIssue({
          code: "custom",
          message: "Profile correction revisions must be sequential.",
          path: ["correctionHistory", index, "revision"],
        });
      }

      const isCurrency = currencyFieldIds.some(
        (fieldId) => fieldId === correction.changedFieldId,
      );
      if (
        isCurrency &&
        (correction.previousValueCents === null ||
          correction.newValueCents === null)
      ) {
        context.addIssue({
          code: "custom",
          message: "Currency corrections must record integer-cent values.",
          path: ["correctionHistory", index],
        });
      }
      if (
        !isCurrency &&
        (correction.previousValueCents !== null ||
          correction.newValueCents !== null)
      ) {
        context.addIssue({
          code: "custom",
          message: "Non-currency corrections cannot record currency cents.",
          path: ["correctionHistory", index],
        });
      }
    });
  },
);

export type ApprovedFieldId = z.infer<typeof approvedFieldIdSchema>;
export type ExtractedFieldStatus = z.infer<
  typeof extractedFieldStatusSchema
>;
export type FieldDecision = z.infer<typeof fieldDecisionSchema>;
export type SupportedPayFrequency = z.infer<
  typeof supportedPayFrequencySchema
>;
export type ConfirmationOrigin = z.infer<typeof confirmationOriginSchema>;
export type EvidenceCoordinates = z.infer<
  typeof evidenceCoordinatesSchema
>;
export type ExtractedField = z.infer<typeof extractedFieldSchema>;
export type SampleDocumentKind = z.infer<
  typeof sampleDocumentKindSchema
>;
export type DocumentExtractionResult = z.infer<
  typeof documentExtractionResultSchema
>;
export type SupportedDocumentMimeType = z.infer<
  typeof supportedDocumentMimeTypeSchema
>;
export type StoredDocumentMetadata = z.infer<
  typeof storedDocumentMetadataSchema
>;
export type ConfirmedProfileField = z.infer<
  typeof confirmedProfileFieldSchema
>;
export type ProfileCorrection = z.infer<typeof profileCorrectionSchema>;
export type ProfileSession = z.infer<typeof profileSessionSchema>;
