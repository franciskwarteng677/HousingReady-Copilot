import type { Metadata } from "next";
import { FileLock2, ShieldAlert, TimerReset } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { SafetyNotice } from "@/components/SafetyNotice";

export const metadata: Metadata = {
  title: "Privacy & Safety",
  description:
    "Learn how the HousingReady Copilot prototype handles synthetic documents and temporary sessions.",
};

export default function PrivacyPage() {
  return (
    <PageContainer
      eyebrow="Trust and boundaries"
      title="Privacy & Safety"
      description="Your information stays yours. This foundation is intentionally designed for synthetic data and temporary prototype sessions."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <section
          aria-labelledby="synthetic-only-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <FileLock2 aria-hidden="true" size={23} className="text-brand" />
          <h2
            id="synthetic-only-title"
            className="mt-4 text-lg font-bold text-ink"
          >
            Synthetic documents only
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use fictional sample documents in this hackathon prototype. Never
            upload real applicant records, identity documents, or financial
            information.
          </p>
        </section>

        <section
          aria-labelledby="temporary-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <TimerReset aria-hidden="true" size={23} className="text-brand" />
          <h2
            id="temporary-title"
            className="mt-4 text-lg font-bold text-ink"
          >
            Temporary session processing
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Prototype work is scoped to a temporary browser session. Files are
            processed client-side. Temporary storage is limited to confirmed
            structured Profile fields, integer-cent money values, document
            metadata, minimal revision information, confirmed household size,
            deterministic calculation inputs and results, frozen corpus
            identifiers, rule-review state, and Prepare review flags bound to
            the current Profile and Understand revisions. Raw documents,
            packet content, preview data, PDF bytes, full source text, source
            URLs, and object URLs are never restored from storage.
          </p>
        </section>

        <section
          aria-labelledby="control-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <ShieldAlert aria-hidden="true" size={23} className="text-brand" />
          <h2 id="control-title" className="mt-4 text-lg font-bold text-ink">
            You stay in control
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use the visible Delete Session button at any time to clear
            temporary browser-session values created by this prototype.
          </p>
        </section>
      </div>

      <section
        aria-labelledby="downloaded-packet-title"
        className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-7"
      >
        <h2 id="downloaded-packet-title" className="text-xl font-bold text-ink">
          Downloaded packets stay under your control
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          A packet is assembled client-side from confirmed structured demo
          values only after you choose Download. Packet bytes are not stored in
          the temporary HousingReady session or sent to a backend. A file you
          download is saved by your browser on your device; Delete Session
          cannot remove that downloaded file, so use your device controls to
          delete it when you no longer need it.
        </p>
      </section>

      <div className="mt-6">
        <SafetyNotice />
      </div>
    </PageContainer>
  );
}
