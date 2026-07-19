import {
  ArrowRight,
  BookOpenCheck,
  FileCheck2,
  FolderDown,
  HouseHeart,
  LockKeyhole,
  ShieldCheck,
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
      "Review deterministic present or missing document categories, preview your packet, and prepare a clean download for your next step.",
    href: "/prepare",
    linkLabel: "See packet tools",
    icon: FolderDown,
  },
];

export default function Home() {
  return (
    <PageContainer
      variant="hero"
      introIcon={HouseHeart}
      eyebrow="Affordable-housing application readiness"
      title="Prepare with confidence. You stay in control."
      description="Prepare affordable-housing application documents with clarity and control. HousingReady Copilot helps you organize documents and understand published housing program rules—without making decisions for you."
      actions={
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Link
            href="/profile"
            className="group relative inline-flex min-h-13 overflow-hidden rounded-2xl bg-brand px-6 py-3.5 font-bold text-white shadow-[0_16px_34px_-16px_rgba(7,90,85,0.72)] outline-none transition-[transform,box-shadow,background-color] duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_20px_38px_-16px_rgba(7,90,85,0.8)] focus-visible:ring-4 focus-visible:ring-teal-200"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/15 transition-transform duration-500 motion-safe:group-hover:translate-x-[450%]"
            />
            <span className="relative inline-flex items-center justify-center gap-2">
              Start My Readiness Check
              <ArrowRight
                aria-hidden="true"
                size={19}
                className="transition-transform duration-200 motion-safe:group-hover:translate-x-1"
              />
            </span>
          </Link>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white/70 px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
              <LockKeyhole aria-hidden="true" size={15} />
            </span>
            No account or real applicant data
          </span>
        </div>
      }
      aside={
        <div className="relative isolate mx-auto max-w-lg lg:max-w-none">
          <div
            aria-hidden="true"
            className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_top_right,rgba(244,185,66,0.2),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(11,118,110,0.2),transparent_48%)] blur-2xl"
          />
          <section
            aria-labelledby="workspace-summary-title"
            className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_32px_80px_-38px_rgba(21,48,71,0.48)] backdrop-blur-sm sm:p-7"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-brand via-teal-400 to-sun"
            />
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 size-44 rounded-full border-[24px] border-brand-soft/70"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">
                  Your workspace
                </p>
                <h2
                  id="workspace-summary-title"
                  className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-ink"
                >
                  Readiness overview
                </h2>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-slate-400"
                />
                Not started
              </span>
            </div>
            <ol className="relative mt-7 space-y-3">
              {features.map(({ title, icon: Icon }, index) => (
                <li
                  key={title}
                  className="group/step relative flex items-center gap-4 rounded-2xl border border-line/80 bg-canvas/65 p-3.5 transition-colors hover:border-brand/25 hover:bg-brand-soft/55"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand/10 bg-white text-brand shadow-sm">
                    <Icon aria-hidden="true" size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Stage {index + 1}
                    </span>
                    <span className="mt-0.5 block text-sm font-bold text-ink-soft">
                      {title}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-slate-500 shadow-sm">
                    Upcoming
                  </span>
                </li>
              ))}
            </ol>
            <div className="relative mt-5 flex items-start gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white shadow-lg shadow-slate-900/10">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                <ShieldCheck aria-hidden="true" size={18} />
              </span>
              <p className="text-xs leading-5 text-slate-200">
                You confirm every detail before it is used in your packet.
              </p>
            </div>
          </section>
        </div>
      }
    >
      <section aria-labelledby="how-it-works-title">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand">
              Three clear stages
            </p>
            <h2
              id="how-it-works-title"
              className="mt-3 text-2xl font-extrabold tracking-[-0.025em] text-ink sm:text-3xl"
            >
              From scattered paperwork to a prepared packet
            </h2>
          </div>
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-3.5 py-2 text-xs font-bold text-brand-dark">
            <ShieldCheck aria-hidden="true" size={15} />
            Human-confirmed at every stage
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section aria-labelledby="boundaries-title" className="mt-12 sm:mt-14">
        <div className="mb-6 max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand">
            Built-in boundaries
          </p>
          <h2
            id="boundaries-title"
            className="mt-3 text-2xl font-extrabold tracking-[-0.025em] text-ink sm:text-3xl"
          >
            Clear about what the prototype does—and what it never decides
          </h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-full [&>aside]:h-full [&>aside]:rounded-3xl [&>aside]:shadow-[0_20px_48px_-34px_rgba(146,94,12,0.4)]">
            <SafetyNotice />
          </div>
          <section
            aria-labelledby="privacy-note-title"
            className="relative overflow-hidden rounded-3xl border border-slate-700 bg-ink p-6 text-white shadow-[0_24px_54px_-34px_rgba(21,48,71,0.7)] sm:p-7"
          >
            <div
              aria-hidden="true"
              className="absolute -right-12 -top-12 size-36 rounded-full border-[20px] border-white/5"
            />
            <div className="relative flex items-start gap-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-teal-200 shadow-sm">
                <LockKeyhole aria-hidden="true" size={20} />
              </span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-200">
                  Temporary by design
                </p>
                <h2
                  id="privacy-note-title"
                  className="mt-2 text-lg font-extrabold text-white"
                >
                  Prototype privacy
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This prototype uses synthetic documents only and temporary
                  session processing. Do not upload real applicant data.
                </p>
                <Link
                  href="/privacy"
                  className="link-focus group/privacy mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal-200 transition-colors hover:text-white"
                >
                  Read Privacy &amp; Safety
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="transition-transform motion-safe:group-hover/privacy:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </PageContainer>
  );
}
