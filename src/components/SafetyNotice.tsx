import { ShieldCheck } from "lucide-react";

export function SafetyNotice() {
  return (
    <aside
      aria-labelledby="safety-notice-title"
      className="rounded-2xl border border-amber-200 bg-sun-soft p-5 sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
          <ShieldCheck aria-hidden="true" size={21} />
        </span>
        <div>
          <h2 id="safety-notice-title" className="font-bold text-ink">
            Readiness guidance, not a decision
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            HousingReady Copilot does not approve, deny, rank, score, or determine
            housing eligibility. A qualified housing professional makes all final
            decisions.
          </p>
        </div>
      </div>
    </aside>
  );
}
