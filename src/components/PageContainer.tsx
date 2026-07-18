import type { ReactNode } from "react";

type PageContainerProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  variant?: "page" | "hero";
};

export function PageContainer({
  eyebrow,
  title,
  description,
  actions,
  aside,
  children,
  variant = "page",
}: PageContainerProps) {
  const titleClass =
    variant === "hero"
      ? "max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl lg:text-6xl"
      : "max-w-3xl text-3xl font-bold tracking-[-0.025em] text-ink sm:text-4xl";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div
        className={
          aside
            ? "grid items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-16"
            : undefined
        }
      >
        <header>
          {eyebrow ? (
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-brand">
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
      <div className={variant === "hero" ? "mt-16 sm:mt-20" : "mt-10"}>
        {children}
      </div>
    </div>
  );
}
