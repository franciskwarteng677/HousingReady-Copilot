import {
  BadgeCheck,
  Calculator,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileText,
  Landmark,
  Scale,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import type {
  PacketConfirmedMoneyField,
  PacketConfirmedTextField,
  ReadinessPacketContent,
} from "@/lib/packet-content";

type ReadinessPacketPreviewProps = {
  packet: ReadinessPacketContent;
};

function sourceSummary(
  field: PacketConfirmedMoneyField | PacketConfirmedTextField | null,
): string {
  if (!field) {
    return "No confirmed value in the current Profile";
  }

  return field.sources
    .map((source) => `${source.documentName}, page ${source.page}`)
    .join("; ");
}

function ConfirmedValue({
  label,
  field,
  note,
}: {
  label: string;
  field: PacketConfirmedMoneyField | PacketConfirmedTextField | null;
  note?: string;
}) {
  const value = field
    ? "formattedAmount" in field
      ? field.formattedAmount
      : field.value
    : "Not confirmed in the current Profile";

  return (
    <div className="min-w-0 rounded-xl border border-line bg-canvas p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words font-extrabold text-ink">{value}</dd>
      {field ? (
        <dd className="mt-1 text-xs font-semibold text-brand-dark">
          Status: {field.confirmationStatus}
        </dd>
      ) : null}
      <dd className="mt-2 break-words text-xs leading-5 text-slate-600">
        Source: {sourceSummary(field)}
      </dd>
      {note ? (
        <dd className="mt-2 text-xs leading-5 text-slate-600">{note}</dd>
      ) : null}
    </div>
  );
}

export function ReadinessPacketPreview({
  packet,
}: ReadinessPacketPreviewProps) {
  const official = packet.sourceAndDecisionBoundaries.officialHudData;
  const arithmetic = packet.sourceAndDecisionBoundaries.productArithmetic;
  const policy = packet.sourceAndDecisionBoundaries.productPolicy;

  return (
    <section
      aria-labelledby="packet-preview-title"
      className="overflow-hidden rounded-2xl border border-brand/25 bg-white/95 shadow-[0_30px_75px_-48px_rgba(11,118,110,0.75)] ring-1 ring-white/70"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#153047,#123e4c_58%,#0b5d5b)] px-5 py-7 text-white sm:px-7">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full border-[28px] border-white/[0.04]"
        />
        <p className="inline-flex items-center gap-2 text-sm font-bold text-teal-200">
          <FileCheck2 aria-hidden="true" size={18} />
          Packet preview ready
        </p>
        <h2
          id="packet-preview-title"
          className="mt-2 text-2xl font-extrabold"
        >
          Packet preview
        </h2>
        <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.1em] text-teal-200">
          Cover
        </h3>
        <p className="mt-2 text-2xl font-extrabold sm:text-3xl">
          {packet.cover.packetTitle}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {packet.cover.productName} · Generated {packet.cover.generatedAtDisplay}
          {" · "}Profile revision {packet.cover.profileRevision}
        </p>
          <p className="relative mt-5 rounded-xl border border-amber-300/40 bg-amber-200/10 p-4 font-bold leading-6 text-amber-100 backdrop-blur-sm">
          {packet.cover.disclaimer}
        </p>
      </div>

      <div className="space-y-8 p-5 sm:p-7">
        <section aria-labelledby="packet-renter-title">
          <div className="flex items-center gap-2">
            <UserRound aria-hidden="true" size={21} className="text-brand" />
            <h3 id="packet-renter-title" className="text-xl font-bold text-ink">
              Confirmed renter information
            </h3>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ConfirmedValue
              label="Confirmed name"
              field={packet.renterInformation.fullName}
            />
            <ConfirmedValue
              label="Confirmed address"
              field={packet.renterInformation.address}
            />
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Household size
              </dt>
              <dd className="mt-1 font-extrabold text-ink">
                {packet.renterInformation.householdSize}
              </dd>
              <dd className="mt-1 text-xs font-semibold text-brand-dark">
                {packet.renterInformation.householdSizeStatus}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="packet-income-title">
          <div className="flex items-center gap-2">
            <FileText aria-hidden="true" size={21} className="text-brand" />
            <h3 id="packet-income-title" className="text-xl font-bold text-ink">
              Confirmed income-related information
            </h3>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ConfirmedValue
              label="Employer"
              field={packet.incomeInformation.employer}
            />
            <ConfirmedValue
              label="Gross pay"
              field={packet.incomeInformation.grossPay}
            />
            <ConfirmedValue
              label="Pay frequency"
              field={packet.incomeInformation.payFrequency}
            />
            <ConfirmedValue
              label="Net pay"
              field={packet.incomeInformation.netPay}
              note={packet.incomeInformation.netPayNote}
            />
            <ConfirmedValue
              label="Benefit type"
              field={packet.incomeInformation.benefitType}
            />
            <ConfirmedValue
              label="Monthly benefit"
              field={packet.incomeInformation.monthlyBenefit}
            />
          </dl>
        </section>

        <section
          aria-labelledby="packet-calculation-title"
          className="rounded-xl border border-brand/20 bg-brand-soft p-5"
        >
          <div className="flex items-center gap-2">
            <Calculator aria-hidden="true" size={21} className="text-brand" />
            <h3
              id="packet-calculation-title"
              className="text-xl font-bold text-ink"
            >
              Transparent annualised calculation
            </h3>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Employment
              </p>
              <p className="mt-2 break-words font-bold text-ink">
                {packet.annualisedCalculation.employment.substitution} ={" "}
                {packet.annualisedCalculation.employment.formattedResult}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Formula: {packet.annualisedCalculation.employment.formula}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Benefits
              </p>
              <p className="mt-2 break-words font-bold text-ink">
                {packet.annualisedCalculation.benefits.substitution} ={" "}
                {packet.annualisedCalculation.benefits.formattedResult}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Formula: {packet.annualisedCalculation.benefits.formula}
              </p>
            </div>
            <div className="rounded-xl border border-brand/30 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                Combined annualised amount
              </p>
              <p className="mt-2 text-xl font-extrabold text-brand-dark">
                {packet.annualisedCalculation.combined.formattedResult}
              </p>
              <p className="mt-1 break-words text-xs text-slate-600">
                {packet.annualisedCalculation.combined.substitution}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700">
            {packet.annualisedCalculation.explanation}
          </p>
        </section>

        <section
          aria-labelledby="packet-comparison-title"
          className="rounded-xl border border-sky-200 bg-sky-50 p-5"
        >
          <div className="flex items-center gap-2">
            <Scale aria-hidden="true" size={21} className="text-sky-800" />
            <h3
              id="packet-comparison-title"
              className="text-xl font-bold text-ink"
            >
              Verified HUD reference comparison
            </h3>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Rule year", String(packet.hudReferenceComparison.ruleYear)],
              ["Effective date", packet.hudReferenceComparison.effectiveDateDisplay],
              ["Household size", String(packet.hudReferenceComparison.householdSize)],
              ["Threshold type", packet.hudReferenceComparison.thresholdType],
              ["Official reference threshold", packet.hudReferenceComparison.formattedOfficialThreshold],
              ["Confirmed annualised amount", packet.hudReferenceComparison.formattedConfirmedAnnualisedAmount],
              ["Absolute difference", packet.hudReferenceComparison.formattedAbsoluteDifference],
              ["Relationship", packet.hudReferenceComparison.relationship],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl bg-white p-3">
                <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 break-words font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-bold leading-6 text-sky-950">
            {packet.hudReferenceComparison.neutralStatement}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Geography: {packet.hudReferenceComparison.geography}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {packet.hudReferenceComparison.context}
          </p>
        </section>

        <section aria-labelledby="packet-readiness-results-title">
          <div className="flex items-center gap-2">
            <FileCheck2 aria-hidden="true" size={21} className="text-brand" />
            <h3
              id="packet-readiness-results-title"
              className="text-xl font-bold text-ink"
            >
              {packet.documentReadinessResults.heading}
            </h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {packet.documentReadinessResults.results.map((result) => {
              const StatusIcon =
                result.status === "present"
                  ? CheckCircle2
                  : result.status === "missing"
                    ? CircleAlert
                    : TriangleAlert;

              return (
                <article
                  key={result.requirementId}
                  className="min-w-0 rounded-xl border border-line bg-canvas p-4"
                >
                  <div className="flex items-start gap-2">
                    <StatusIcon
                      aria-hidden="true"
                      size={18}
                      className="mt-0.5 shrink-0 text-brand-dark"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-ink">{result.title}</h4>
                      <p className="mt-1 text-sm font-extrabold text-brand-dark">
                        Status: {result.statusLabel}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {result.explanation}
                  </p>
                  {result.supportingDocuments.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                      {result.supportingDocuments.map((document, index) => (
                        <li
                          key={`${document.documentName}-${index}`}
                          className="break-words rounded-lg border border-line bg-white p-2.5"
                        >
                          {document.documentName}
                          {document.normalizedDocumentType
                            ? ` · type: ${document.normalizedDocumentType}`
                            : document.sampleKind
                              ? ` · sample kind: ${document.sampleKind}`
                              : ""}
                          {document.sourcePages.length > 0
                            ? ` · page ${document.sourcePages.join(", ")}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs font-bold text-slate-700">
                      No matching confirmed document metadata
                    </p>
                  )}
                </article>
              );
            })}
          </div>
          <dl className="mt-4 grid gap-3 rounded-xl border border-brand/20 bg-brand-soft p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold text-slate-600">Checklist version</dt>
              <dd className="mt-1 break-all font-bold text-ink">
                {packet.documentReadinessResults.checklistVersion}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-600">Review timestamp</dt>
              <dd className="mt-1 font-bold text-ink">
                {packet.documentReadinessResults.reviewedAtDisplay}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-600">Acknowledgement</dt>
              <dd className="mt-1 font-bold text-ink">
                {packet.documentReadinessResults.acknowledgementStatus}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-600">Checklist source</dt>
              <dd className="mt-1 font-bold text-ink">
                {packet.documentReadinessResults.sourceClassification}
              </dd>
            </div>
          </dl>
          <p className="mt-4 font-bold leading-6 text-amber-950">
            {packet.documentReadinessResults.prototypeLabel}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {packet.documentReadinessResults.disclaimer}
          </p>
        </section>

        <section aria-labelledby="packet-checklist-title">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" size={21} className="text-brand" />
            <h3
              id="packet-checklist-title"
              className="text-xl font-bold text-ink"
            >
              Renter review acknowledgements
            </h3>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {packet.documentReadinessChecklist.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-line bg-canvas p-4 font-bold text-ink"
              >
                <CheckCircle2 aria-hidden="true" size={18} className="text-brand" />
                {item.label} — {item.status}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-slate-700">
            {packet.documentReadinessChecklist.disclaimer}
          </p>
        </section>

        <section aria-labelledby="packet-metadata-title">
          <div className="flex items-center gap-2">
            <FileText aria-hidden="true" size={21} className="text-brand" />
            <h3
              id="packet-metadata-title"
              className="text-xl font-bold text-ink"
            >
              Confirmed source-document metadata
            </h3>
          </div>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {packet.sourceDocumentMetadata.map((document, index) => (
              <li
                key={`${document.fileName}-${index}`}
                className="min-w-0 rounded-xl border border-line bg-canvas p-4"
              >
                <p className="break-words font-bold text-ink">{document.fileName}</p>
                <p className="mt-1 text-sm text-slate-700">{document.category}</p>
                <p className="mt-1 text-xs font-semibold text-brand-dark">
                  Status: {document.profileReviewStatus}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Retained source pages:{" "}
                  {document.sourcePages.length > 0
                    ? document.sourcePages.join(", ")
                    : "None"}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="packet-boundaries-title"
          className="rounded-xl border border-line bg-canvas p-5"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" size={21} className="text-brand" />
            <h3
              id="packet-boundaries-title"
              className="text-xl font-bold text-ink"
            >
              Source and decision boundaries
            </h3>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <article className="min-w-0 rounded-xl border border-emerald-200 bg-white p-4">
              <BadgeCheck aria-hidden="true" size={20} className="text-emerald-700" />
              <h4 className="mt-2 font-bold text-ink">A. {official.classification}</h4>
              <p className="mt-1 text-sm font-bold text-emerald-800">
                {official.verificationLabel}
              </p>
              <p className="mt-2 break-words text-sm leading-6 text-slate-700">
                {official.publisher} · {official.datasetTitle} · PDF page{" "}
                {official.pdfPage} of {official.pdfPageCount}
              </p>
              <div className="mt-3 space-y-2 text-sm font-bold">
                <a
                  href={official.datasetPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link-focus block break-words text-brand-dark underline underline-offset-4"
                >
                  Open the official HUD dataset page
                </a>
                <a
                  href={official.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link-focus block break-words text-brand-dark underline underline-offset-4"
                >
                  Open the cited official HUD PDF
                </a>
              </div>
            </article>
            <article className="rounded-xl border border-brand/20 bg-white p-4">
              <Calculator aria-hidden="true" size={20} className="text-brand" />
              <h4 className="mt-2 font-bold text-ink">B. {arithmetic.classification}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {arithmetic.explanation}
              </p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-white p-4">
              <Landmark aria-hidden="true" size={20} className="text-amber-700" />
              <h4 className="mt-2 font-bold text-ink">C. {policy.classification}</h4>
              <p className="mt-2 text-sm font-bold leading-6 text-amber-950">
                {policy.coverDisclaimer}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {policy.finalReviewStatement}
              </p>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}
