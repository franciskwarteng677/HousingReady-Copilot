import { HouseHeart } from "lucide-react";
import Link from "next/link";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";

export function Header() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <Link
          href="/"
          aria-label="HousingReady Copilot home"
          className="link-focus inline-flex w-fit items-center gap-3"
        >
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            <HouseHeart aria-hidden="true" size={22} strokeWidth={2.2} />
          </span>
          <span className="text-lg font-extrabold tracking-[-0.025em] text-ink sm:text-xl">
            HousingReady <span className="text-brand">Copilot</span>
          </span>
        </Link>

        <nav aria-label="Primary navigation">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-6">
            <li>
              <Link
                href="/privacy"
                className="link-focus text-sm font-semibold text-slate-600 hover:text-brand"
              >
                Privacy &amp; Safety
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="link-focus text-sm font-semibold text-slate-600 hover:text-brand"
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
