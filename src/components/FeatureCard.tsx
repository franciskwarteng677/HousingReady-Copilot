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
    <article className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card transition-transform duration-200 hover:-translate-y-1 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon aria-hidden="true" size={22} strokeWidth={2} />
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          {step}
        </span>
      </div>
      <h3 className="mt-6 text-xl font-bold tracking-tight text-ink">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{description}</p>
      <Link
        href={href}
        className="link-focus mt-6 inline-flex w-fit items-center gap-2 font-bold text-brand hover:text-brand-dark"
      >
        {linkLabel}
        <ArrowUpRight aria-hidden="true" size={17} />
      </Link>
    </article>
  );
}
