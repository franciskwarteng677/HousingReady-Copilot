import { z } from "zod";

export const syntheticDocumentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  lastModified: z.number().int().nonnegative(),
});

export const readinessProfileSchema = z.object({
  documents: z.array(syntheticDocumentSchema).default([]),
  confirmedAt: z.string().datetime().optional(),
});

export type ReadinessProfile = z.infer<typeof readinessProfileSchema>;
