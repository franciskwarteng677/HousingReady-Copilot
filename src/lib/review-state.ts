import {
  confirmedProfileFieldSchema,
  type ApprovedFieldId,
  type ConfirmedProfileField,
  type ExtractedField,
} from "@/lib/profile-schema";
import { validateConfirmedFieldValue } from "@/lib/profile-corrections";
import type { ProfileProgress, ReviewDocument } from "@/types/profile";

export type ReviewGroup = {
  reviewGroupId: string;
  label: string;
  fields: ExtractedField[];
  hasConflict: boolean;
};

const moneyFields = new Set<ApprovedFieldId>([
  "grossPay",
  "netPay",
  "monthlyBenefit",
]);

export function normalizeFieldValue(
  fieldId: ApprovedFieldId,
  value: string,
): string {
  const collapsed = value.trim().replace(/\s+/g, " ");

  if (moneyFields.has(fieldId)) {
    const numeric = Number(collapsed.replace(/[$,\s]/g, ""));
    return Number.isFinite(numeric) ? numeric.toFixed(2) : collapsed.toLowerCase();
  }

  return collapsed.toLocaleLowerCase("en-US");
}

export function groupReviewFields(
  fields: readonly ExtractedField[],
): ReviewGroup[] {
  const groups = new Map<string, ExtractedField[]>();

  for (const field of fields) {
    const existing = groups.get(field.reviewGroupId) ?? [];
    existing.push(field);
    groups.set(field.reviewGroupId, existing);
  }

  return Array.from(groups.entries()).map(([reviewGroupId, candidates]) => {
    const activeCandidates = candidates.filter(
      (candidate) => candidate.decision !== "excluded",
    );
    const distinctValues = new Set(
      activeCandidates.map((candidate) =>
        normalizeFieldValue(candidate.fieldId, candidate.confirmedValue),
      ),
    );

    return {
      reviewGroupId,
      label: candidates[0]?.label ?? "Field",
      fields: candidates,
      hasConflict: distinctValues.size > 1,
    };
  });
}

export function getConflictGroupIds(
  fields: readonly ExtractedField[],
): string[] {
  return groupReviewFields(fields)
    .filter((group) => group.hasConflict)
    .map((group) => group.reviewGroupId);
}

export function correctField(
  fields: readonly ExtractedField[],
  candidateId: string,
  confirmedValue: string,
): ExtractedField[] {
  return fields.map((field) => {
    if (field.candidateId !== candidateId) {
      return field;
    }

    return {
      ...field,
      confirmedValue,
      status:
        confirmedValue === field.originalValue ? "extracted" : "corrected",
      decision: "pending",
    };
  });
}

export function confirmField(
  fields: readonly ExtractedField[],
  candidateId: string,
): ExtractedField[] {
  return fields.map((field) => {
    if (
      field.candidateId !== candidateId ||
      field.confirmedValue.trim().length === 0
    ) {
      return field;
    }

    return {
      ...field,
      status: "confirmed",
      decision: "retained",
    };
  });
}

function unconfirmField(field: ExtractedField): ExtractedField {
  return {
    ...field,
    status:
      field.confirmedValue === field.originalValue ? "extracted" : "corrected",
  };
}

export function excludeField(
  fields: readonly ExtractedField[],
  candidateId: string,
): ExtractedField[] {
  return fields.map((field) =>
    field.candidateId === candidateId
      ? {
          ...unconfirmField(field),
          decision: "excluded",
        }
      : field,
  );
}

export function restoreField(
  fields: readonly ExtractedField[],
  candidateId: string,
): ExtractedField[] {
  return fields.map((field) =>
    field.candidateId === candidateId
      ? {
          ...unconfirmField(field),
          decision: "pending",
        }
      : field,
  );
}

export function retainCandidate(
  fields: readonly ExtractedField[],
  candidateId: string,
): ExtractedField[] {
  const selected = fields.find((field) => field.candidateId === candidateId);

  if (!selected || selected.confirmedValue.trim().length === 0) {
    return [...fields];
  }

  return fields.map((field) => {
    if (field.reviewGroupId !== selected.reviewGroupId) {
      return field;
    }

    if (field.candidateId === candidateId) {
      return {
        ...field,
        status: "confirmed",
        decision: "retained",
      };
    }

    return {
      ...unconfirmField(field),
      decision: "excluded",
    };
  });
}

export function confirmAllReviewedFields(
  fields: readonly ExtractedField[],
): {
  fields: ExtractedField[];
  skippedConflictCount: number;
} {
  const conflictIds = new Set(getConflictGroupIds(fields));

  return {
    fields: fields.map((field) => {
      if (
        field.decision === "excluded" ||
        field.confirmedValue.trim().length === 0 ||
        conflictIds.has(field.reviewGroupId)
      ) {
        return field;
      }

      return {
        ...field,
        status: "confirmed",
        decision: "retained",
      };
    }),
    skippedConflictCount: conflictIds.size,
  };
}

export function getProfileProgress(
  documents: readonly ReviewDocument[],
  fields: readonly ExtractedField[],
): ProfileProgress {
  const groups = groupReviewFields(fields);
  const unresolvedConflictGroupIds = groups
    .filter((group) => group.hasConflict)
    .map((group) => group.reviewGroupId);
  const activeFields = fields.filter(
    (field) => field.decision !== "excluded",
  );
  const pendingFields = activeFields.filter(
    (field) => field.status !== "confirmed",
  ).length;
  const confirmedGroups = groups.filter((group) =>
    group.fields.some(
      (field) =>
        field.decision === "retained" && field.status === "confirmed",
    ),
  ).length;
  const excludedFields = fields.filter(
    (field) => field.decision === "excluded",
  ).length;
  const pendingExtractions = documents.filter(
    (document) => document.extractionState === "processing",
  ).length;
  const documentsReviewed = documents.filter(
    (document) =>
      document.extractionState === "reviewed" ||
      document.extractionState === "no-call",
  ).length;
  const recognizedDocumentsReviewed = documents.filter(
    (document) => document.extractionState === "reviewed",
  ).length;

  return {
    documentsReviewed,
    recognizedDocumentsReviewed,
    fieldsConfirmed: confirmedGroups,
    fieldsExcluded: excludedFields,
    pendingFields,
    pendingExtractions,
    unresolvedConflictGroupIds,
    profileComplete:
      recognizedDocumentsReviewed >= 1 &&
      confirmedGroups >= 1 &&
      pendingFields === 0 &&
      pendingExtractions === 0 &&
      unresolvedConflictGroupIds.length === 0,
  };
}

export function projectConfirmedFields(
  fields: readonly ExtractedField[],
  confirmedAt = new Date().toISOString(),
): ConfirmedProfileField[] {
  return groupReviewFields(fields).flatMap((group) => {
    if (group.hasConflict) {
      return [];
    }

    const confirmedCandidates = group.fields.filter(
      (field) =>
        field.decision === "retained" &&
        field.status === "confirmed" &&
        field.confirmedValue.trim().length > 0,
    );

    if (confirmedCandidates.length === 0) {
      return [];
    }

    const distinctValues = new Set(
      confirmedCandidates.map((field) =>
        normalizeFieldValue(field.fieldId, field.confirmedValue),
      ),
    );

    if (distinctValues.size !== 1) {
      return [];
    }

    const first = confirmedCandidates[0];
    if (!first) {
      return [];
    }

    const validatedValue = validateConfirmedFieldValue(
      first.fieldId,
      first.confirmedValue,
    );
    if (!validatedValue.ok) {
      return [];
    }
    const wasCorrected = confirmedCandidates.some(
      (field) =>
        normalizeFieldValue(field.fieldId, field.originalValue) !==
        normalizeFieldValue(field.fieldId, field.confirmedValue),
    );

    return [
      confirmedProfileFieldSchema.parse({
        fieldId: first.fieldId,
        reviewGroupId: first.reviewGroupId,
        label: first.label,
        value: validatedValue.value.value,
        valueCents: validatedValue.value.valueCents,
        confirmationOrigin: wasCorrected
          ? "renter-corrected"
          : "extracted",
        sources: confirmedCandidates.map((field) => ({
          sourceDocumentId: field.sourceDocumentId,
          sourceDocumentName: field.sourceDocumentName,
          sourcePage: field.sourcePage,
        })),
        confirmedAt,
      }),
    ];
  });
}
