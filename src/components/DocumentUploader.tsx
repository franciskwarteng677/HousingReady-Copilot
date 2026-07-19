import {
  CircleAlert,
  CircleCheck,
  FileClock,
  FileQuestion,
  FileUp,
  Search,
  Trash2,
} from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import {
  formatFileSize,
  formatMimeType,
} from "@/lib/file-validation";
import type {
  FileValidationError,
  ReviewDocument,
} from "@/types/profile";

type DocumentUploaderProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  documents: readonly ReviewDocument[];
  selectedDocumentId: string | null;
  errors: readonly FileValidationError[];
  onFilesSelected: (files: File[]) => void;
  onSelectDocument: (documentId: string) => void;
  onRemoveDocument: (documentId: string) => void;
};

function DocumentStatus({
  state,
}: {
  state: ReviewDocument["extractionState"];
}) {
  if (state === "reviewed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark">
        <CircleCheck aria-hidden="true" size={15} />
        Demo fields found
      </span>
    );
  }

  if (state === "no-call") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
        <FileQuestion aria-hidden="true" size={15} />
        No-call
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700">
        <CircleAlert aria-hidden="true" size={15} />
        Processing error
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
      <FileClock aria-hidden="true" size={15} />
      Checking sample fingerprint
    </span>
  );
}

export function DocumentUploader({
  inputRef,
  documents,
  selectedDocumentId,
  errors,
  onFilesSelected,
  onSelectDocument,
  onRemoveDocument,
}: DocumentUploaderProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFilesSelected(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  return (
    <section
      aria-labelledby="upload-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <FileUp aria-hidden="true" size={22} />
        </span>
        <div>
          <h2 id="upload-heading" className="text-xl font-bold text-ink">
            Upload synthetic documents
          </h2>
          <p id="upload-help" className="mt-2 text-sm leading-6 text-slate-600">
            Select multiple PDF, JPG, or PNG files. Each file must be 10 MB or
            smaller. Files are processed only in this browser session and are
            never permanently uploaded or stored.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 bg-canvas p-5 text-center sm:p-8">
        <label
          htmlFor="synthetic-documents"
          className="block text-base font-bold text-ink"
        >
          Choose synthetic files from your device
        </label>
        <p className="mt-2 text-sm font-semibold text-rose-700">
          Do not upload real applicant documents or personal information.
        </p>
        <input
          ref={inputRef}
          id="synthetic-documents"
          name="synthetic-documents"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          aria-describedby="upload-help upload-limit"
          onChange={handleChange}
          className="mt-5 block w-full cursor-pointer rounded-xl border border-line bg-white text-sm text-slate-600 outline-none file:mr-4 file:cursor-pointer file:border-0 file:bg-brand file:px-4 file:py-3 file:font-bold file:text-white hover:file:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
        />
        <p id="upload-limit" className="mt-3 text-xs text-slate-500">
          Accepted: PDF, JPG, PNG. Maximum: 10 MB per file.
        </p>
      </div>

      {errors.length > 0 ? (
        <div
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4"
          role="alert"
          aria-labelledby="file-errors-title"
        >
          <h3 id="file-errors-title" className="font-bold text-rose-900">
            Some files were not added
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-rose-800">
            {errors.map((error) => (
              <li key={error.id}>{error.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-ink">Selected files</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {documents.length} {documents.length === 1 ? "file" : "files"}
          </span>
        </div>

        {documents.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-canvas px-4 py-4 text-sm text-slate-600">
            Status: No documents selected
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {documents.map((document) => {
              const isSelected = document.id === selectedDocumentId;

              return (
                <li
                  key={document.id}
                  className={
                    "rounded-xl border p-4 " +
                    (isSelected
                      ? "border-brand bg-brand-soft"
                      : "border-line bg-white")
                  }
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-bold text-ink">
                        {document.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatMimeType(document.mimeType)} ·{" "}
                        {formatFileSize(document.size)}
                      </p>
                      <div className="mt-2">
                        <DocumentStatus state={document.extractionState} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectDocument(document.id)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-200"
                        aria-pressed={isSelected}
                      >
                        <Search aria-hidden="true" size={16} />
                        {isSelected ? "Previewing" : "Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveDocument(document.id)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-200"
                        aria-label={"Remove " + document.name}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                        Remove
                      </button>
                    </div>
                  </div>

                  {document.noCallMessage ? (
                    <p className="mt-3 rounded-lg bg-sun-soft px-3 py-2 text-sm leading-6 text-slate-700">
                      {document.noCallMessage}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
