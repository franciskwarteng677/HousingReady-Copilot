"use client";

import {
  CheckCircle2,
  CircleAlert,
  FileWarning,
  History,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  applyConfirmedProfileCorrection,
  confirmedValuesMatch,
  confirmationOriginLabel,
  formatCorrectionAudit,
  isCurrencyField,
  isDateField,
  validateConfirmedFieldValue,
  type ValidatedConfirmedValue,
} from "@/lib/profile-corrections";
import {
  supportedPayFrequencySchema,
  type ConfirmedProfileField,
  type ProfileCorrection,
  type ProfileSession,
} from "@/lib/profile-schema";

type RestoredProfileEditorProps = {
  session: ProfileSession;
  availablePreviewDocumentNames?: readonly string[];
  onConfirmedCorrection: (
    nextSession: ProfileSession,
    correction: ProfileCorrection,
  ) => void;
  onPendingChange: (pending: boolean) => void;
};

type PendingCorrection = {
  reviewGroupId: string;
  label: string;
  previousValue: string;
  validatedValue: ValidatedConfirmedValue;
};

const previewUnavailableMessage =
  "Original document preview is unavailable in this restored session. Re-upload the synthetic sample to inspect the original evidence.";

function fieldInputHelp(field: ConfirmedProfileField): string {
  if (isCurrencyField(field.fieldId)) {
    return "Enter a non-negative US-dollar amount. It will be stored as integer cents.";
  }

  if (isDateField(field.fieldId)) {
    return "Use YYYY-MM-DD or Month D, YYYY format.";
  }

  if (field.fieldId === "payFrequency") {
    return "Choose one of the supported pay frequencies.";
  }

  return "Enter plain text without markup or scripts.";
}

export function RestoredProfileEditor({
  session,
  availablePreviewDocumentNames = [],
  onConfirmedCorrection,
  onPendingChange,
}: RestoredProfileEditorProps) {
  const [open, setOpen] = useState(false);
  const [editingReviewGroupId, setEditingReviewGroupId] = useState<
    string | null
  >(null);
  const [draftValue, setDraftValue] = useState("");
  const [pendingCorrection, setPendingCorrection] =
    useState<PendingCorrection | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const availablePreviewNames = new Set(availablePreviewDocumentNames);

  function clearPendingState() {
    setEditingReviewGroupId(null);
    setPendingCorrection(null);
    setDraftValue("");
    setError("");
    onPendingChange(false);
  }

  function toggleEditor() {
    if (open) {
      clearPendingState();
      setAnnouncement("Confirmed-value editing closed. No unconfirmed edit was saved.");
    }
    setOpen((current) => !current);
  }

  function beginEdit(field: ConfirmedProfileField) {
    setEditingReviewGroupId(field.reviewGroupId);
    setDraftValue(field.value);
    setPendingCorrection(null);
    setError("");
    onPendingChange(true);
    setAnnouncement(`${field.label} is ready to edit.`);
  }

  function cancelEdit(label: string) {
    clearPendingState();
    setAnnouncement(`${label} edit was canceled. The confirmed value did not change.`);
  }

  function saveCorrection(
    event: FormEvent<HTMLFormElement>,
    field: ConfirmedProfileField,
  ) {
    event.preventDefault();
    const validation = validateConfirmedFieldValue(field.fieldId, draftValue);
    if (!validation.ok) {
      setError(validation.error);
      setAnnouncement(`${field.label} correction has an error.`);
      return;
    }

    if (confirmedValuesMatch(field, validation.value)) {
      setError("Change the value before saving a correction.");
      setAnnouncement(`${field.label} has not changed.`);
      return;
    }

    setPendingCorrection({
      reviewGroupId: field.reviewGroupId,
      label: field.label,
      previousValue: field.value,
      validatedValue: validation.value,
    });
    setEditingReviewGroupId(null);
    setError("");
    setAnnouncement(
      `${field.label} correction was validated but is not stored. Confirm it explicitly to update the Profile.`,
    );
  }

  function confirmCorrection() {
    if (!pendingCorrection) {
      return;
    }

    const result = applyConfirmedProfileCorrection(
      session,
      pendingCorrection.reviewGroupId,
      pendingCorrection.validatedValue.value,
    );
    if (!result.ok) {
      setError(result.error);
      setAnnouncement(`${pendingCorrection.label} correction could not be confirmed.`);
      return;
    }

    onConfirmedCorrection(result.session, result.correction);
    clearPendingState();
    setAnnouncement(
      `${result.correction.label} was corrected and confirmed by the renter.`,
    );
  }

  return (
    <div className="mt-6 border-t border-line pt-6">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink">Confirmed structured values</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Revision {session.revision}. Drafts stay in this page until you
            explicitly confirm a saved correction.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleEditor}
          aria-expanded={open}
          aria-controls="restored-profile-editor"
          className="link-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand bg-white px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand-soft"
        >
          {open ? <X aria-hidden="true" size={17} /> : <Pencil aria-hidden="true" size={17} />}
          {open ? "Close confirmed-value editor" : "Edit confirmed values"}
        </button>
      </div>

      {open ? (
        <div id="restored-profile-editor" className="mt-5 space-y-4">
          <div className="rounded-xl border border-amber-300 bg-sun-soft p-4">
            <p className="flex items-start gap-2 text-sm font-bold leading-6 text-amber-950">
              <FileWarning aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
              {availablePreviewNames.size > 0
                ? "A re-uploaded synthetic sample preview is available above for matching source names. Other restored previews remain unavailable."
                : previewUnavailableMessage}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Stored source names and page numbers remain visible. Original
              source text is not reconstructed.
            </p>
          </div>

          {session.confirmedFields.map((field) => {
            const isEditing = editingReviewGroupId === field.reviewGroupId;
            const isPending =
              pendingCorrection?.reviewGroupId === field.reviewGroupId;
            const errorId = `restored-edit-error-${field.reviewGroupId.replace(/[^a-z0-9]/gi, "-")}`;
            const helpId = `restored-edit-help-${field.reviewGroupId.replace(/[^a-z0-9]/gi, "-")}`;
            const inputId = `restored-edit-${field.reviewGroupId.replace(/[^a-z0-9]/gi, "-")}`;
            const previewAvailable = field.sources.some((source) =>
              availablePreviewNames.has(source.sourceDocumentName),
            );

            return (
              <article
                key={field.reviewGroupId}
                className="rounded-xl border border-line bg-canvas p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-ink">{field.label}</h4>
                    <p className="mt-1 break-words text-lg font-extrabold text-ink">
                      {field.value}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {field.confirmationOrigin === "renter-corrected" ? (
                      <Pencil aria-hidden="true" size={14} />
                    ) : (
                      <CheckCircle2 aria-hidden="true" size={14} />
                    )}
                    {confirmationOriginLabel(field.confirmationOrigin)}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Confirmed source{field.sources.length === 1 ? "" : "s"}
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {field.sources.map((source) => (
                      <li key={`${source.sourceDocumentId}:${source.sourcePage}`}>
                        {source.sourceDocumentName}, page {source.sourcePage}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {previewAvailable
                    ? "A re-uploaded synthetic sample preview is available above. Its fresh extraction is reconciled separately and cannot overwrite this confirmed value without your choice."
                    : previewUnavailableMessage}
                </p>

                {isEditing ? (
                  <form
                    className="mt-4 rounded-lg border border-brand/30 bg-white p-4"
                    onSubmit={(event) => saveCorrection(event, field)}
                  >
                    <label htmlFor={inputId} className="text-sm font-bold text-ink">
                      New confirmed {field.label.toLowerCase()}
                    </label>
                    {field.fieldId === "payFrequency" ? (
                      <select
                        id={inputId}
                        value={draftValue}
                        aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
                        aria-invalid={error ? "true" : undefined}
                        onChange={(event) => setDraftValue(event.target.value)}
                        className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-teal-200"
                      >
                        {supportedPayFrequencySchema.options.map((frequency) => (
                          <option key={frequency} value={frequency}>
                            {frequency}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={inputId}
                        type="text"
                        inputMode={isCurrencyField(field.fieldId) ? "decimal" : undefined}
                        value={draftValue}
                        aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
                        aria-invalid={error ? "true" : undefined}
                        onChange={(event) => setDraftValue(event.target.value)}
                        className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-teal-200"
                      />
                    )}
                    <p id={helpId} className="mt-2 text-xs leading-5 text-slate-500">
                      {fieldInputHelp(field)}
                    </p>
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
                      >
                        <Save aria-hidden="true" size={16} />
                        Save correction
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelEdit(field.label)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-200"
                      >
                        <X aria-hidden="true" size={16} />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : isPending && pendingCorrection ? (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-sun-soft p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
                      <CircleAlert aria-hidden="true" size={17} />
                      Correction awaiting explicit confirmation
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {pendingCorrection.previousValue} →{" "}
                      <strong>{pendingCorrection.validatedValue.value}</strong>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Session storage has not changed.
                    </p>
                    {error ? (
                      <p className="mt-2 text-sm font-bold text-rose-700" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={confirmCorrection}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
                      >
                        <CheckCircle2 aria-hidden="true" size={16} />
                        Confirm correction
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelEdit(field.label)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-200"
                      >
                        <X aria-hidden="true" size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => beginEdit(field)}
                    disabled={Boolean(editingReviewGroupId || pendingCorrection)}
                    className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <Pencil aria-hidden="true" size={16} />
                    Edit {field.label}
                  </button>
                )}
              </article>
            );
          })}

          <section aria-labelledby="correction-history-heading" className="rounded-xl border border-line bg-white p-4">
            <h4 id="correction-history-heading" className="flex items-center gap-2 font-bold text-ink">
              <History aria-hidden="true" size={17} className="text-brand" />
              Confirmed correction history
            </h4>
            {session.correctionHistory.length > 0 ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
                {session.correctionHistory.map((correction) => (
                  <li key={correction.revision}>
                    {formatCorrectionAudit(correction)} Revision {correction.revision},{" "}
                    <time dateTime={correction.updatedAt}>
                      {new Date(correction.updatedAt).toLocaleString("en-US")}
                    </time>
                    .
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                No revisioned corrections have been recorded in this Profile version.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
