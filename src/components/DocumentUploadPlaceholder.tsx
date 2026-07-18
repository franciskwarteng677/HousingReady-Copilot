"use client";

import { useEffect, useRef, useState } from "react";

export function DocumentUploadPlaceholder() {
  const [selectedCount, setSelectedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function clearSelection() {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setSelectedCount(0);
    }

    window.addEventListener("housingready:session-cleared", clearSelection);
    return () =>
      window.removeEventListener(
        "housingready:session-cleared",
        clearSelection,
      );
  }, []);

  const documentLabel =
    selectedCount === 1 ? "synthetic document" : "synthetic documents";
  const status =
    selectedCount === 0
      ? "Status: No documents selected"
      : "Status: " +
        selectedCount +
        " " +
        documentLabel +
        " selected for confirmation";

  return (
    <div className="mt-7 rounded-2xl border-2 border-dashed border-slate-300 bg-canvas p-6 text-center sm:p-10">
      <label
        htmlFor="synthetic-documents"
        className="block text-base font-bold text-ink"
      >
        Select documents from your device
      </label>
      <p className="mt-2 text-sm text-slate-600">
        The upload and extraction workflow will appear here.
      </p>
      <input
        ref={inputRef}
        id="synthetic-documents"
        name="synthetic-documents"
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png"
        aria-describedby="upload-help upload-status"
        onChange={(event) => {
          const nextCount = event.target.files?.length ?? 0;
          setSelectedCount(nextCount);
          if (nextCount > 0) {
            window.dispatchEvent(new Event("housingready:session-active"));
          }
        }}
        className="mt-5 block w-full cursor-pointer rounded-xl border border-line bg-white text-sm text-slate-600 outline-none file:mr-4 file:cursor-pointer file:border-0 file:bg-brand file:px-4 file:py-3 file:font-bold file:text-white hover:file:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200"
      />
      <p
        id="upload-status"
        className="mt-4 text-sm font-semibold text-slate-500"
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
