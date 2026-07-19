import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileCheck2,
  FolderDown,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { FeatureCard } from "@/components/FeatureCard";
import { PageContainer } from "@/components/PageContainer";
import { SafetyNotice } from "@/components/SafetyNotice";

const features = [
  {
    step: "Stage 1",
    title: "Upload & Confirm",
    description:
      "Bring synthetic documents into one workspace, review extracted details, and confirm what is accurate.",
    href: "/profile",
    linkLabel: "Build your profile",
    icon: FileCheck2,
  },
  {
    step: "Stage 2",
    title: "Understand the Rules",
    description:
      "Read plain-language explanations of published program rules with transparent calculations and citations.",
    href: "/understand",
    linkLabel: "Explore explanations",
    icon: BookOpenCheck,
  },
  {
    step: "Stage 3",
    title: "Prepare Your Packet",
    description:
      "Spot missing or expired items, review a packet preview, and prepare a clean download for your next step.",
    href: "/prepare",
    linkLabel: "See packet tools",
    icon: FolderDown,
  },
];

export default function Home() {
  return (
    <PageContainer
      variant="hero"
      eyebrow="Affordable-housing application readiness"
      title="Prepare with confidence. You stay in control."
      description="HousingReady Copilot helps you organize documents and understand published housing program rules—without making decisions for you."
      actions={
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link
            href="/profile"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white shadow-lg shadow-teal-900/15 outline-none transition-colors hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
          >
            Start My Readiness Check
            <ArrowRight aria-hidden="true" size={19} />
          </Link>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <LockKeyhole aria-hidden="true" size={17} className="text-brand" />
            No account or real applicant data
          </span>
        </div>
      }
      aside={
        <section
          aria-labelledby="workspace-summary-title"
          className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-card sm:p-7"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1.5 bg-brand"
          />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                Your workspace
              </p>
              <h2
                id="workspace-summary-title"
                className="mt-2 text-xl font-bold text-ink"
              >
                Readiness overview
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Not started
            </span>
          </div>
          <ul className="mt-7 space-y-4">
            {[
              "Confirm document details",
              "Review rule explanations",
              "Prepare a packet checklist",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl bg-canvas p-3.5"
              >
                <CheckCircle2
                  aria-hidden="true"
                  size={20}
                  className="shrink-0 text-brand"
                />
                <span className="text-sm font-semibold text-ink-soft">
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            You confirm every detail before it is used in your packet.
          </p>
        </section>
      }
    >
      <section aria-labelledby="how-it-works-title">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand">
            Three clear stages
          </p>
          <h2
            id="how-it-works-title"
            className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            From scattered paperwork to a prepared packet
          </h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <SafetyNotice />
        <section
          aria-labelledby="privacy-note-title"
          className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6"
        >
          <div className="flex items-start gap-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <LockKeyhole aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 id="privacy-note-title" className="font-bold text-ink">
                Prototype privacy
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This prototype uses synthetic documents only and temporary
                session processing. Do not upload real applicant data.
              </p>
              <Link
                href="/privacy"
                className="link-focus mt-3 inline-block text-sm font-bold text-brand hover:text-brand-dark"
              >
                Read Privacy &amp; Safety
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
