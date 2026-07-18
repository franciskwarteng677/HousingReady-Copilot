import type { Metadata } from "next";
import {
  ArrowLeft,
  ClipboardCheck,
  Download,
  FileStack,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

export const metadata: Metadata = {
  title: "Prepare",
  description:
    "Review a document checklist and prepare a downloadable application packet.",
};

const checklistItems = [
  "Identity document",
  "Income documentation",
  "Residency documentation",
];

export default function PreparePage() {
  return (
    <PageContainer
      eyebrow="Stage 3 of 3 · Prepare"
      title="Prepare your application packet"
      description="Review document readiness, resolve missing or expired items, and preview the packet you control."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="checklist-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <ClipboardCheck aria-hidden="true" size={23} className="text-brand" />
          <h2
            id="checklist-title"
            className="mt-4 text-xl font-bold text-ink"
          >
            Document checklist
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your confirmed documents will be grouped into a clear checklist.
          </p>
          <ul className="mt-5 space-y-3">
            {checklistItems.map((item) => (
              <li
                key={item}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"
              >
                <span className="font-semibold text-ink-soft">{item}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  Status: Not reviewed
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="missing-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <TriangleAlert
            aria-hidden="true"
            size={23}
            className="text-amber-700"
          />
          <h2
            id="missing-title"
            className="mt-4 text-xl font-bold text-ink"
          >
            Missing or expired items
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Items that may need attention will be listed with a plain-text
            reason and suggested next step.
          </p>
          <div className="mt-5 rounded-xl border border-amber-200 bg-sun-soft p-4">
            <p className="font-bold text-ink">Status: Not checked yet</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Complete the Profile stage before reviewing missing or expired
              documents.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="preview-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <FileStack aria-hidden="true" size={23} className="text-brand" />
          <h2 id="preview-title" className="mt-4 text-xl font-bold text-ink">
            Packet preview
          </h2>
          <div className="mt-5 flex min-h-52 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-canvas p-6 text-center">
            <div>
              <FileStack
                aria-hidden="true"
                size={30}
                className="mx-auto text-slate-400"
              />
              <p className="mt-3 font-bold text-ink">
                Preview not available yet
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Confirmed documents and a packet cover sheet will appear here.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="download-title"
          className="rounded-2xl border border-line bg-ink p-6 text-white shadow-card"
        >
          <Download aria-hidden="true" size={23} className="text-teal-300" />
          <h2 id="download-title" className="mt-4 text-xl font-bold">
            Download packet
          </h2>
          <p
            id="download-help"
            className="mt-3 text-sm leading-6 text-slate-300"
          >
            The download becomes available after you confirm your documents
            and review the checklist.
          </p>
          <button
            type="button"
            disabled
            aria-describedby="download-help"
            className="mt-7 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-bold text-white/70"
          >
            <Download aria-hidden="true" size={19} />
            Download not available
          </button>
        </section>
      </div>

      <div className="mt-8">
        <Link
          href="/understand"
          className="link-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 font-bold text-ink hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft aria-hidden="true" size={19} />
          Back to Understand
        </Link>
      </div>
    </PageContainer>
  );
}
