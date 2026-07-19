import { ShieldCheck } from "lucide-react";

export function SafetyNotice() {
  return (
    <aside
      aria-labelledby="safety-notice-title"
      className="group relative overflow-hidden rounded-2xl border border-amber-200/90 bg-[linear-gradient(135deg,#fffaf0,#fff7df)] p-5 shadow-[0_18px_45px_-34px_rgba(146,89,10,0.38)] transition-[transform,box-shadow] duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-36px_rgba(146,89,10,0.48)] sm:p-6"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-amber-400" />
      <div className="relative flex items-start gap-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700 shadow-sm transition-transform duration-300 motion-safe:group-hover:scale-105">
          <ShieldCheck aria-hidden="true" size={21} />
        </span>
        <div>
          <h2 id="safety-notice-title" className="text-base font-extrabold text-ink">
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
