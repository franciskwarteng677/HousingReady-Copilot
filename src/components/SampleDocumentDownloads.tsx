import { Download, FileText } from "lucide-react";
import { sampleDocuments } from "@/data/sample-documents";

export function SampleDocumentDownloads() {
  return (
    <section
      aria-labelledby="sample-documents-title"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <FileText aria-hidden="true" size={22} />
        </span>
        <div>
          <h2
            id="sample-documents-title"
            className="text-xl font-bold text-ink"
          >
            Download sample documents
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Download these fictional PDFs, then upload them below to test the
            complete confirmation workflow.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {sampleDocuments.map((document) => (
          <article
            key={document.kind}
            className="flex h-full flex-col rounded-xl border border-line bg-canvas p-4"
          >
            <h3 className="font-bold text-ink">{document.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              {document.description}
            </p>
            <a
              href={document.href}
              download={document.fileName}
              className="link-focus mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand bg-white px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand-soft"
            >
              <Download aria-hidden="true" size={17} />
              Download PDF
            </a>
          </article>
        ))}
      </div>

      <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
        Every sample is marked “SYNTHETIC DEMO DOCUMENT — NOT REAL APPLICANT
        DATA.”
      </p>
    </section>
  );
}
