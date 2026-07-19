import {
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileLock2,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { RuleCitation } from "@/components/RuleCitation";
import {
  getVerifiedThresholdComparisonData,
  MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE,
} from "@/data/rules";
import { formatCurrencyFromCents } from "@/lib/income-calculation";
import type { RulesAssistantCitation } from "@/lib/rules-assistant";
import type { RuleCorpus } from "@/lib/rules-schema";
import { compareVerifiedThreshold } from "@/lib/understand-state";
import type {
  HouseholdSizeConfirmation,
  StoredIncomeCalculation,
} from "@/lib/understand-schema";

type ThresholdComparisonPanelProps = {
  corpus: RuleCorpus;
  householdSize: HouseholdSizeConfirmation | null;
  calculation: StoredIncomeCalculation | null;
  ruleReviewComplete: boolean;
  onConfirmReview: () => void;
};

function toCitation(
  corpus: RuleCorpus,
  citationId: string,
): RulesAssistantCitation | null {
  const citation = corpus.citationPassages.find(
    (candidate) => candidate.citationId === citationId,
  );

  if (!citation) {
    return null;
  }

  return {
    citationId: citation.citationId,
    passageOrTableRowIdentifier: citation.sectionOrRowId,
    supportingExcerpt: citation.passage,
    sourcePublisher: citation.sourcePublisher,
    sourceTitle: citation.sourceTitle,
    sourceUrl: citation.sourceUrl,
    sourceType: citation.sourceType,
    ruleYear: corpus.ruleYear,
    effectiveDate: citation.effectiveDate,
    geography: corpus.geography,
    verificationStatus: citation.verificationStatus,
  };
}

function formatEffectiveDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)));
}

const unknownApplicationFactors = [
  "Property-specific set-asides",
  "Applicable HERA-special status",
  "Asset-income treatment",
  "Income exclusions",
  "Household-composition rules",
  "Student-status rules",
  "Verification requirements and local housing-provider policies",
  "Final eligibility",
] as const;

export function ThresholdComparisonPanel({
  corpus,
  householdSize,
  calculation,
  ruleReviewComplete,
  onConfirmReview,
}: ThresholdComparisonPanelProps) {
  const comparison =
    householdSize && calculation
      ? compareVerifiedThreshold(
          corpus,
          householdSize.value,
          calculation.combined.resultCents,
        )
      : null;
  const verified = householdSize
    ? getVerifiedThresholdComparisonData(corpus, householdSize.value)
    : null;
  const officialSource = verified?.officialSource ?? null;
  const citation = verified
    ? toCitation(corpus, verified.citation.citationId)
    : null;
  const corpusDataMissing =
    corpus.dataVerificationStatus !== "verified_official" ||
    corpus.effectiveDate === null ||
    corpus.officialThresholdSource === null;
  const selectedThresholdMissing = Boolean(
    !corpusDataMissing && householdSize && !verified,
  );
  const prerequisiteMessage =
    !corpusDataMissing && !householdSize
      ? "Confirm the renter-provided household size before selecting the official HUD threshold row."
      : !corpusDataMissing && householdSize && !calculation
        ? "Complete a current deterministic calculation before displaying the mathematical comparison."
        : null;

  return (
    <section
      aria-labelledby="threshold-comparison-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <p className="inline-flex items-center gap-2 text-sm font-bold text-brand">
        <Scale aria-hidden="true" size={18} />
        Verified reference-threshold comparison
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="threshold-comparison-heading"
            className="text-xl font-bold text-ink"
          >
            Official FY 2026 HUD MTSP reference
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            The standard 60% MTSP value is the reference threshold selected for
            this frozen Cambridge prototype scenario. It is not universal to
            every property, set-aside, program, or project history.
          </p>
        </div>
        {officialSource ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand-dark">
            <BadgeCheck aria-hidden="true" size={16} />
            Verified official HUD source
          </span>
        ) : null}
      </div>

      {corpusDataMissing || selectedThresholdMissing ? (
        <div
          className="mt-6 rounded-xl border border-amber-300 bg-sun-soft p-4 sm:p-5"
          role="alert"
        >
          <p className="flex items-center gap-2 font-bold text-amber-950">
            <FileLock2 aria-hidden="true" size={19} />
            Status: Blocked — verified official data unavailable
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
            {MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE}
          </p>
        </div>
      ) : prerequisiteMessage ? (
        <div
          className="mt-6 rounded-xl border border-line bg-canvas p-4 sm:p-5"
          role="status"
        >
          <p className="flex items-center gap-2 font-bold text-ink">
            <CircleAlert aria-hidden="true" size={19} />
            Status: Waiting for a confirmed prerequisite
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {prerequisiteMessage}
          </p>
        </div>
      ) : comparison?.outcome === "available" && officialSource ? (
        <div>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Confirmed household size
              </dt>
              <dd className="mt-1 text-xl font-bold text-ink">
                {comparison.householdSize}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Confirmed annualised amount
              </dt>
              <dd className="mt-1 text-xl font-bold text-ink">
                {formatCurrencyFromCents(comparison.combinedAnnualizedCents)}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Selected threshold type
              </dt>
              <dd className="mt-1 text-xl font-bold text-ink">
                {comparison.thresholdType}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Official threshold
              </dt>
              <dd className="mt-1 text-xl font-bold text-ink">
                {formatCurrencyFromCents(comparison.publishedThresholdCents)}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Absolute difference
              </dt>
              <dd className="mt-1 text-xl font-bold text-ink">
                {formatCurrencyFromCents(comparison.differenceCents)}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Rule year · effective date
              </dt>
              <dd className="mt-1 font-bold leading-6 text-ink">
                {corpus.ruleYear} · {formatEffectiveDate(comparison.effectiveDate)}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4 sm:col-span-2 lg:col-span-3">
              <dt className="text-sm font-semibold text-slate-500">
                Official geography
              </dt>
              <dd className="mt-1 font-bold leading-6 text-ink">
                {officialSource.hmfaName}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4 sm:col-span-2 lg:col-span-3">
              <dt className="text-sm font-semibold text-slate-500">
                Source publisher
              </dt>
              <dd className="mt-1 font-bold leading-6 text-ink">
                {officialSource.publisher}
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-brand bg-brand-soft p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-600">
              Product arithmetic — deterministic comparison
            </p>
            <p className="mt-1 text-lg font-extrabold text-ink">
              {comparison.mathematicalComparison}
            </p>
            <p className="mt-2 font-bold text-ink">
              Difference: {comparison.differenceCalculation}
            </p>
            <p
              className="mt-3 font-extrabold leading-7 text-ink"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {comparison.neutralStatement}
            </p>
          </div>

          <div className="mt-4 rounded-xl border-2 border-ink bg-ink p-5 text-white">
            <p className="flex items-start gap-2 text-base font-extrabold leading-7">
              <ShieldAlert
                aria-hidden="true"
                size={21}
                className="mt-0.5 shrink-0 text-teal-200"
              />
              This comparison is application-preparation guidance, not an
              eligibility determination. A qualified housing professional must
              apply the complete property-specific and program-specific rules.
            </p>
            <p className="mt-4 text-sm font-bold text-slate-200">
              HousingReady Copilot does not know or determine:
            </p>
            <ul className="mt-2 grid gap-x-6 gap-y-2 text-sm leading-6 text-slate-300 sm:grid-cols-2">
              {unknownApplicationFactors.map((factor) => (
                <li key={factor} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-200" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold text-ink">
              Official HUD citation and frozen source
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Exact table citation: Massachusetts — {officialSource.hmfaName},
              PDF page {officialSource.pdfPage} of {officialSource.pdfPageCount}.
              FY 2026 Median Family Income: {formatCurrencyFromCents(officialSource.medianFamilyIncomeCents)}.
            </p>
            {citation ? (
              <div className="mt-4">
                <RuleCitation citation={citation} />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={officialSource.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-focus inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand-soft"
              >
                Open the official FY 2026 HUD MTSP PDF, page 130
                <ExternalLink aria-hidden="true" size={16} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a
                href={officialSource.datasetPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-focus inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand-soft"
              >
                Open the official HUD MTSP dataset page
                <ExternalLink aria-hidden="true" size={16} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-canvas p-4 sm:p-5">
            <h3 className="font-bold text-ink">Source boundaries</h3>
            <dl className="mt-3 grid gap-3 text-sm lg:grid-cols-3">
              <div>
                <dt className="font-bold text-brand-dark">A. Official HUD data</dt>
                <dd className="mt-1 leading-6 text-slate-600">
                  The frozen threshold, geography, rule year, effective date,
                  and cited PDF row.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-brand-dark">B. Product arithmetic</dt>
                <dd className="mt-1 leading-6 text-slate-600">
                  Annualisation and subtraction using integer cents and
                  renter-confirmed inputs.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-brand-dark">
                  C. HousingReady Copilot policy
                </dt>
                <dd className="mt-1 leading-6 text-slate-600">
                  Safety, scope, and decision-boundary language; not an
                  official HUD rule.
                </dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            aria-pressed={ruleReviewComplete}
            onClick={onConfirmReview}
            disabled={ruleReviewComplete}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 sm:w-auto"
          >
            <CheckCircle2 aria-hidden="true" size={18} />
            I reviewed the comparison and official source
          </button>
          {ruleReviewComplete ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-brand-dark" role="status">
              <CheckCircle2 aria-hidden="true" size={17} />
              Status: Understand review acknowledged
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Acknowledge this review to complete Understand. The numerical
              result itself never controls access to Prepare.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
