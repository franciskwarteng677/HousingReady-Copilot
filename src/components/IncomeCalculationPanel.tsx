import { Calculator, CircleAlert, Clock3, Equal } from "lucide-react";
import { formatCurrencyFromCents } from "@/lib/income-calculation";
import type { StoredIncomeCalculation } from "@/lib/understand-schema";

type IncomeCalculationPanelProps = {
  calculation: StoredIncomeCalculation | null;
  noCallMessage: string | null;
};

function SourceList({
  sources,
}: {
  sources: StoredIncomeCalculation["evidence"]["grossPay"]["sources"];
}) {
  return (
    <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-600">
      {sources.map((source) => (
        <li key={source.sourceDocumentId + ":" + source.sourcePage}>
          {source.sourceDocumentName}, page {source.sourcePage}
        </li>
      ))}
    </ul>
  );
}

export function IncomeCalculationPanel({
  calculation,
  noCallMessage,
}: IncomeCalculationPanelProps) {
  return (
    <section
      aria-labelledby="income-calculation-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <p className="inline-flex items-center gap-2 text-sm font-bold text-brand">
        <Calculator aria-hidden="true" size={18} />
        Deterministic arithmetic
      </p>
      <h2
        id="income-calculation-heading"
        className="mt-2 text-xl font-bold text-ink"
      >
        Transparent annualised income calculation
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        HousingReady Copilot performs this arithmetic with integer cents. An AI
        model cannot perform, change, or override the calculation.
      </p>

      {!calculation ? (
        <div
          className="mt-6 rounded-xl border border-amber-300 bg-sun-soft p-4"
          role="alert"
        >
          <p className="flex items-center gap-2 font-bold text-amber-900">
            <CircleAlert aria-hidden="true" size={18} />
            Calculation unavailable
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {noCallMessage ?? "Confirmed calculation inputs are not available."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <h3 className="font-bold text-ink">Confirmed calculation inputs</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {(
                [
                  ["Gross pay", calculation.evidence.grossPay],
                  ["Pay frequency", calculation.evidence.payFrequency],
                  ["Monthly benefit", calculation.evidence.monthlyBenefit],
                ] as const
              ).map(([label, evidence]) => (
                <article
                  key={label}
                  className="rounded-xl border border-line bg-canvas p-4"
                >
                  <h4 className="text-sm font-bold text-slate-600">{label}</h4>
                  <p className="mt-1 font-bold text-ink">
                    {evidence.confirmedValue}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Input source:
                  </p>
                  <SourceList sources={evidence.sources} />
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <article className="rounded-xl border border-line p-4 sm:p-5">
              <h3 className="font-bold text-ink">Employment calculation</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-semibold text-slate-500">Formula</dt>
                  <dd className="mt-1 font-bold text-ink">
                    {calculation.employment.formula}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Substitution</dt>
                  <dd className="mt-1 font-bold text-ink">
                    <span aria-hidden="true">
                      {calculation.employment.substitution}
                    </span>
                    <span className="sr-only">
                      {formatCurrencyFromCents(
                        calculation.employment.inputAmountCents,
                      )}{" "}
                      times {calculation.employment.periodsPerYear}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Result</dt>
                  <dd className="mt-1 font-bold text-ink">
                    {formatCurrencyFromCents(
                      calculation.employment.resultCents,
                    )}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-xl border border-line p-4 sm:p-5">
              <h3 className="font-bold text-ink">Benefit calculation</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-semibold text-slate-500">Formula</dt>
                  <dd className="mt-1 font-bold text-ink">
                    {calculation.benefits.formula}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Substitution</dt>
                  <dd className="mt-1 font-bold text-ink">
                    <span aria-hidden="true">
                      {calculation.benefits.substitution}
                    </span>
                    <span className="sr-only">
                      {formatCurrencyFromCents(
                        calculation.benefits.inputAmountCents,
                      )}{" "}
                      times {calculation.benefits.periodsPerYear}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Result</dt>
                  <dd className="mt-1 font-bold text-ink">
                    {formatCurrencyFromCents(calculation.benefits.resultCents)}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-xl border border-brand bg-brand-soft p-4 sm:p-5">
              <h3 className="flex items-center gap-2 font-bold text-ink">
                <Equal aria-hidden="true" size={18} className="text-brand" />
                Combined annualised amount
              </h3>
              <p className="mt-3 text-sm font-semibold text-slate-600">
                Formula: {calculation.combined.formula}
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {calculation.combined.substitution}
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-brand-dark">
                {formatCurrencyFromCents(calculation.combined.resultCents)}
              </p>
            </article>
          </div>

          <dl className="mt-5 grid gap-3 rounded-xl border border-line bg-canvas p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-500">Calculation timestamp</dt>
              <dd className="mt-1 flex items-center gap-2 font-bold text-ink">
                <Clock3 aria-hidden="true" size={16} />
                <time dateTime={calculation.calculatedAt}>
                  {new Date(calculation.calculatedAt).toLocaleString("en-US")}
                </time>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Rule/source distinction</dt>
              <dd className="mt-1 font-bold leading-6 text-ink">
                Product arithmetic applied to renter-confirmed document inputs;
                not an official countable-income rule.
              </dd>
            </div>
          </dl>

          <p className="mt-5 rounded-xl border border-amber-300 bg-sun-soft p-4 text-sm font-bold leading-6 text-amber-950">
            {calculation.disclaimer}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Confirmed net pay is displayed in the Profile summary but is not
            used in this requested gross-pay calculation.
          </p>
        </>
      )}
    </section>
  );
}
