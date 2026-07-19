import {
  CheckCircle2,
  CircleAlert,
  FileQuestion,
  TriangleAlert,
} from "lucide-react";
import type {
  DocumentReadinessEvaluation,
  DocumentReadinessStatus,
} from "@/lib/readiness/checklist";

type DocumentReadinessResultsProps = {
  evaluation: DocumentReadinessEvaluation;
  acknowledged: boolean;
  disabled: boolean;
  onAcknowledgementChange: (acknowledged: boolean) => void;
};

const statusPresentation: Record<
  DocumentReadinessStatus,
  {
    label: string;
    className: string;
    Icon: typeof CheckCircle2;
  }
> = {
  present: {
    label: "Present",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    Icon: CheckCircle2,
  },
  missing: {
    label: "Missing",
    className: "border-amber-200 bg-sun-soft text-amber-950",
    Icon: CircleAlert,
  },
  needs_review: {
    label: "Needs review",
    className: "border-sky-200 bg-sky-50 text-sky-950",
    Icon: TriangleAlert,
  },
};

function formatSampleKind(sampleKind: string | null): string | null {
  if (!sampleKind) {
    return null;
  }

  return sampleKind
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function DocumentReadinessResults({
  evaluation,
  acknowledged,
  disabled,
  onAcknowledgementChange,
}: DocumentReadinessResultsProps) {
  return (
    <section
      aria-labelledby="document-readiness-results-title"
      className="rounded-2xl border border-brand/15 bg-white/95 p-6 shadow-card ring-1 ring-white/70"
    >
      <FileQuestion aria-hidden="true" size={23} className="text-brand" />
      <h2
        id="document-readiness-results-title"
        className="mt-4 text-xl font-bold text-ink"
      >
        Document-readiness results
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        These repeatable results use only confirmed structured Profile values
        and retained document metadata. They do not use income amounts, the HUD
        comparison, protected characteristics, or inferred household details.
      </p>
      <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-sun-soft px-3 py-2 text-sm font-bold text-amber-950">
        <TriangleAlert aria-hidden="true" size={17} />
        {evaluation.prototypeLabel}
      </p>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {evaluation.results.map((result) => {
          const presentation = statusPresentation[result.status];
          const StatusIcon = presentation.Icon;

          return (
            <article
              key={result.requirementId}
              className="min-w-0 rounded-xl border border-line bg-canvas/80 p-4 shadow-sm transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-ink">{result.title}</h3>
                <p
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${presentation.className}`}
                >
                  <StatusIcon aria-hidden="true" size={15} />
                  Status: {presentation.label}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {result.explanation}
              </p>

              {result.supportingDocuments.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-[0.07em] text-slate-500">
                    {result.status === "present"
                      ? "Supporting confirmed document metadata"
                      : "Potential metadata requiring Profile review"}
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {result.supportingDocuments.map((document) => {
                      const metadataType =
                        document.normalizedDocumentType ??
                        formatSampleKind(document.sampleKind) ??
                        "Exact provided synthetic sample filename";

                      return (
                        <li
                          key={document.documentId}
                          className="rounded-lg border border-line bg-white p-3 text-xs leading-5 text-slate-700"
                        >
                          <span className="block break-words font-bold text-ink">
                            {document.documentName}
                          </span>
                          <span className="block">
                            Retained metadata match: {metadataType}
                          </span>
                          <span className="block">
                            Profile review status: {document.reviewState}
                          </span>
                          <span className="block">
                            Retained source page: {" "}
                            {document.sourcePages.length > 0
                              ? document.sourcePages.join(", ")
                              : "None"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm font-bold text-slate-700">
                  No matching confirmed document metadata
                </p>
              )}

              <dl className="mt-4 space-y-1 border-t border-line pt-3 text-xs leading-5 text-slate-600">
                <div>
                  <dt className="inline font-bold">Checklist source: </dt>
                  <dd className="inline">{result.sourceClassification}</dd>
                </div>
                <div>
                  <dt className="inline font-bold">Checklist version: </dt>
                  <dd className="inline break-all">{result.checklistVersion}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-700">
        {evaluation.disclaimer}
      </p>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-brand/30 bg-[linear-gradient(135deg,#e8f5f1,#f0f9ff)] p-4 shadow-sm outline-none transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md focus-within:ring-4 focus-within:ring-teal-200">
        <input
          type="checkbox"
          aria-label="I reviewed the document-readiness results"
          checked={acknowledged}
          disabled={disabled}
          onChange={(event) =>
            onAcknowledgementChange(event.target.checked)
          }
          className="mt-1 size-5 shrink-0 accent-brand"
        />
        <span>
          <span className="block font-bold text-ink">
            I reviewed the document-readiness results
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            This records only your review action for the current Profile
            revision and checklist version. It does not certify a document or
            make a housing decision.
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark">
            {acknowledged ? (
              <CheckCircle2 aria-hidden="true" size={15} />
            ) : (
              <CircleAlert aria-hidden="true" size={15} />
            )}
            Status: {acknowledged ? "Reviewed by renter" : "Not reviewed"}
          </span>
        </span>
      </label>
    </section>
  );
}
