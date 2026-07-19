import { z } from "zod";
import {
  approvedFieldIdSchema,
  confirmedFieldSourceSchema,
  profileSessionSchema,
  storedDocumentMetadataSchema,
  type ExtractedField,
  type ProfileSession,
} from "@/lib/profile-schema";
import { validateConfirmedFieldValue } from "@/lib/profile-corrections";
import {
  getProfileProgress,
  projectConfirmedFields,
} from "@/lib/review-state";
import { invalidateUnderstandSessionForProfileChange } from "@/lib/understand-session";
import type { ReviewDocument } from "@/types/profile";

export const HOUSINGREADY_SESSION_PREFIX = "housingready:";
export const PROFILE_SESSION_KEY = "housingready:profile:v3";
export const LEGACY_PROFILE_V2_SESSION_KEY = "housingready:profile:v2";
export const LEGACY_PROFILE_SESSION_KEY = "housingready:profile:v1";
export const LEGACY_SESSION_KEY = "housingready-copilot-session";

export const SESSION_DELETED_EVENT = "housingready:session-deleted";
export const SESSION_ACTIVE_EVENT = "housingready:session-active";
export const PROFILE_UPDATED_EVENT = "housingready:profile-updated";

const legacyConfirmedProfileFieldSchema = z
  .object({
    fieldId: approvedFieldIdSchema,
    reviewGroupId: z.string().min(1),
    label: z.string().min(1),
    value: z.string().min(1),
    sources: z.array(confirmedFieldSourceSchema).min(1),
    confirmedAt: z.string().datetime(),
  })
  .strict();

const profileCountsV2Schema = z
  .object({
    documentsReviewed: z.number().int().nonnegative(),
    fieldsConfirmed: z.number().int().nonnegative(),
    fieldsExcluded: z.number().int().nonnegative(),
    unresolvedConflicts: z.number().int().nonnegative(),
  })
  .strict();

const legacyProfileV2Schema = z
  .object({
    version: z.literal(2),
    documents: z.array(storedDocumentMetadataSchema),
    confirmedFields: z.array(legacyConfirmedProfileFieldSchema),
    profileComplete: z.boolean(),
    counts: profileCountsV2Schema,
    updatedAt: z.string().datetime(),
  })
  .strict();

const legacyProfileSessionSchema = legacyProfileV2Schema
  .omit({ version: true, counts: true })
  .extend({
    version: z.literal(1),
    counts: z
      .object({
        documentsReviewed: z.number().int().nonnegative(),
        fieldsConfirmed: z.number().int().nonnegative(),
        fieldsExcludedOrUnresolved: z.number().int().nonnegative(),
        unresolvedConflicts: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export function createProfileSession(
  documents: readonly ReviewDocument[],
  fields: readonly ExtractedField[],
  updatedAt = new Date().toISOString(),
): ProfileSession {
  const progress = getProfileProgress(documents, fields);

  return profileSessionSchema.parse({
    version: 3,
    revision: 1,
    correctionHistory: [],
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
      fieldsExcluded: progress.fieldsExcluded,
      unresolvedConflicts: progress.unresolvedConflictGroupIds.length,
    },
    updatedAt,
  });
}

type LegacyProfileV2 = z.infer<typeof legacyProfileV2Schema>;

function migrateV2Profile(legacy: LegacyProfileV2): ProfileSession {
  return profileSessionSchema.parse({
    ...legacy,
    version: 3,
    revision: 1,
    correctionHistory: [],
    confirmedFields: legacy.confirmedFields.map((field) => {
      const validated = validateConfirmedFieldValue(field.fieldId, field.value);
      if (!validated.ok) {
        throw new Error(validated.error);
      }

      return {
        ...field,
        value: validated.value.value,
        valueCents: validated.value.valueCents,
        confirmationOrigin: "legacy-confirmed" as const,
      };
    }),
  });
}

export function saveProfileSession(
  storage: Storage,
  session: ProfileSession,
): void {
  const validated = profileSessionSchema.parse(session);
  invalidateUnderstandSessionForProfileChange(storage, validated);
  storage.setItem(PROFILE_SESSION_KEY, JSON.stringify(validated));
}

export function loadProfileSession(storage: Storage): ProfileSession | null {
  const serialized = storage.getItem(PROFILE_SESSION_KEY);

  if (serialized) {
    try {
      return profileSessionSchema.parse(JSON.parse(serialized));
    } catch {
      storage.removeItem(PROFILE_SESSION_KEY);
    }
  }

  const versionTwoSerialized = storage.getItem(
    LEGACY_PROFILE_V2_SESSION_KEY,
  );
  if (versionTwoSerialized) {
    try {
      const migrated = migrateV2Profile(
        legacyProfileV2Schema.parse(JSON.parse(versionTwoSerialized)),
      );
      storage.setItem(PROFILE_SESSION_KEY, JSON.stringify(migrated));
      storage.removeItem(LEGACY_PROFILE_V2_SESSION_KEY);
      return migrated;
    } catch {
      storage.removeItem(LEGACY_PROFILE_V2_SESSION_KEY);
    }
  }

  const legacySerialized = storage.getItem(LEGACY_PROFILE_SESSION_KEY);
  if (!legacySerialized) {
    return null;
  }

  try {
    const legacy = legacyProfileSessionSchema.parse(
      JSON.parse(legacySerialized),
    );

    // A completed v1 profile had no pending fields or conflicts, so its old
    // combined count is exactly the excluded-candidate count. Incomplete v1
    // sessions cannot be split reliably and are intentionally discarded.
    if (!legacy.profileComplete || legacy.counts.unresolvedConflicts !== 0) {
      storage.removeItem(LEGACY_PROFILE_SESSION_KEY);
      return null;
    }

    const migrated = migrateV2Profile(legacyProfileV2Schema.parse({
      ...legacy,
      version: 2,
      counts: {
        documentsReviewed: legacy.counts.documentsReviewed,
        fieldsConfirmed: legacy.counts.fieldsConfirmed,
        fieldsExcluded: legacy.counts.fieldsExcludedOrUnresolved,
        unresolvedConflicts: legacy.counts.unresolvedConflicts,
      },
    }));
    storage.setItem(PROFILE_SESSION_KEY, JSON.stringify(migrated));
    storage.removeItem(LEGACY_PROFILE_SESSION_KEY);
    return migrated;
  } catch {
    storage.removeItem(LEGACY_PROFILE_SESSION_KEY);
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
