import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, CircleSlash2 } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn what HousingReady Copilot does and the decisions it deliberately does not make.",
};

const supportedTasks = [
  "Organize synthetic application documents",
  "Help renters confirm extracted information",
  "Explain published program rules with citations",
  "Show deterministic present or missing document categories",
  "Prepare a renter-controlled application packet",
];

const excludedTasks = [
  "Approve or deny an application",
  "Rank or score applicants",
  "Determine housing eligibility",
  "Replace a qualified housing professional",
];

export default function AboutPage() {
  return (
    <PageContainer
      eyebrow="Built for renter readiness"
      title="About HousingReady Copilot"
      description="HousingReady Copilot is a renter-side assistant for the work that happens before an affordable-housing application is submitted."
      actions={
        <Link
          href="/profile"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white outline-none hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
        >
          Start My Readiness Check
          <ArrowRight aria-hidden="true" size={19} />
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="helps-title"
          className="rounded-2xl border border-brand/15 bg-white/95 p-6 shadow-card ring-1 ring-white/70 sm:p-7"
        >
          <h2 id="helps-title" className="text-xl font-bold text-ink">
            What it helps with
          </h2>
          <ul className="mt-5 space-y-4">
            {supportedTasks.map((task) => (
              <li key={task} className="flex items-start gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  size={20}
                  className="mt-0.5 shrink-0 text-brand"
                />
                <span className="text-sm leading-6 text-slate-700">{task}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="never-title"
          className="rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fffaf0,#fff7df)] p-6 shadow-[0_18px_45px_-36px_rgba(146,89,10,0.35)] sm:p-7"
        >
          <h2 id="never-title" className="text-xl font-bold text-ink">
            What it never does
          </h2>
          <ul className="mt-5 space-y-4">
            {excludedTasks.map((task) => (
              <li key={task} className="flex items-start gap-3">
                <CircleSlash2
                  aria-hidden="true"
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-700"
                />
                <span className="text-sm leading-6 text-slate-700">{task}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        aria-labelledby="workflow-title"
        className="mt-6 rounded-2xl border border-brand/15 bg-white/95 p-6 shadow-card ring-1 ring-white/70 sm:p-7"
      >
        <h2 id="workflow-title" className="text-xl font-bold text-ink">
          A transparent three-stage workflow
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Profile", "Upload synthetic documents and confirm the details."],
            ["2", "Understand", "Read rule explanations, calculations, and official sources."],
            ["3", "Prepare", "Review the checklist and prepare your packet."],
          ].map(([number, title, description]) => (
            <li key={number} className="rounded-xl border border-line bg-canvas/80 p-5 shadow-sm transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-md">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {number}
              </span>
              <h3 className="mt-4 font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </PageContainer>
  );
}
