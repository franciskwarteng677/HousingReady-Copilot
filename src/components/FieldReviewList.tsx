"use client";

import {
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  CircleOff,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SourceEvidence } from "@/components/SourceEvidence";
import {
  isCurrencyField,
  validateConfirmedFieldValue,
} from "@/lib/profile-corrections";
import { supportedPayFrequencySchema, type ExtractedField } from "@/lib/profile-schema";
import { groupReviewFields, normalizeFieldValue } from "@/lib/review-state";

type FieldReviewListProps = {
  fields: readonly ExtractedField[];
  onCorrect: (candidateId: string, value: string) => void;
  onConfirm: (candidateId: string) => void;
  onExclude: (candidateId: string) => void;
  onRestore: (candidateId: string) => void;
  onRetain: (candidateId: string) => void;
  onConfirmAll: () => void;
};

function FieldStatus({ field }: { field: ExtractedField }) {
  if (field.decision === "excluded") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
        <CircleOff aria-hidden="true" size={15} />
        Excluded
      </span>
    );
  }

  if (field.status === "confirmed") {
    const corrected =
      normalizeFieldValue(field.fieldId, field.originalValue) !==
      normalizeFieldValue(field.fieldId, field.confirmedValue);

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-dark">
        {corrected ? (
          <Pencil aria-hidden="true" size={15} />
        ) : (
          <CheckCircle2 aria-hidden="true" size={15} />
        )}
        {corrected ? "Corrected and confirmed by renter" : "Confirmed"}
      </span>
    );
  }

  if (field.status === "corrected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1 text-xs font-bold text-amber-800">
        <Pencil aria-hidden="true" size={15} />
        Corrected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      <CircleDashed aria-hidden="true" size={15} />
      Extracted
    </span>
  );
}

type FieldCandidateCardProps = {
  field: ExtractedField;
  candidateNumber: number;
  candidateCount: number;
  groupHasConflict: boolean;
  onCorrect: (candidateId: string, value: string) => void;
  onConfirm: (candidateId: string) => void;
  onExclude: (candidateId: string) => void;
  onRestore: (candidateId: string) => void;
  onRetain: (candidateId: string) => void;
};

function FieldCandidateCard({
  field,
  candidateNumber,
  candidateCount,
  groupHasConflict,
  onCorrect,
  onConfirm,
  onExclude,
  onRestore,
  onRetain,
}: FieldCandidateCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(field.confirmedValue);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const isExcluded = field.decision === "excluded";
  const inputId = "confirmed-value-" + field.candidateId.replace(/[^a-z0-9]/gi, "-");
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  function beginEdit() {
    setDraftValue(field.confirmedValue);
    setError("");
    setEditing(true);
  }

  function cancelEdit() {
    setDraftValue(field.confirmedValue);
    setError("");
    setEditing(false);
  }

  function saveCorrection() {
    const validation = validateConfirmedFieldValue(field.fieldId, draftValue);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const current = validateConfirmedFieldValue(
      field.fieldId,
      field.confirmedValue,
    );
    if (
      current.ok &&
      current.value.valueCents === validation.value.valueCents &&
      current.value.value.toLocaleLowerCase("en-US") ===
        validation.value.value.toLocaleLowerCase("en-US")
    ) {
      setError("Change the value before saving a correction.");
      return;
    }

    onCorrect(field.candidateId, validation.value.value);
    setDraftValue(validation.value.value);
    setError("");
    setEditing(false);
  }

  return (
    <article
      className={
        "rounded-xl border p-4 sm:p-5 " +
        (isExcluded
          ? "border-slate-200 bg-slate-50"
          : "border-line bg-white")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-ink">
            {field.label}
            {candidateCount > 1
              ? " - candidate " + candidateNumber
              : ""}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Source: {field.sourceDocumentName}, page {field.sourcePage}
          </p>
        </div>
        <FieldStatus field={field} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-canvas p-3">
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Extracted value
          </dt>
          <dd className="mt-1 break-words font-bold text-ink">
            {field.originalValue}
          </dd>
        </div>
        <div className="rounded-lg bg-canvas p-3">
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            Extraction confidence
          </dt>
          <dd className="mt-1 font-bold text-ink">
            {Math.round(field.confidence * 100)}%
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <label htmlFor={inputId} className="text-sm font-bold text-ink">
          Value to confirm
        </label>
        {editing && field.fieldId === "payFrequency" ? (
          <select
            ref={(element) => {
              inputRef.current = element;
            }}
            id={inputId}
            value={draftValue}
            aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
            aria-invalid={error ? "true" : undefined}
            onChange={(event) => setDraftValue(event.target.value)}
            className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-teal-200"
          >
            {supportedPayFrequencySchema.options.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequency}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={(element) => {
              inputRef.current = element;
            }}
            id={inputId}
            type="text"
            inputMode={isCurrencyField(field.fieldId) ? "decimal" : undefined}
            value={editing ? draftValue : field.confirmedValue}
            readOnly={!editing}
            disabled={isExcluded}
            aria-describedby={editing ? `${helpId}${error ? ` ${errorId}` : ""}` : undefined}
            aria-invalid={error ? "true" : undefined}
            onChange={(event) => setDraftValue(event.target.value)}
            className="mt-2 block min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none read-only:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-500 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-teal-200"
          />
        )}
        {editing ? (
          <p id={helpId} className="mt-2 text-xs leading-5 text-slate-500">
            Save validates this draft. You must still select Confirm afterward.
          </p>
        ) : null}
        {error ? (
          <p
            id={errorId}
            className="mt-2 flex items-start gap-2 text-sm font-bold text-rose-700"
            role="alert"
          >
            <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <SourceEvidence sourceText={field.sourceText} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isExcluded ? (
          <button
            type="button"
            onClick={() => onRestore(field.candidateId)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-200"
          >
            <RotateCcw aria-hidden="true" size={16} />
            Restore candidate
          </button>
        ) : (
          <>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={saveCorrection}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
                  aria-label={`Save correction for ${field.label} from ${field.sourceDocumentName}`}
                >
                  <Save aria-hidden="true" size={16} />
                  Save correction
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-200"
                >
                  <X aria-hidden="true" size={16} />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={beginEdit}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-200"
                  aria-label={`Edit ${field.label} from ${field.sourceDocumentName}`}
                >
                  <Pencil aria-hidden="true" size={16} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onConfirm(field.candidateId)}
                  disabled={
                    field.confirmedValue.trim().length === 0 ||
                    field.status === "confirmed"
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300"
                  aria-label={
                    "Confirm " +
                    field.label +
                    " from " +
                    field.sourceDocumentName
                  }
                >
                  <CheckCircle2 aria-hidden="true" size={16} />
                  {field.status === "confirmed" ? "Confirmed" : "Confirm"}
                </button>
              </>
            )}
            {!editing && groupHasConflict ? (
              <button
                type="button"
                onClick={() => onRetain(field.candidateId)}
                disabled={field.confirmedValue.trim().length === 0}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-sun-soft px-3 py-2 text-sm font-bold text-amber-900 outline-none hover:bg-amber-100 focus-visible:ring-4 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={
                  "Retain " +
                  field.confirmedValue +
                  " for " +
                  field.label +
                  " and exclude the other candidates"
                }
              >
                <TriangleAlert aria-hidden="true" size={16} />
                Retain this value
              </button>
            ) : null}
            {!editing ? (
              <button
                type="button"
                onClick={() => onExclude(field.candidateId)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-200"
                aria-label={
                  "Exclude " +
                  field.label +
                  " from " +
                  field.sourceDocumentName
                }
              >
                <CircleOff aria-hidden="true" size={16} />
                Exclude
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

export function FieldReviewList({
  fields,
  onCorrect,
  onConfirm,
  onExclude,
  onRestore,
  onRetain,
  onConfirmAll,
}: FieldReviewListProps) {
  const groups = groupReviewFields(fields);

  return (
    <section
      aria-labelledby="field-review-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-brand">
            <Sparkles aria-hidden="true" size={17} />
            Demo extraction for the provided synthetic sample documents
          </p>
          <h2
            id="field-review-heading"
            className="mt-2 text-xl font-bold text-ink"
          >
            Review and confirm extracted fields
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Inspect every value and its evidence. Edit incorrect values,
            confirm retained values, or intentionally exclude a candidate.
          </p>
        </div>
        <button
          type="button"
          onClick={onConfirmAll}
          disabled={fields.length === 0}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white outline-none hover:bg-ink-soft focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <CheckCircle2 aria-hidden="true" size={17} />
          Confirm all reviewed fields
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-canvas p-4 text-sm text-slate-600">
          No demo fields are available yet. Upload one of the provided
          synthetic samples.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((group, groupIndex) => {
            const headingId = "review-group-" + groupIndex;

            return (
              <section
                key={group.reviewGroupId}
                aria-labelledby={headingId}
                className="rounded-2xl border border-line bg-canvas p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id={headingId} className="text-lg font-bold text-ink">
                    {group.label}
                  </h3>
                  {group.fields.length > 1 ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                      {group.fields.length} candidate values
                    </span>
                  ) : null}
                </div>

                {group.hasConflict ? (
                  <div
                    className="mt-4 rounded-xl border border-amber-300 bg-sun-soft p-4"
                    role="alert"
                  >
                    <p className="flex items-center gap-2 font-bold text-amber-900">
                      <TriangleAlert aria-hidden="true" size={18} />
                      Conflict: candidate values differ
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      Review every source, then choose “Retain this value” for
                      the value that should be saved.
                    </p>
                  </div>
                ) : group.fields.length > 1 ? (
                  <p className="mt-4 rounded-xl border border-line bg-white p-3 text-sm text-slate-700">
                    Matching values were found in multiple documents. Every
                    candidate and source is shown below.
                  </p>
                ) : null}

                <div className="mt-4 space-y-4">
                  {group.fields.map((field, candidateIndex) => (
                    <FieldCandidateCard
                      key={field.candidateId}
                      field={field}
                      candidateNumber={candidateIndex + 1}
                      candidateCount={group.fields.length}
                      groupHasConflict={group.hasConflict}
                      onCorrect={onCorrect}
                      onConfirm={onConfirm}
                      onExclude={onExclude}
                      onRestore={onRestore}
                      onRetain={onRetain}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
