import type { Metadata } from "next";
import { ArrowRight, FileUp, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DocumentUploadPlaceholder } from "@/components/DocumentUploadPlaceholder";
import { PageContainer } from "@/components/PageContainer";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Upload synthetic documents and confirm readiness profile details.",
};

export default function ProfilePage() {
  return (
    <PageContainer
      eyebrow="Stage 1 of 3 · Profile"
      title="Build your readiness profile"
      description="Add synthetic documents here. You will always review and confirm extracted information before moving forward."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-labelledby="upload-heading"
          className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <FileUp aria-hidden="true" size={22} />
            </span>
            <div>
              <h2 id="upload-heading" className="text-xl font-bold text-ink">
                Upload synthetic documents
              </h2>
              <p
                id="upload-help"
                className="mt-2 text-sm leading-6 text-slate-600"
              >
                Choose sample PDF, JPG, or PNG files. Up to 10 MB per file. Do
                not use real applicant documents.
              </p>
            </div>
          </div>

          <DocumentUploadPlaceholder />
        </section>

        <aside
          aria-labelledby="before-uploading-title"
          className="h-fit rounded-2xl border border-line bg-brand-soft p-6"
        >
          <ShieldCheck aria-hidden="true" size={24} className="text-brand" />
          <h2
            id="before-uploading-title"
            className="mt-4 text-lg font-bold text-ink"
          >
            Before uploading
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-700">
            <li>Use synthetic sample documents only.</li>
            <li>Confirm every extracted value yourself.</li>
            <li>Delete the temporary session whenever you choose.</li>
          </ul>
        </aside>
      </div>

      <div className="mt-8 flex justify-end">
        <Link
          href="/understand"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white outline-none transition-colors hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
        >
          Continue to Understand
          <ArrowRight aria-hidden="true" size={19} />
        </Link>
      </div>
    </PageContainer>
  );
}
