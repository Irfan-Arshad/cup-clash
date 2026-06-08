import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
}: PageHeroProps) {
  return (
    <div className="glass-card overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow && (
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
              {eyebrow}
            </div>
          )}

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          {description && (
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="lg:shrink-0">{actions}</div>}
      </div>
    </div>
  );
}