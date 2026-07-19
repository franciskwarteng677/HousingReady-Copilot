import type { ProfileSession } from "@/lib/profile-schema";

function stableProfileProjection(profile: ProfileSession) {
  return profile.confirmedFields
    .map((field) => ({
      fieldId: field.fieldId,
      reviewGroupId: field.reviewGroupId,
      value:
        field.valueCents === null
          ? field.value
          : { currencyCents: field.valueCents },
      sources: field.sources
        .map((source) => ({
          documentName: source.sourceDocumentName,
          page: source.sourcePage,
        }))
        .sort((first, second) =>
          (first.documentName + ":" + first.page).localeCompare(
            second.documentName + ":" + second.page,
          ),
        ),
    }))
    .sort((first, second) =>
      (first.reviewGroupId + ":" + first.fieldId).localeCompare(
        second.reviewGroupId + ":" + second.fieldId,
      ),
    );
}

/**
 * Creates a deterministic revision marker for freshness checks. This is not a
 * security hash; sessionStorage remains untrusted and is validated separately.
 */
export function createProfileFingerprint(profile: ProfileSession): string {
  const serialized = JSON.stringify(stableProfileProjection(profile));
  let hash = 2_166_136_261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return "profile-fnv1a-" + (hash >>> 0).toString(16).padStart(8, "0");
}

export function isCompletedProfileSession(
  profile: ProfileSession | null,
): profile is ProfileSession {
  if (
    !profile ||
    !profile.profileComplete ||
    profile.counts.unresolvedConflicts !== 0 ||
    profile.confirmedFields.length === 0 ||
    profile.counts.fieldsConfirmed !== profile.confirmedFields.length ||
    profile.counts.documentsReviewed !== profile.documents.length
  ) {
    return false;
  }

  const recognizedDocuments = new Map(
    profile.documents
      .filter(
        (document) =>
          document.reviewState === "reviewed" && document.sampleKind !== null,
      )
      .map((document) => [document.id, document]),
  );

  if (recognizedDocuments.size === 0) {
    return false;
  }

  return profile.confirmedFields.every((field) =>
    field.sources.every((source) => {
      const document = recognizedDocuments.get(source.sourceDocumentId);
      return document?.name === source.sourceDocumentName;
    }),
  );
}
