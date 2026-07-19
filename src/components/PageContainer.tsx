import { Building2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type PageContainerProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  variant?: "page" | "hero";
  introIcon?: LucideIcon;
};

export function PageContainer({
  eyebrow,
  title,
  description,
  actions,
  aside,
  children,
  variant = "page",
  introIcon: IntroIcon = Building2,
}: PageContainerProps) {
  const titleClass =
    variant === "hero"
      ? "max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl lg:text-6xl"
      : "max-w-3xl text-3xl font-bold tracking-[-0.025em] text-ink sm:text-4xl";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="page-intro relative isolate overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/85 shadow-[0_28px_80px_-48px_rgba(15,47,66,0.55)] backdrop-blur-sm sm:rounded-[2rem]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="ambient-orb absolute -right-20 -top-24 size-72 rounded-full bg-brand-soft/90 blur-3xl sm:size-96" />
          <div className="ambient-orb ambient-orb-delayed absolute -bottom-32 left-[28%] size-64 rounded-full bg-sky-100/60 blur-3xl" />
          <div className="absolute inset-y-0 right-0 hidden w-[36%] border-l border-brand/10 bg-[linear-gradient(135deg,rgba(232,245,241,0.35),rgba(239,246,255,0.18))] lg:block" />
          <Building2
            size={220}
            strokeWidth={0.65}
            className="absolute -right-6 -top-4 hidden text-brand opacity-[0.075] lg:block"
          />
          <span className="absolute bottom-8 right-12 hidden h-12 w-20 rounded-t-[2rem] border-x border-t border-brand/10 lg:block" />
        </div>

        <div
          className={`relative z-10 p-6 sm:p-9 lg:p-12 ${
            aside
              ? "grid items-center gap-10 lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)] lg:gap-14"
              : ""
          }`}
        >
          <header>
            {eyebrow ? (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft/80 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.13em] text-brand-dark shadow-sm sm:text-sm">
                <IntroIcon aria-hidden="true" size={17} strokeWidth={2.2} />
                {eyebrow}
              </p>
            ) : null}
            <h1 className={titleClass}>{title}</h1>
            {description ? (
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {description}
              </p>
            ) : null}
            {actions ? <div className="mt-8">{actions}</div> : null}
          </header>
          {aside ? <div className="min-w-0">{aside}</div> : null}
        </div>
      </div>
      <div
        className={`content-reveal ${
          variant === "hero" ? "mt-14 sm:mt-20" : "mt-9 sm:mt-11"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
