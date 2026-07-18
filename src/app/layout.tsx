import type { Metadata } from "next";
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
    "Organise synthetic housing application documents, understand published programme rules, and prepare a readiness packet.",
  applicationName: "HousingReady Copilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-canvas antialiased">
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-ink px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <Header />
        <ProgressTracker />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-line bg-white">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-7 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>Readiness support only — never an eligibility decision.</p>
            <nav aria-label="Footer">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                <li>
                  <Link className="link-focus hover:text-brand" href="/privacy">
                    Privacy &amp; Safety
                  </Link>
                </li>
                <li>
                  <Link className="link-focus hover:text-brand" href="/about">
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
