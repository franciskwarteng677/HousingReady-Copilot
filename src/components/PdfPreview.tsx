"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";

type PdfPreviewProps = {
  file: File;
  fileName: string;
};

type LoadedPdf = {
  document: PDFDocumentProxy;
  annotationMode: number;
};

export function PdfPreview({ file, fileName }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [renderMessage, setRenderMessage] = useState("Loading PDF preview.");

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const data = new Uint8Array(await file.arrayBuffer());

        if (cancelled) {
          return;
        }

        loadingTask = pdfjs.getDocument({
          data,
          enableXfa: false,
          maxImageSize: 16_777_216,
        });
        const document = await loadingTask.promise;

        if (cancelled) {
          await loadingTask.destroy();
          return;
        }

        setLoadedPdf({
          document,
          annotationMode: pdfjs.AnnotationMode.DISABLE,
        });
        setPageCount(document.numPages);
        setLoadState("ready");
        setRenderMessage(
          "PDF loaded. Page 1 of " + document.numPages + ".",
        );
      } catch {
        if (!cancelled) {
          setLoadState("error");
          setRenderMessage(
            "The PDF preview could not be rendered. You can remove the file and try another synthetic sample.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (loadingTask) {
        void loadingTask.destroy();
      }
    };
  }, [file]);

  useEffect(() => {
    if (!loadedPdf || !canvasRef.current) {
      return;
    }

    let cancelled = false;
    let renderTask: RenderTask | undefined;

    void (async () => {
      try {
        const page = await loadedPdf.document.getPage(pageNumber);
        if (cancelled || !canvasRef.current) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1.45, 760 / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * devicePixelRatio);
        canvas.height = Math.floor(viewport.height * devicePixelRatio);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        renderTask = page.render({
          canvas,
          viewport,
          annotationMode: loadedPdf.annotationMode,
          transform:
            devicePixelRatio === 1
              ? undefined
              : [
                  devicePixelRatio,
                  0,
                  0,
                  devicePixelRatio,
                  0,
                  0,
                ],
        });
        await renderTask.promise;

        if (!cancelled) {
          setRenderMessage(
            "Showing page " + pageNumber + " of " + pageCount + ".",
          );
        }
      } catch (error) {
        if (
          !cancelled &&
          (!(error instanceof Error) ||
            error.name !== "RenderingCancelledException")
        ) {
          setRenderMessage(
            "This PDF page could not be rendered in the preview.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [loadedPdf, pageCount, pageNumber]);

  return (
    <figure>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <figcaption className="min-w-0 break-all text-sm font-bold text-ink">
          PDF preview: {fileName}
        </figcaption>
        {loadState === "ready" ? (
          <div
            className="flex items-center gap-2"
            aria-label="PDF page navigation"
          >
            <button
              type="button"
              onClick={() =>
                setPageNumber((current) => Math.max(1, current - 1))
              }
              disabled={pageNumber <= 1}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous PDF page"
            >
              <ChevronLeft aria-hidden="true" size={17} />
              Previous
            </button>
            <span
              className="min-w-20 text-center text-sm font-semibold text-slate-700"
              aria-live="polite"
            >
              Page {pageNumber} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() =>
                setPageNumber((current) =>
                  Math.min(pageCount, current + 1),
                )
              }
              disabled={pageNumber >= pageCount}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next PDF page"
            >
              Next
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative min-h-80 overflow-auto bg-slate-200 p-4">
        {loadState === "loading" ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-semibold text-slate-700">
            <LoaderCircle
              aria-hidden="true"
              size={20}
              className="animate-spin"
            />
            Loading PDF preview
          </div>
        ) : null}
        {loadState === "error" ? (
          <p
            className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-white p-4 text-center text-sm leading-6 text-rose-800"
            role="alert"
          >
            {renderMessage}
          </p>
        ) : null}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={
            "Preview of " +
            fileName +
            ", page " +
            pageNumber +
            " of " +
            pageCount
          }
          className={
            "mx-auto max-w-none bg-white shadow-lg " +
            (loadState === "ready" ? "block" : "hidden")
          }
        />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {renderMessage}
      </p>
    </figure>
  );
}
