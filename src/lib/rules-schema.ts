import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date in YYYY-MM-DD format.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === (month ?? 0) - 1 &&
      date.getUTCDate() === day
    );
  }, "Expected a valid calendar date.");

const sourceLinkSchema = z.union([
  z.string().max(2_048).url().refine(
    (value) => value.startsWith("https://"),
    "External source links must use HTTPS.",
  ),
  z
    .string()
    .max(2_048)
    .regex(/^\/[A-Za-z0-9/_-]*$/, "Expected a safe internal path."),
]);

function containsPlaceholderProvenanceMarker(value: string): boolean {
  return /(?:template|placeholder|not[-_ ]loaded)/i.test(value);
}

export const dataVerificationStatusSchema = z.enum([
  "template",
  "unverified",
  "verified",
  "verified_official",
  "prototype_policy",
]);

/**
 * Legacy source categories remain parseable so stored fixtures and previous
 * corpus versions fail safely rather than becoming unreadable. The active FY
 * 2026 corpus uses the three explicit categories at the end of this enum.
 */
export const ruleSourceTypeSchema = z.enum([
  "application-policy",
  "official-rule",
  "official-hud-data",
  "product-arithmetic",
  "product-policy",
]);

export const corpusSourceTypeSchema = z.enum([
  "verified-official-hud-frozen-rule-corpus",
]);

export const householdSizeSchema = z.number().int().min(1).max(8);

export const primaryComparisonTypeSchema = z.literal(
  "standard-60-percent-mtsp",
);

export const ruleGeographySchema = z
  .object({
    city: z.string().min(1).max(200),
    state: z.string().min(1).max(200),
    hudArea: z.string().min(1).max(300),
  })
  .strict();

export const verifiedOfficialThresholdRowSchema = z
  .object({
    householdSize: householdSizeSchema,
    standard50PercentVeryLowIncomeLimitCents: z
      .number()
      .int()
      .nonnegative()
      .safe(),
    standard60PercentMtspIncomeLimitCents: z
      .number()
      .int()
      .nonnegative()
      .safe(),
  })
  .strict();

/**
 * Provenance and the two official threshold series frozen from HUD's FY 2026
 * MTSP table. This record is deliberately separate from HousingReady-authored
 * calculation and decision-boundary policy passages.
 */
export const verifiedOfficialHudSourceSchema = z
  .object({
    sourceId: z.string().min(1).max(200),
    sourceVersion: z.string().min(1).max(200),
    publisher: z.string().min(1).max(300),
    datasetTitle: z.string().min(1).max(500),
    datasetPageUrl: sourceLinkSchema,
    pdfUrl: sourceLinkSchema,
    pdfPage: z.number().int().positive(),
    pdfPageCount: z.number().int().positive(),
    effectiveDate: isoDateSchema,
    ruleYear: z.number().int().min(2000),
    geography: ruleGeographySchema,
    hmfaName: z.string().min(1).max(300),
    medianFamilyIncomeCents: z.number().int().nonnegative().safe(),
    primaryComparisonType: primaryComparisonTypeSchema,
    primaryComparisonLabel: z.literal("60% MTSP income limit"),
    verificationStatus: z.literal("verified_official"),
    verificationNote: z.string().min(1).max(2_000),
    householdSizeThresholds: z
      .array(verifiedOfficialThresholdRowSchema)
      .length(8),
  })
  .strict()
  .superRefine((source, context) => {
    const sizes = new Set<number>();

    source.householdSizeThresholds.forEach((threshold, index) => {
      if (sizes.has(threshold.householdSize)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate official threshold household size: ${threshold.householdSize}`,
          path: ["householdSizeThresholds", index, "householdSize"],
        });
      }
      sizes.add(threshold.householdSize);
    });

    for (let householdSize = 1; householdSize <= 8; householdSize += 1) {
      if (!sizes.has(householdSize)) {
        context.addIssue({
          code: "custom",
          message: `Missing official threshold record for household size ${householdSize}.`,
          path: ["householdSizeThresholds"],
        });
      }
    }

    if (source.pdfPage > source.pdfPageCount) {
      context.addIssue({
        code: "custom",
        message: "The cited PDF page cannot exceed the PDF page count.",
        path: ["pdfPage"],
      });
    }

    if (source.hmfaName !== source.geography.hudArea) {
      context.addIssue({
        code: "custom",
        message: "The HMFA name must match the official threshold geography.",
        path: ["hmfaName"],
      });
    }
  });

export const citationPassageSchema = z
  .object({
    citationId: z.string().min(1).max(200),
    sectionOrRowId: z.string().min(1).max(500),
    passage: z.string().min(1).max(2_000),
    topics: z.array(z.string().min(1).max(100)).min(1).max(30),
    sourceType: ruleSourceTypeSchema,
    sourceTitle: z.string().min(1).max(500),
    sourcePublisher: z.string().min(1).max(300),
    sourceUrl: sourceLinkSchema.nullable(),
    effectiveDate: isoDateSchema.nullable(),
    verificationStatus: dataVerificationStatusSchema,
  })
  .strict();

export const householdSizeThresholdSchema = z
  .object({
    householdSize: householdSizeSchema,
    annualIncomeLimitCents: z.number().int().nonnegative().safe().nullable(),
    currency: z.literal("USD"),
    citationId: z.string().min(1).nullable(),
    verificationStatus: dataVerificationStatusSchema,
  })
  .strict()
  .superRefine((threshold, context) => {
    if (
      isVerifiedDataStatus(threshold.verificationStatus) &&
      threshold.annualIncomeLimitCents === null
    ) {
      context.addIssue({
        code: "custom",
        message: "A verified threshold must include an annual income limit.",
        path: ["annualIncomeLimitCents"],
      });
    }

    if (
      isVerifiedDataStatus(threshold.verificationStatus) &&
      threshold.citationId === null
    ) {
      context.addIssue({
        code: "custom",
        message: "A verified threshold must reference a citation passage.",
        path: ["citationId"],
      });
    }
  });

export const calculationRuleSchema = z
  .object({
    ruleId: z.string().min(1),
    title: z.string().min(1),
    inputField: z.enum(["grossPay", "monthlyBenefit"]),
    inputCadence: z.enum(["biweekly", "monthly"]),
    periodsPerYear: z.number().int().positive(),
    formula: z.string().min(1),
    explanation: z.string().min(1),
    citationId: z.string().min(1),
  })
  .strict();

export const checklistReferenceSchema = z
  .object({
    referenceId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    citationIds: z.array(z.string().min(1)),
    verificationStatus: dataVerificationStatusSchema,
  })
  .strict();

export const ruleCorpusSchema = z
  .object({
    schemaVersion: z.literal(1),
    corpusId: z.string().min(1).max(200),
    programIdentifier: z.string().min(1).max(200),
    programName: z.string().min(1).max(500),
    geography: ruleGeographySchema,
    ruleYear: z.number().int().min(2000),
    effectiveDate: isoDateSchema.nullable(),
    sourceType: corpusSourceTypeSchema,
    sourceId: z.string().min(1).max(200),
    sourceTitle: z.string().min(1).max(500),
    sourcePublisher: z.string().min(1).max(300),
    sourceUrl: z
      .string()
      .max(2_048)
      .url()
      .refine(
        (value) => value.startsWith("https://"),
        "The corpus source link must use HTTPS.",
      ),
    sourcePdfUrl: z
      .string()
      .max(2_048)
      .url()
      .refine(
        (value) => value.startsWith("https://"),
        "The corpus PDF link must use HTTPS.",
      )
      .nullable(),
    sourcePdfPage: z.number().int().positive().nullable(),
    sourceVersion: z.string().min(1).max(200),
    primaryComparisonType: primaryComparisonTypeSchema,
    officialThresholdSource: verifiedOfficialHudSourceSchema.nullable(),
    citationPassages: z.array(citationPassageSchema),
    householdSizeThresholds: z
      .array(householdSizeThresholdSchema)
      .length(8),
    calculationRules: z.array(calculationRuleSchema),
    checklistReferences: z.array(checklistReferenceSchema),
    dataVerificationStatus: dataVerificationStatusSchema,
    verificationNotes: z.string().min(1).max(2_000),
  })
  .strict()
  .superRefine((corpus, context) => {
    const citationIds = new Set<string>();

    corpus.citationPassages.forEach((citation, index) => {
      if (citationIds.has(citation.citationId)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate citation id: ${citation.citationId}`,
          path: ["citationPassages", index, "citationId"],
        });
      }
      citationIds.add(citation.citationId);
    });

    const householdSizes = new Set<number>();
    corpus.householdSizeThresholds.forEach((threshold, index) => {
      if (householdSizes.has(threshold.householdSize)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate household size: ${threshold.householdSize}`,
          path: ["householdSizeThresholds", index, "householdSize"],
        });
      }
      householdSizes.add(threshold.householdSize);

      if (
        threshold.citationId !== null &&
        !citationIds.has(threshold.citationId)
      ) {
        context.addIssue({
          code: "custom",
          message: `Unknown threshold citation: ${threshold.citationId}`,
          path: ["householdSizeThresholds", index, "citationId"],
        });
      }

      if (isVerifiedDataStatus(threshold.verificationStatus)) {
        const citation = corpus.citationPassages.find(
          (candidate) => candidate.citationId === threshold.citationId,
        );

        if (
          !citation ||
          !isVerifiedDataStatus(citation.verificationStatus)
        ) {
          context.addIssue({
            code: "custom",
            message:
              "A verified threshold must reference a verified citation passage.",
            path: ["householdSizeThresholds", index, "citationId"],
          });
        }
      }
    });

    for (let householdSize = 1; householdSize <= 8; householdSize += 1) {
      if (!householdSizes.has(householdSize)) {
        context.addIssue({
          code: "custom",
          message: `Missing threshold record for household size ${householdSize}.`,
          path: ["householdSizeThresholds"],
        });
      }
    }

    corpus.calculationRules.forEach((rule, index) => {
      if (!citationIds.has(rule.citationId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown calculation-rule citation: ${rule.citationId}`,
          path: ["calculationRules", index, "citationId"],
        });
      }
    });

    corpus.checklistReferences.forEach((reference, referenceIndex) => {
      reference.citationIds.forEach((citationId, citationIndex) => {
        if (!citationIds.has(citationId)) {
          context.addIssue({
            code: "custom",
            message: `Unknown checklist citation: ${citationId}`,
            path: [
              "checklistReferences",
              referenceIndex,
              "citationIds",
              citationIndex,
            ],
          });
        }
      });
    });

    if (isVerifiedDataStatus(corpus.dataVerificationStatus)) {
      if (corpus.effectiveDate === null) {
        context.addIssue({
          code: "custom",
          message: "A verified corpus must record an effective date.",
          path: ["effectiveDate"],
        });
      }

      if (
        !corpus.householdSizeThresholds.some((threshold) =>
          isVerifiedDataStatus(threshold.verificationStatus),
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "A verified corpus must contain a verified threshold.",
          path: ["householdSizeThresholds"],
        });
      }

      if (containsPlaceholderProvenanceMarker(corpus.corpusId)) {
        context.addIssue({
          code: "custom",
          message:
            "A verified corpus cannot retain a template or placeholder corpus identifier.",
          path: ["corpusId"],
        });
      }

      if (containsPlaceholderProvenanceMarker(corpus.sourceVersion)) {
        context.addIssue({
          code: "custom",
          message:
            "A verified corpus must replace the placeholder source version.",
          path: ["sourceVersion"],
        });
      }
    }

    if (corpus.dataVerificationStatus === "verified_official") {
      const officialSource = corpus.officialThresholdSource;

      if (
        corpus.sourceType !== "verified-official-hud-frozen-rule-corpus"
      ) {
        context.addIssue({
          code: "custom",
          message: "A verified official corpus must identify its HUD source type.",
          path: ["sourceType"],
        });
      }

      if (!officialSource) {
        context.addIssue({
          code: "custom",
          message: "A verified official corpus must embed its HUD source record.",
          path: ["officialThresholdSource"],
        });
        return;
      }

      const matchingOfficialCitation = corpus.citationPassages.find(
        (citation) =>
          citation.sourceType === "official-hud-data" &&
          citation.verificationStatus === "verified_official" &&
          citation.sourceUrl === officialSource.pdfUrl &&
          citation.effectiveDate === officialSource.effectiveDate,
      );

      if (!matchingOfficialCitation) {
        context.addIssue({
          code: "custom",
          message:
            "A verified official corpus must contain a verified HUD PDF citation.",
          path: ["citationPassages"],
        });
      }

      if (
        corpus.sourceId !== officialSource.sourceId ||
        corpus.sourceVersion !== officialSource.sourceVersion ||
        corpus.sourceUrl !== officialSource.datasetPageUrl ||
        corpus.sourcePdfUrl !== officialSource.pdfUrl ||
        corpus.sourcePdfPage !== officialSource.pdfPage ||
        corpus.effectiveDate !== officialSource.effectiveDate ||
        corpus.ruleYear !== officialSource.ruleYear ||
        corpus.geography.hudArea !== officialSource.hmfaName
      ) {
        context.addIssue({
          code: "custom",
          message:
            "The corpus metadata must match the embedded verified HUD source.",
          path: ["officialThresholdSource"],
        });
      }

      corpus.householdSizeThresholds.forEach((threshold, index) => {
        const officialThreshold =
          officialSource.householdSizeThresholds.find(
            (candidate) =>
              candidate.householdSize === threshold.householdSize,
          );

        if (
          !officialThreshold ||
          threshold.annualIncomeLimitCents !==
            officialThreshold.standard60PercentMtspIncomeLimitCents ||
          threshold.verificationStatus !== "verified_official" ||
          threshold.citationId !== matchingOfficialCitation?.citationId
        ) {
          context.addIssue({
            code: "custom",
            message:
              "Every primary threshold must match the verified HUD 60% MTSP row.",
            path: ["householdSizeThresholds", index],
          });
        }
      });
    }
  });

export type DataVerificationStatus = z.infer<
  typeof dataVerificationStatusSchema
>;
export type RuleSourceType = z.infer<typeof ruleSourceTypeSchema>;
export type CorpusSourceType = z.infer<typeof corpusSourceTypeSchema>;
export type HouseholdSize = z.infer<typeof householdSizeSchema>;
export type PrimaryComparisonType = z.infer<
  typeof primaryComparisonTypeSchema
>;
export type RuleGeography = z.infer<typeof ruleGeographySchema>;
export type VerifiedOfficialThresholdRow = z.infer<
  typeof verifiedOfficialThresholdRowSchema
>;
export type VerifiedOfficialHudSource = z.infer<
  typeof verifiedOfficialHudSourceSchema
>;
export type CitationPassage = z.infer<typeof citationPassageSchema>;
export type HouseholdSizeThreshold = z.infer<
  typeof householdSizeThresholdSchema
>;
export type CalculationRule = z.infer<typeof calculationRuleSchema>;
export type ChecklistReference = z.infer<typeof checklistReferenceSchema>;
export type RuleCorpus = z.infer<typeof ruleCorpusSchema>;

export type VerifiedThreshold = HouseholdSizeThreshold & {
  annualIncomeLimitCents: number;
  citationId: string;
  verificationStatus: "verified" | "verified_official";
};

export function isVerifiedDataStatus(
  status: DataVerificationStatus,
): status is "verified" | "verified_official" {
  return status === "verified" || status === "verified_official";
}

export function isVerifiedThreshold(
  threshold: HouseholdSizeThreshold,
): threshold is VerifiedThreshold {
  return (
    isVerifiedDataStatus(threshold.verificationStatus) &&
    threshold.annualIncomeLimitCents !== null &&
    threshold.citationId !== null
  );
}
