import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

type FeatureCardProps = {
  step: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  icon: LucideIcon;
};

export function FeatureCard({
  step,
  title,
  description,
  href,
  linkLabel,
  icon: Icon,
}: FeatureCardProps) {
  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-line/90 bg-white p-6 shadow-card transition-[transform,box-shadow,border-color] duration-300 motion-safe:hover:-translate-y-1.5 hover:border-brand/30 hover:shadow-[0_26px_60px_-34px_rgba(7,90,85,0.42)] sm:p-7">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-linear-to-r from-brand via-teal-400 to-sun transition-transform duration-300 motion-safe:group-hover:scale-x-100"
      />
      <span
        aria-hidden="true"
        className="absolute -right-16 -top-16 size-36 rounded-full bg-brand-soft/70 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-4">
        <span className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-brand/10 bg-brand-soft text-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-transform duration-300 motion-safe:group-hover:-rotate-3 motion-safe:group-hover:scale-105">
          <span
            aria-hidden="true"
            className="absolute inset-1 rounded-xl border border-white/80"
          />
          <Icon
            aria-hidden="true"
            size={23}
            strokeWidth={2}
            className="relative"
          />
        </span>
        <span className="rounded-full border border-line bg-canvas/80 px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
          {step}
        </span>
      </div>
      <h3 className="relative mt-7 text-xl font-extrabold tracking-[-0.02em] text-ink">
        {title}
      </h3>
      <p className="relative mt-3 flex-1 text-sm leading-6 text-slate-600">
        {description}
      </p>
      <Link
        href={href}
        className="link-focus relative mt-7 inline-flex w-fit items-center gap-2 font-bold text-brand transition-colors hover:text-brand-dark"
      >
        {linkLabel}
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft transition-[transform,background-color] duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 group-hover:bg-teal-100">
          <ArrowUpRight aria-hidden="true" size={16} />
        </span>
      </Link>
    </article>
  );
}
