import {
  applyConfirmedProfileCorrection,
  confirmedValuesMatch,
  validateConfirmedFieldValue,
  type ValidatedConfirmedValue,
} from "@/lib/profile-corrections";
import type {
  ConfirmedProfileField,
  ExtractedField,
  ProfileCorrection,
  ProfileSession,
} from "@/lib/profile-schema";

export type ReuploadCandidate = {
  candidateId: string;
  value: ValidatedConfirmedValue;
  sourceDocumentName: string;
  sourcePage: number;
};

export type ReuploadComparison = {
  reviewGroupId: string;
  label: string;
  savedField: ConfirmedProfileField | null;
  extractedCandidates: ReuploadCandidate[];
  hasDifference: boolean;
};

export type ReuploadChoice =
  | { action: "retain" }
  | { action: "restore"; candidateId: string };

export type ReuploadChoices = Record<string, ReuploadChoice>;

export type ApplyReuploadChoicesResult =
  | {
      ok: true;
      session: ProfileSession;
      corrections: ProfileCorrection[];
      retainedCount: number;
    }
  | { ok: false; error: string };

export function buildReuploadComparisons(
  session: ProfileSession,
  fields: readonly ExtractedField[],
): ReuploadComparison[] {
  const grouped = new Map<string, ExtractedField[]>();

  for (const field of fields) {
    const current = grouped.get(field.reviewGroupId) ?? [];
    current.push(field);
    grouped.set(field.reviewGroupId, current);
  }

  return Array.from(grouped.entries()).map(
    ([reviewGroupId, candidates]) => {
      const first = candidates[0];
      const savedField =
        session.confirmedFields.find(
          (field) => field.reviewGroupId === reviewGroupId,
        ) ?? null;
      const extractedCandidates = candidates.flatMap((candidate) => {
        const validation = validateConfirmedFieldValue(
          candidate.fieldId,
          candidate.originalValue,
        );

        return validation.ok
          ? [
              {
                candidateId: candidate.candidateId,
                value: validation.value,
                sourceDocumentName: candidate.sourceDocumentName,
                sourcePage: candidate.sourcePage,
              },
            ]
          : [];
      });

      return {
        reviewGroupId,
        label: first?.label ?? savedField?.label ?? "Confirmed field",
        savedField,
        extractedCandidates,
        hasDifference: Boolean(
          savedField &&
            extractedCandidates.some(
              (candidate) => !confirmedValuesMatch(savedField, candidate.value),
            ),
        ),
      };
    },
  );
}

export function applyReuploadChoices(
  session: ProfileSession,
  comparisons: readonly ReuploadComparison[],
  choices: ReuploadChoices,
  updatedAt = new Date().toISOString(),
): ApplyReuploadChoicesResult {
  const unresolved = comparisons.filter(
    (comparison) =>
      comparison.hasDifference && !choices[comparison.reviewGroupId],
  );
  if (unresolved.length > 0) {
    return {
      ok: false,
      error: `Resolve ${unresolved.length} re-upload difference${unresolved.length === 1 ? "" : "s"} before applying.`,
    };
  }

  let nextSession = session;
  const corrections: ProfileCorrection[] = [];
  let retainedCount = 0;

  for (const comparison of comparisons) {
    const choice = choices[comparison.reviewGroupId];
    if (!comparison.hasDifference || !choice) {
      continue;
    }

    if (choice.action === "retain") {
      retainedCount += 1;
      continue;
    }

    const candidate = comparison.extractedCandidates.find(
      (item) => item.candidateId === choice.candidateId,
    );
    if (!candidate || !comparison.savedField) {
      return {
        ok: false,
        error: `The selected extracted value for ${comparison.label} is unavailable.`,
      };
    }

    const applied = applyConfirmedProfileCorrection(
      nextSession,
      comparison.reviewGroupId,
      candidate.value.value,
      updatedAt,
    );
    if (!applied.ok) {
      return applied;
    }

    nextSession = applied.session;
    corrections.push(applied.correction);
  }

  return {
    ok: true,
    session: nextSession,
    corrections,
    retainedCount,
  };
}
