import type { Metadata } from "next";
import { HouseHeart, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ProgressTracker } from "@/components/ProgressTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HousingReady Copilot",
    template: "%s | HousingReady Copilot",
  },
  description:
    "Organize synthetic housing application documents, understand published program rules, and prepare a readiness packet.",
  applicationName: "HousingReady Copilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-canvas antialiased">
      <body className="flex min-h-full flex-col overflow-x-clip bg-canvas text-ink">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-ink px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <Header />
        <ProgressTracker />
        <main id="main-content" className="relative z-10 flex-1">
          {children}
        </main>
        <footer className="relative z-10 border-t border-white/80 bg-white/90 shadow-[0_-18px_50px_-42px_rgba(15,47,66,0.5)] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-7 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand shadow-sm">
                <HouseHeart aria-hidden="true" size={18} />
              </span>
              <div>
                <p className="font-extrabold text-ink">HousingReady Copilot</p>
                <p className="mt-1 inline-flex items-center gap-1.5 leading-5">
                  <ShieldCheck aria-hidden="true" size={15} className="text-brand" />
                  Readiness support only — never an eligibility decision.
                </p>
              </div>
            </div>
            <nav aria-label="Footer" className="md:text-right">
              <ul className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
                <li>
                  <Link className="link-focus font-bold hover:text-brand" href="/privacy">
                    Privacy &amp; Safety
                  </Link>
                </li>
                <li>
                  <Link className="link-focus font-bold hover:text-brand" href="/about">
                    About
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
