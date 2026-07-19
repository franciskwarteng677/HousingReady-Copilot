import { BadgeCheck, Database, MapPinned, ShieldAlert } from "lucide-react";
import {
  FROZEN_GEOGRAPHY,
  FROZEN_PROGRAM_NAME,
  FROZEN_RULE_YEAR,
  PRIMARY_COMPARISON_LABEL,
} from "@/data/rules";
import type { RuleCorpus } from "@/lib/rules-schema";

type ProgramScopePanelProps = {
  corpus: RuleCorpus;
};

export function ProgramScopePanel({ corpus }: ProgramScopePanelProps) {
  return (
    <section
      aria-labelledby="program-scope-heading"
      className="relative overflow-hidden rounded-2xl border border-slate-700 bg-[linear-gradient(135deg,#102b40,#153b4e_58%,#0b5d5b)] text-white shadow-[0_28px_70px_-42px_rgba(15,47,66,0.9)] ring-1 ring-white/10"
    >
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.1fr_1.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-teal-200">
            <MapPinned aria-hidden="true" size={18} />
            Frozen prototype scope
          </p>
          <h2
            id="program-scope-heading"
            className="mt-3 text-2xl font-bold tracking-tight"
          >
            Cambridge 2026 MTSP context
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            This Understand workspace covers only the context shown here. It
            does not claim coverage for another city, program, geography, or
            rule year.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              Location
            </dt>
            <dd className="mt-2 font-bold">
              {FROZEN_GEOGRAPHY.city}, {FROZEN_GEOGRAPHY.state}
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              Rule year
            </dt>
            <dd className="mt-2 font-bold">{FROZEN_RULE_YEAR}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              HUD area
            </dt>
            <dd className="mt-2 font-bold leading-6">
              {FROZEN_GEOGRAPHY.hudArea}
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              Program context
            </dt>
            <dd className="mt-2 font-bold leading-6">
              {FROZEN_PROGRAM_NAME}
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm sm:col-span-2">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              <Database aria-hidden="true" size={15} />
              Source type
            </dt>
            <dd className="mt-2 flex items-start gap-2 font-bold leading-6">
              <BadgeCheck
                aria-hidden="true"
                size={18}
                className="mt-0.5 shrink-0 text-teal-200"
              />
              Verified official HUD FY 2026 MTSP source
            </dd>
            <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-300">
              <ShieldAlert aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
              The official HUD values are frozen locally for this prototype;
              the demo does not depend on a live network request.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              Primary reference comparison
            </dt>
            <dd className="mt-2 font-bold leading-6">
              {PRIMARY_COMPARISON_LABEL}
            </dd>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This 60% value is the reference threshold selected for the frozen
              prototype scenario. Different properties, set-asides, project
              histories, programs, or rules may require different limits.
            </p>
          </div>
        </dl>
      </div>
      {corpus.dataVerificationStatus !== "verified_official" ? (
        <p className="border-t border-white/15 px-5 py-4 text-sm font-bold text-amber-200 sm:px-7">
          Status: the loaded corpus is not a verified official HUD source.
        </p>
      ) : null}
    </section>
  );
}
