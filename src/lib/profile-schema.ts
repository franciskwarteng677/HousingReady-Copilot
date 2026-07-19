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
    sources: z.array(confirmedFieldSourceSchema).min(1),
    confirmedAt: z.string().datetime(),
  })
  .strict();

export const profileSessionSchema = z
  .object({
    version: z.literal(1),
    documents: z.array(storedDocumentMetadataSchema),
    confirmedFields: z.array(confirmedProfileFieldSchema),
    profileComplete: z.boolean(),
    counts: z
      .object({
        documentsReviewed: z.number().int().nonnegative(),
        fieldsConfirmed: z.number().int().nonnegative(),
        fieldsExcludedOrUnresolved: z.number().int().nonnegative(),
        unresolvedConflicts: z.number().int().nonnegative(),
      })
      .strict(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type ApprovedFieldId = z.infer<typeof approvedFieldIdSchema>;
export type ExtractedFieldStatus = z.infer<
  typeof extractedFieldStatusSchema
>;
export type FieldDecision = z.infer<typeof fieldDecisionSchema>;
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
export type ProfileSession = z.infer<typeof profileSessionSchema>;
