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
]);

export const ruleSourceTypeSchema = z.enum([
  "application-policy",
  "organizer-pack",
  "official-rule",
]);

export const householdSizeSchema = z.number().int().min(1).max(8);

export const ruleGeographySchema = z
  .object({
    city: z.string().min(1).max(200),
    state: z.string().min(1).max(200),
    hudArea: z.string().min(1).max(300),
  })
  .strict();

export const citationPassageSchema = z
  .object({
    citationId: z.string().min(1).max(200),
    sectionOrRowId: z.string().min(1).max(300),
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
      threshold.verificationStatus === "verified" &&
      threshold.annualIncomeLimitCents === null
    ) {
      context.addIssue({
        code: "custom",
        message: "A verified threshold must include an annual income limit.",
        path: ["annualIncomeLimitCents"],
      });
    }

    if (
      threshold.verificationStatus === "verified" &&
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
    sourceType: z.literal("organizer-provided-frozen-rule-corpus"),
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
    sourceVersion: z.string().min(1).max(200),
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

      if (threshold.verificationStatus === "verified") {
        const citation = corpus.citationPassages.find(
          (candidate) => candidate.citationId === threshold.citationId,
        );

        if (!citation || citation.verificationStatus !== "verified") {
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

    if (corpus.dataVerificationStatus === "verified") {
      if (corpus.effectiveDate === null) {
        context.addIssue({
          code: "custom",
          message: "A verified corpus must record an effective date.",
          path: ["effectiveDate"],
        });
      }

      if (
        !corpus.householdSizeThresholds.some(
          (threshold) => threshold.verificationStatus === "verified",
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
  });

export type DataVerificationStatus = z.infer<
  typeof dataVerificationStatusSchema
>;
export type RuleSourceType = z.infer<typeof ruleSourceTypeSchema>;
export type HouseholdSize = z.infer<typeof householdSizeSchema>;
export type RuleGeography = z.infer<typeof ruleGeographySchema>;
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
  verificationStatus: "verified";
};

export function isVerifiedThreshold(
  threshold: HouseholdSizeThreshold,
): threshold is VerifiedThreshold {
  return (
    threshold.verificationStatus === "verified" &&
    threshold.annualIncomeLimitCents !== null &&
    threshold.citationId !== null
  );
}
