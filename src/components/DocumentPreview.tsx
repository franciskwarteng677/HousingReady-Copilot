import { Eye } from "lucide-react";
import { PdfPreview } from "@/components/PdfPreview";
import type { ReviewDocument } from "@/types/profile";

type DocumentPreviewProps = {
  document: ReviewDocument | null;
  file: File | null;
  imageUrl?: string;
};

export function DocumentPreview({
  document,
  file,
  imageUrl,
}: DocumentPreviewProps) {
  return (
    <section
      aria-labelledby="preview-heading"
      className="overflow-hidden rounded-2xl border border-line bg-white shadow-card"
    >
      <div className="flex items-start gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Eye aria-hidden="true" size={22} />
        </span>
        <div>
          <h2 id="preview-heading" className="text-xl font-bold text-ink">
            Document preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Inspect the selected document alongside its extracted evidence.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-line">
        {!document || !file ? (
          <div className="flex min-h-80 items-center justify-center bg-canvas p-6 text-center">
            <div>
              <Eye
                aria-hidden="true"
                size={30}
                className="mx-auto text-slate-400"
              />
              <p className="mt-3 font-bold text-ink">
                No document selected
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add a synthetic sample and choose Preview.
              </p>
            </div>
          </div>
        ) : document.mimeType === "application/pdf" ? (
          <PdfPreview
            key={document.id}
            file={file}
            fileName={document.name}
          />
        ) : imageUrl ? (
          <figure>
            <figcaption className="border-b border-line px-4 py-3 text-sm font-bold text-ink">
              Image preview: {document.name}
            </figcaption>
            <div className="flex min-h-80 items-center justify-center overflow-auto bg-slate-200 p-4">
              {/* A transient blob URL cannot use Next Image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={"Preview of " + document.name}
                className="max-h-[720px] max-w-full object-contain shadow-lg"
              />
            </div>
          </figure>
        ) : (
          <p className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            This image preview is no longer available.
          </p>
        )}
      </div>
    </section>
  );
}
