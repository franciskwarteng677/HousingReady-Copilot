import {
  profileSessionSchema,
  type ExtractedField,
  type ProfileSession,
} from "@/lib/profile-schema";
import {
  getProfileProgress,
  projectConfirmedFields,
} from "@/lib/review-state";
import type { ReviewDocument } from "@/types/profile";

export const HOUSINGREADY_SESSION_PREFIX = "housingready:";
export const PROFILE_SESSION_KEY = "housingready:profile:v1";
export const LEGACY_SESSION_KEY = "housingready-copilot-session";

export const SESSION_DELETED_EVENT = "housingready:session-deleted";
export const SESSION_ACTIVE_EVENT = "housingready:session-active";
export const PROFILE_UPDATED_EVENT = "housingready:profile-updated";

export function createProfileSession(
  documents: readonly ReviewDocument[],
  fields: readonly ExtractedField[],
  updatedAt = new Date().toISOString(),
): ProfileSession {
  const progress = getProfileProgress(documents, fields);

  return profileSessionSchema.parse({
    version: 1,
    documents: documents
      .filter(
        (document) =>
          document.extractionState === "reviewed" ||
          document.extractionState === "no-call",
      )
      .map((document) => ({
        id: document.id,
        name: document.name,
        mimeType: document.mimeType,
        size: document.size,
        lastModified: document.lastModified,
        sampleKind: document.sampleKind,
        reviewState:
          document.extractionState === "reviewed" ? "reviewed" : "no-call",
      })),
    confirmedFields: projectConfirmedFields(fields, updatedAt),
    profileComplete: progress.profileComplete,
    counts: {
      documentsReviewed: progress.documentsReviewed,
      fieldsConfirmed: progress.fieldsConfirmed,
      fieldsExcludedOrUnresolved: progress.fieldsExcludedOrUnresolved,
      unresolvedConflicts: progress.unresolvedConflictGroupIds.length,
    },
    updatedAt,
  });
}

export function saveProfileSession(
  storage: Storage,
  session: ProfileSession,
): void {
  const validated = profileSessionSchema.parse(session);
  storage.setItem(PROFILE_SESSION_KEY, JSON.stringify(validated));
}

export function loadProfileSession(storage: Storage): ProfileSession | null {
  const serialized = storage.getItem(PROFILE_SESSION_KEY);

  if (!serialized) {
    return null;
  }

  try {
    return profileSessionSchema.parse(JSON.parse(serialized));
  } catch {
    storage.removeItem(PROFILE_SESSION_KEY);
    return null;
  }
}

export function clearHousingReadySession(storage: Storage): number {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => Boolean(key));
  const housingReadyKeys = keys.filter(
    (key) =>
      key.startsWith(HOUSINGREADY_SESSION_PREFIX) ||
      key.startsWith("housingready-copilot"),
  );

  for (const key of housingReadyKeys) {
    storage.removeItem(key);
  }

  return housingReadyKeys.length;
}
