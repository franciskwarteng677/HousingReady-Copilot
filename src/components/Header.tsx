import { HouseHeart } from "lucide-react";
import Link from "next/link";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";

export function Header() {
  return (
    <header className="site-header">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3.5 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 lg:px-8">
        <Link
          href="/"
          aria-label="HousingReady Copilot home"
          className="brand-lockup link-focus surface-interactive inline-flex w-fit items-center gap-3 py-0.5 pr-2"
        >
          <span className="brand-mark inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white sm:size-11">
            <HouseHeart aria-hidden="true" size={22} strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-xl">
              HousingReady <span className="text-brand">Copilot</span>
            </span>
            <span className="mt-0.5 hidden text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500 sm:block">
              Renter-controlled readiness
            </span>
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="w-full md:w-auto">
          <ul className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:justify-start sm:gap-x-5">
            <li>
              <Link
                href="/privacy"
                className="button-interactive header-nav-link link-focus"
              >
                Privacy &amp; Safety
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="button-interactive header-nav-link link-focus"
              >
                About
              </Link>
            </li>
            <li>
              <DeleteSessionButton />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
