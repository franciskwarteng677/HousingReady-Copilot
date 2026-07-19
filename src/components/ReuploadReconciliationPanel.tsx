"use client";

import {
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { confirmationOriginLabel } from "@/lib/profile-corrections";
import {
  applyReuploadChoices,
  buildReuploadComparisons,
  type ReuploadChoices,
} from "@/lib/profile-reconciliation";
import type {
  ExtractedField,
  ProfileCorrection,
  ProfileSession,
} from "@/lib/profile-schema";

type ReuploadReconciliationPanelProps = {
  session: ProfileSession;
  fields: readonly ExtractedField[];
  processing: boolean;
  onApply: (
    nextSession: ProfileSession,
    corrections: readonly ProfileCorrection[],
    retainedCount: number,
  ) => void;
  onDiscard: () => void;
};

export function ReuploadReconciliationPanel({
  session,
  fields,
  processing,
  onApply,
  onDiscard,
}: ReuploadReconciliationPanelProps) {
  const comparisons = useMemo(
    () => buildReuploadComparisons(session, fields),
    [fields, session],
  );
  const [choices, setChoices] = useState<ReuploadChoices>({});
  const [error, setError] = useState("");
  const unresolvedCount = comparisons.filter(
    (comparison) =>
      comparison.hasDifference && !choices[comparison.reviewGroupId],
  ).length;

  function applyReview() {
    const result = applyReuploadChoices(session, comparisons, choices);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    onApply(
      result.session,
      result.corrections,
      result.retainedCount,
    );
  }

  return (
    <section
      aria-labelledby="reupload-reconciliation-heading"
      className="rounded-2xl border border-brand/30 bg-white p-5 shadow-card sm:p-7"
    >
      <div className="rounded-xl border border-brand/30 bg-brand-soft p-4">
        <p className="flex items-center gap-2 font-bold text-brand-dark">
          <ShieldCheck aria-hidden="true" size={19} />
          Saved Profile protected
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Your previously confirmed Profile is still saved. Re-uploaded files
          are reviewed separately and will not replace confirmed corrections
          unless you explicitly apply a choice.
        </p>
      </div>

      <h2
        id="reupload-reconciliation-heading"
        className="mt-6 text-xl font-bold text-ink"
      >
        Reconcile re-uploaded values
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Compare fresh demo extraction with the saved structured Profile. The
        application never chooses between differing values for you.
      </p>

      {processing ? (
        <p className="mt-5 rounded-xl border border-line bg-canvas p-4 text-sm font-bold text-slate-700" role="status">
          Demo extraction is still processing. Saved Profile data has not changed.
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        {comparisons.map((comparison) => {
          const saved = comparison.savedField;
          const selected = choices[comparison.reviewGroupId];

          if (!saved) {
            return (
              <article
                key={comparison.reviewGroupId}
                className="rounded-xl border border-line bg-canvas p-4"
              >
                <h3 className="font-bold text-ink">{comparison.label}</h3>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  Status: New extracted field — not added automatically
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  This field was not in the saved Profile. Re-upload review will
                  not add it without a separate full confirmation workflow.
                </p>
              </article>
            );
          }

          return (
            <article
              key={comparison.reviewGroupId}
              className="rounded-xl border border-line bg-canvas p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{comparison.label}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {confirmationOriginLabel(saved.confirmationOrigin)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {comparison.hasDifference ? (
                    <CircleAlert aria-hidden="true" size={14} />
                  ) : (
                    <CheckCircle2 aria-hidden="true" size={14} />
                  )}
                  {comparison.hasDifference
                    ? "Choice required"
                    : "Matches saved confirmation"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-line bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Saved confirmed value
                  </p>
                  <p className="mt-1 font-extrabold text-ink">{saved.value}</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                    {saved.sources.map((source) => (
                      <li key={`${source.sourceDocumentId}:${source.sourcePage}`}>
                        {source.sourceDocumentName}, page {source.sourcePage}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-line bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Fresh extracted original
                  </p>
                  {comparison.extractedCandidates.map((candidate) => (
                    <div key={candidate.candidateId} className="mt-1">
                      <p className="font-extrabold text-ink">
                        {candidate.value.value}
                      </p>
                      <p className="text-xs leading-5 text-slate-600">
                        {candidate.sourceDocumentName}, page {candidate.sourcePage}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {comparison.hasDifference ? (
                <fieldset className="mt-4 rounded-lg border border-amber-300 bg-sun-soft p-4">
                  <legend className="px-1 text-sm font-bold text-amber-950">
                    Choose which {comparison.label.toLowerCase()} to retain
                  </legend>
                  <p className="mt-1 text-sm leading-6 text-slate-700" role="alert">
                    Saved {comparison.label.toLowerCase()} is {saved.value}. The
                    re-uploaded document shows a different value. HousingReady
                    Copilot will not choose for you.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm font-bold text-ink">
                    <input
                      type="radio"
                      name={`reconcile-${comparison.reviewGroupId}`}
                      checked={selected?.action === "retain"}
                      onChange={() =>
                        setChoices((current) => ({
                          ...current,
                          [comparison.reviewGroupId]: { action: "retain" },
                        }))
                      }
                      className="mt-0.5 size-4 accent-teal-700 focus-visible:ring-4 focus-visible:ring-teal-200"
                    />
                    Retain previously confirmed value {saved.value}
                  </label>
                  {comparison.extractedCandidates
                    .filter(
                      (candidate) =>
                        candidate.value.valueCents !== saved.valueCents ||
                        candidate.value.value.toLocaleLowerCase("en-US") !==
                          saved.value.toLocaleLowerCase("en-US"),
                    )
                    .map((candidate) => (
                      <label
                        key={candidate.candidateId}
                        className="mt-2 flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm font-bold text-ink"
                      >
                        <input
                          type="radio"
                          name={`reconcile-${comparison.reviewGroupId}`}
                          checked={
                            selected?.action === "restore" &&
                            selected.candidateId === candidate.candidateId
                          }
                          onChange={() =>
                            setChoices((current) => ({
                              ...current,
                              [comparison.reviewGroupId]: {
                                action: "restore",
                                candidateId: candidate.candidateId,
                              },
                            }))
                          }
                          className="mt-0.5 size-4 accent-teal-700 focus-visible:ring-4 focus-visible:ring-teal-200"
                        />
                        Restore extracted value {candidate.value.value} from{" "}
                        {candidate.sourceDocumentName}
                      </label>
                    ))}
                </fieldset>
              ) : null}
            </article>
          );
        })}
      </div>

      {!processing && comparisons.length === 0 ? (
        <p className="mt-5 rounded-xl border border-amber-300 bg-sun-soft p-4 text-sm font-bold text-amber-950" role="alert">
          No recognized sample fields are available to reconcile. The saved
          Profile remains unchanged.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 flex items-start gap-2 text-sm font-bold text-rose-700" role="alert">
          <CircleAlert aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <p id="reupload-apply-help" className="mt-5 text-sm leading-6 text-slate-600">
        {processing
          ? "Wait for extraction to finish."
          : unresolvedCount > 0
            ? `Resolve ${unresolvedCount} difference${unresolvedCount === 1 ? "" : "s"} before applying.`
            : comparisons.length === 0
              ? "Upload a recognized synthetic sample before applying."
              : "All differences are resolved. Applying preserves every unrelated saved field."}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={applyReview}
          disabled={processing || unresolvedCount > 0 || comparisons.length === 0}
          aria-describedby="reupload-apply-help"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          <FileCheck2 aria-hidden="true" size={17} />
          Apply reviewed choices
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-slate-200"
        >
          <X aria-hidden="true" size={17} />
          Discard re-upload changes
        </button>
      </div>

      {unresolvedCount === 0 && comparisons.length > 0 ? (
        <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-brand-dark">
          <RotateCcw aria-hidden="true" size={15} />
          Explicit choices are ready to apply
        </p>
      ) : null}
    </section>
  );
}
