import { Database, MapPinned, ShieldAlert } from "lucide-react";
import {
  FROZEN_GEOGRAPHY,
  FROZEN_PROGRAM_NAME,
  FROZEN_RULE_YEAR,
} from "@/data/rules";
import type { RuleCorpus } from "@/lib/rules-schema";

type ProgramScopePanelProps = {
  corpus: RuleCorpus;
};

export function ProgramScopePanel({ corpus }: ProgramScopePanelProps) {
  return (
    <section
      aria-labelledby="program-scope-heading"
      className="overflow-hidden rounded-2xl border border-ink bg-ink text-white shadow-card"
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
          <div className="rounded-xl bg-white/10 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              Location
            </dt>
            <dd className="mt-2 font-bold">
              {FROZEN_GEOGRAPHY.city}, {FROZEN_GEOGRAPHY.state}
            </dd>
          </div>
          <div className="rounded-xl bg-white/10 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              Rule year
            </dt>
            <dd className="mt-2 font-bold">{FROZEN_RULE_YEAR}</dd>
          </div>
          <div className="rounded-xl bg-white/10 p-4 sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              HUD area
            </dt>
            <dd className="mt-2 font-bold leading-6">
              {FROZEN_GEOGRAPHY.hudArea}
            </dd>
          </div>
          <div className="rounded-xl bg-white/10 p-4 sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              Program context
            </dt>
            <dd className="mt-2 font-bold leading-6">
              {FROZEN_PROGRAM_NAME}
            </dd>
          </div>
          <div className="rounded-xl bg-white/10 p-4 sm:col-span-2">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-teal-200">
              <Database aria-hidden="true" size={15} />
              Source type
            </dt>
            <dd className="mt-2 font-bold leading-6">
              Hack-Nation organizer-provided frozen 2026 MTSP limits and
              official rule corpus
            </dd>
            <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-300">
              <ShieldAlert aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
              Current corpus status: {corpus.dataVerificationStatus}. Template
              material is never labeled as official.
            </p>
          </div>
        </dl>
      </div>
    </section>
  );
}
