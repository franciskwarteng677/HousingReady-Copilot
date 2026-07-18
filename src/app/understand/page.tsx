import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Calculator,
  Landmark,
  MessageCircleQuestion,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

export const metadata: Metadata = {
  title: "Understand",
  description:
    "Confirm household information and understand published housing programme rules.",
};

const panelClass =
  "rounded-2xl border border-line bg-white p-6 shadow-card";

export default function UnderstandPage() {
  return (
    <PageContainer
      eyebrow="Stage 2 of 3 · Understand"
      title="Understand the information and the rules"
      description="Review confirmed details alongside plain-language explanations of published programme rules. This workspace explains; it never decides."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="household-title" className={panelClass}>
          <UsersRound aria-hidden="true" size={23} className="text-brand" />
          <h2
            id="household-title"
            className="mt-4 text-xl font-bold text-ink"
          >
            Confirmed household information
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Confirmed names, household details, and document values will appear
            here after your review.
          </p>
          <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            Status: Awaiting profile confirmation
          </p>
        </section>

        <section aria-labelledby="rules-title" className={panelClass}>
          <BookOpenText aria-hidden="true" size={23} className="text-brand" />
          <h2 id="rules-title" className="mt-4 text-xl font-bold text-ink">
            Programme rules
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Published rule excerpts and plain-language explanations will be
            organised here for the programme you choose.
          </p>
          <p className="mt-5 rounded-xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-dark">
            Status: No programme selected
          </p>
        </section>

        <section aria-labelledby="questions-title" className={panelClass}>
          <MessageCircleQuestion
            aria-hidden="true"
            size={23}
            className="text-brand"
          />
          <h2
            id="questions-title"
            className="mt-4 text-xl font-bold text-ink"
          >
            Rule questions
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Ask questions about the published rules and see which source
            passages support each explanation.
          </p>
          <label
            htmlFor="rule-question"
            className="mt-5 block text-sm font-bold text-ink"
          >
            Question about a rule
          </label>
          <textarea
            id="rule-question"
            name="rule-question"
            rows={3}
            disabled
            placeholder="Question entry will be available after a programme is selected."
            className="mt-2 w-full resize-none rounded-xl border border-line bg-slate-50 px-4 py-3 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-100"
          />
        </section>

        <section aria-labelledby="calculation-title" className={panelClass}>
          <Calculator aria-hidden="true" size={23} className="text-brand" />
          <h2
            id="calculation-title"
            className="mt-4 text-xl font-bold text-ink"
          >
            Transparent calculation
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            When a published rule uses arithmetic, each input, formula, and
            source will be shown. No result will be an eligibility decision.
          </p>
          <dl className="mt-5 divide-y divide-line rounded-xl border border-line bg-canvas px-4">
            <div className="flex justify-between gap-4 py-3 text-sm">
              <dt className="font-semibold text-slate-600">
                Confirmed inputs
              </dt>
              <dd className="text-right font-bold text-ink">Not available</dd>
            </div>
            <div className="flex justify-between gap-4 py-3 text-sm">
              <dt className="font-semibold text-slate-600">
                Published formula
              </dt>
              <dd className="text-right font-bold text-ink">Not loaded</dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="citations-title"
          className={panelClass + " lg:col-span-2"}
        >
          <Landmark aria-hidden="true" size={23} className="text-brand" />
          <h2
            id="citations-title"
            className="mt-4 text-xl font-bold text-ink"
          >
            Official citations and effective date
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Official publication links, quoted rule locations, and the
            applicable effective date will be shown together.
          </p>
          <dl className="mt-5 grid gap-4 rounded-xl border border-line bg-canvas p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Official source
              </dt>
              <dd className="mt-1 font-bold text-ink">Not selected</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Effective date
              </dt>
              <dd className="mt-1 font-bold text-ink">Not available</dd>
            </div>
          </dl>
        </section>
      </div>

      <nav
        aria-label="Stage navigation"
        className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"
      >
        <Link
          href="/profile"
          className="link-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 font-bold text-ink hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft aria-hidden="true" size={19} />
          Back to Profile
        </Link>
        <Link
          href="/prepare"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
        >
          Continue to Prepare
          <ArrowRight aria-hidden="true" size={19} />
        </Link>
      </nav>
    </PageContainer>
  );
}
