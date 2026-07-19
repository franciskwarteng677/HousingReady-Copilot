import {
  CheckCircle2,
  CircleAlert,
  FileLock2,
  Scale,
} from "lucide-react";
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
import { RuleCitation } from "@/components/RuleCitation";

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
  const citation = verified
    ? toCitation(corpus, verified.citation.citationId)
    : null;
  const scopeCitation = toCitation(corpus, "prototype-scope");
  const corpusDataMissing =
    corpus.dataVerificationStatus !== "verified" ||
    corpus.effectiveDate === null;
  const selectedThresholdMissing = Boolean(
    !corpusDataMissing && householdSize && !verified,
  );
  const prerequisiteMessage =
    !corpusDataMissing && !householdSize
      ? "Confirm the renter-provided household size before selecting a published threshold row."
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
        Published threshold comparison
      </p>
      <h2
        id="threshold-comparison-heading"
        className="mt-2 text-xl font-bold text-ink"
      >
        Official 2026 threshold step
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This section activates only for a verified threshold matching the
        confirmed household size, frozen geography, 2026 rule year, effective
        date, and cited source row.
      </p>

      {corpusDataMissing || selectedThresholdMissing ? (
        <div
          className="mt-6 rounded-xl border border-amber-300 bg-sun-soft p-4 sm:p-5"
          role="alert"
        >
          <p className="flex items-center gap-2 font-bold text-amber-950">
            <FileLock2 aria-hidden="true" size={19} />
            Status: Blocked — verified organizer data required
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
            {MISSING_OFFICIAL_2026_THRESHOLD_MESSAGE}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            The deterministic Profile calculation can still be reviewed, but
            official threshold comparison and Understand completion remain
            unavailable.
          </p>
          <a
            href={corpus.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="link-focus mt-3 inline-flex min-h-10 items-center text-sm font-bold text-brand hover:text-brand-dark"
          >
            Open the HUD MTSP dataset landing page — no 2026 threshold row is loaded
          </a>
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
      ) : comparison?.outcome === "available" ? (
        <>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
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
                Combined annualised amount
              </dt>
              <dd className="mt-1 text-xl font-bold text-ink">
                {formatCurrencyFromCents(comparison.combinedAnnualizedCents)}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Published threshold
              </dt>
              <dd className="mt-1 text-xl font-bold text-ink">
                {formatCurrencyFromCents(comparison.publishedThresholdCents)}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Rule version and effective date
              </dt>
              <dd className="mt-1 font-bold leading-6 text-ink">
                {comparison.sourceVersion} · {comparison.effectiveDate}
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-xl border border-brand bg-brand-soft p-4">
            <p className="text-sm font-semibold text-slate-600">
              Mathematical comparison
            </p>
            <p className="mt-1 text-lg font-extrabold text-ink">
              <span aria-hidden="true">
                {formatCurrencyFromCents(comparison.combinedAnnualizedCents)}{" "}
                {comparison.relation === "below"
                  ? "<"
                  : comparison.relation === "above"
                    ? ">"
                    : "="}{" "}
                {formatCurrencyFromCents(comparison.publishedThresholdCents)}
              </span>
              <span className="sr-only">
                {formatCurrencyFromCents(comparison.combinedAnnualizedCents)} is
                numerically {comparison.relation} the published threshold of{" "}
                {formatCurrencyFromCents(comparison.publishedThresholdCents)}.
              </span>
            </p>
            <p className="mt-3 font-bold text-ink">
              {comparison.neutralStatement}
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
              This comparison is not an eligibility determination. A qualified
              housing professional must review the complete application and
              applicable rules.
            </p>
          </div>
          {citation ? (
            <div className="mt-4">
              <RuleCitation citation={citation} />
            </div>
          ) : null}
          <button
            type="button"
            onClick={onConfirmReview}
            disabled={ruleReviewComplete}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CheckCircle2 aria-hidden="true" size={17} />
            {ruleReviewComplete
              ? "Published comparison reviewed"
              : "Confirm published comparison review"}
          </button>
        </>
      ) : null}

      <div className="mt-6 border-t border-line pt-6">
        <div className="flex items-start gap-3">
          <CircleAlert
            aria-hidden="true"
            size={19}
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <div>
            <h3 className="font-bold text-ink">Loaded corpus source note</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              The passage below documents prototype scope only. Its status
              makes clear that it is not a verified official threshold.
            </p>
          </div>
        </div>
        {scopeCitation ? (
          <div className="mt-4">
            <RuleCitation citation={scopeCitation} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
