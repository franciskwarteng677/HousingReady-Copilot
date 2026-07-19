import {
  currencyFieldIds,
  dateFieldIds,
  profileSessionSchema,
  supportedPayFrequencySchema,
  type ApprovedFieldId,
  type ConfirmedProfileField,
  type ProfileCorrection,
  type ProfileSession,
} from "@/lib/profile-schema";
import {
  formatCurrencyFromCents,
  parseCurrencyToCents,
} from "@/lib/income-calculation";

const MAX_CONFIRMED_TEXT_LENGTH = 500;
const unsafeMarkupPattern = /[<>]|javascript\s*:|data\s*:\s*text\/html/i;
const unsafeControlCharacterPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type ValidatedConfirmedValue = {
  value: string;
  valueCents: number | null;
};

export type ConfirmedValueValidationResult =
  | { ok: true; value: ValidatedConfirmedValue }
  | { ok: false; error: string };

export type ApplyProfileCorrectionResult =
  | {
      ok: true;
      session: ProfileSession;
      correction: ProfileCorrection;
    }
  | { ok: false; error: string };

export function isCurrencyField(fieldId: ApprovedFieldId): boolean {
  return currencyFieldIds.some((candidate) => candidate === fieldId);
}

export function isDateField(fieldId: ApprovedFieldId): boolean {
  return dateFieldIds.some((candidate) => candidate === fieldId);
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateDate(value: string): string | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    return isValidCalendarDate(year, month, day) ? value : null;
  }

  const readableMatch = new RegExp(
    `^(${monthNames.join("|")})\\s+([1-9]|[12]\\d|3[01]),\\s*(\\d{4})$`,
    "i",
  ).exec(value);
  if (!readableMatch) {
    return null;
  }

  const monthIndex = monthNames.findIndex(
    (month) => month.toLowerCase() === readableMatch[1]?.toLowerCase(),
  );
  const day = Number(readableMatch[2]);
  const year = Number(readableMatch[3]);

  if (monthIndex < 0 || !isValidCalendarDate(year, monthIndex + 1, day)) {
    return null;
  }

  return `${monthNames[monthIndex]} ${day}, ${year}`;
}

export function validateConfirmedFieldValue(
  fieldId: ApprovedFieldId,
  rawValue: string,
): ConfirmedValueValidationResult {
  const trimmed = rawValue.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return { ok: false, error: "Enter a value before saving the correction." };
  }

  if (trimmed.length > MAX_CONFIRMED_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Keep the confirmed value to ${MAX_CONFIRMED_TEXT_LENGTH} characters or fewer.`,
    };
  }

  if (
    unsafeMarkupPattern.test(trimmed) ||
    unsafeControlCharacterPattern.test(trimmed)
  ) {
    return {
      ok: false,
      error: "Markup, scripts, and control characters are not allowed.",
    };
  }

  if (isCurrencyField(fieldId)) {
    try {
      const valueCents = parseCurrencyToCents(trimmed);
      return {
        ok: true,
        value: {
          value: formatCurrencyFromCents(valueCents),
          valueCents,
        },
      };
    } catch {
      return {
        ok: false,
        error:
          "Enter a valid non-negative currency amount, such as $1,700.00.",
      };
    }
  }

  if (isDateField(fieldId)) {
    const validatedDate = validateDate(trimmed);
    return validatedDate
      ? { ok: true, value: { value: validatedDate, valueCents: null } }
      : {
          ok: false,
          error:
            "Enter a valid date in YYYY-MM-DD or Month D, YYYY format.",
        };
  }

  if (fieldId === "payFrequency") {
    const canonicalFrequency = supportedPayFrequencySchema.options.find(
      (frequency) => frequency.toLowerCase() === trimmed.toLowerCase(),
    );

    return canonicalFrequency
      ? {
          ok: true,
          value: { value: canonicalFrequency, valueCents: null },
        }
      : {
          ok: false,
          error:
            "Choose a supported pay frequency: Weekly, Biweekly, Semimonthly, or Monthly.",
        };
  }

  return { ok: true, value: { value: trimmed, valueCents: null } };
}

export function confirmedValuesMatch(
  field: Pick<ConfirmedProfileField, "value" | "valueCents">,
  candidate: ValidatedConfirmedValue,
): boolean {
  return field.valueCents !== null || candidate.valueCents !== null
    ? field.valueCents === candidate.valueCents
    : field.value.trim().toLocaleLowerCase("en-US") ===
        candidate.value.trim().toLocaleLowerCase("en-US");
}

export function applyConfirmedProfileCorrection(
  session: ProfileSession,
  reviewGroupId: string,
  rawValue: string,
  updatedAt = new Date().toISOString(),
): ApplyProfileCorrectionResult {
  const field = session.confirmedFields.find(
    (candidate) => candidate.reviewGroupId === reviewGroupId,
  );

  if (!field) {
    return { ok: false, error: "The confirmed field is no longer available." };
  }

  const validation = validateConfirmedFieldValue(field.fieldId, rawValue);
  if (!validation.ok) {
    return validation;
  }

  if (confirmedValuesMatch(field, validation.value)) {
    return {
      ok: false,
      error: "Change the value before saving a correction.",
    };
  }

  const revision = session.revision + 1;
  const correction = {
    revision,
    updatedAt,
    changedFieldId: field.fieldId,
    reviewGroupId: field.reviewGroupId,
    label: field.label,
    previousConfirmedValue: field.value,
    newConfirmedValue: validation.value.value,
    previousValueCents: field.valueCents,
    newValueCents: validation.value.valueCents,
  } satisfies ProfileCorrection;

  const nextSession = profileSessionSchema.parse({
    ...session,
    revision,
    correctionHistory: [...session.correctionHistory, correction],
    confirmedFields: session.confirmedFields.map((candidate) =>
      candidate.reviewGroupId === reviewGroupId
        ? {
            ...candidate,
            value: validation.value.value,
            valueCents: validation.value.valueCents,
            confirmationOrigin: "renter-corrected" as const,
            confirmedAt: updatedAt,
          }
        : candidate,
    ),
    updatedAt,
  });

  return { ok: true, session: nextSession, correction };
}

export function formatCorrectionAudit(correction: ProfileCorrection): string {
  return `${correction.label} corrected from ${correction.previousConfirmedValue} to ${correction.newConfirmedValue}.`;
}

export function carryForwardProfileRevision(
  previous: ProfileSession | null,
  reviewed: ProfileSession,
  updatedAt = reviewed.updatedAt,
): ProfileSession {
  if (!previous) {
    return reviewed;
  }

  let revision = previous.revision;
  const correctionHistory = [...previous.correctionHistory];
  const confirmedFields = reviewed.confirmedFields.map((field) => {
    const prior = previous.confirmedFields.find(
      (candidate) => candidate.reviewGroupId === field.reviewGroupId,
    );
    if (!prior) {
      return field;
    }

    if (
      confirmedValuesMatch(prior, {
        value: field.value,
        valueCents: field.valueCents,
      })
    ) {
      return {
        ...field,
        confirmationOrigin: prior.confirmationOrigin,
        confirmedAt: prior.confirmedAt,
      };
    }

    revision += 1;
    correctionHistory.push({
      revision,
      updatedAt,
      changedFieldId: field.fieldId,
      reviewGroupId: field.reviewGroupId,
      label: field.label,
      previousConfirmedValue: prior.value,
      newConfirmedValue: field.value,
      previousValueCents: prior.valueCents,
      newValueCents: field.valueCents,
    });

    return {
      ...field,
      confirmationOrigin: "renter-corrected" as const,
      confirmedAt: updatedAt,
    };
  });

  return profileSessionSchema.parse({
    ...reviewed,
    revision,
    correctionHistory,
    confirmedFields,
    updatedAt,
  });
}

export function confirmationOriginLabel(
  origin: ConfirmedProfileField["confirmationOrigin"],
): string {
  if (origin === "renter-corrected") {
    return "Corrected and confirmed by renter";
  }

  if (origin === "extracted") {
    return "Extracted and confirmed by renter";
  }

  return "Confirmed in an earlier session; correction history unavailable";
}
