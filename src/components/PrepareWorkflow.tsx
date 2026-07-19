"use client";

import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Download,
  FileStack,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePrepareWorkflowState } from "@/components/PrepareAccessGuard";
import { ReadinessPacketPreview } from "@/components/ReadinessPacketPreview";
import { formatCurrencyFromCents } from "@/lib/income-calculation";
import {
  buildReadinessPacketContent,
  type ReadinessPacketContent,
} from "@/lib/packet-content";
import type {
  PrepareDocumentCategoryId,
  PrepareSession,
} from "@/lib/prepare-schema";
import {
  createPrepareSession,
  getPrepareReviewProgress,
  loadCurrentPrepareSession,
  PREPARE_UPDATED_EVENT,
  savePrepareSession,
  setMissingOrExpiredReview,
  setPrepareDocumentReview,
} from "@/lib/prepare-session";
import { SESSION_DELETED_EVENT } from "@/lib/session";

const checklistItems: readonly {
  id: PrepareDocumentCategoryId;
  label: string;
  description: string;
}[] = [
  {
    id: "identity-document",
    label: "Identity document",
    description:
      "Record your review of this product readiness category. This is not an official HUD checklist rule.",
  },
  {
    id: "income-documentation",
    label: "Income documentation",
    description:
      "Review the confirmed income-document metadata and readiness yourself.",
  },
  {
    id: "residency-documentation",
    label: "Residency documentation",
    description:
      "Review the confirmed residency-document metadata and readiness yourself.",
  },
];

const pendingRequirementLabels = {
  "identity-document": "Identity document review",
  "income-documentation": "Income documentation review",
  "residency-documentation": "Residency documentation review",
  "missing-or-expired": "Missing or expired items review",
} as const;

type GenerationStatus = "idle" | "generating" | "success" | "error";

const generationErrorMessage =
  "The readiness packet PDF could not be generated. Try again.";

export function PrepareWorkflow() {
  const { profile, understand } = usePrepareWorkflowState();
  const [prepareSession, setPrepareSession] =
    useState<PrepareSession | null>(null);
  const [prepareStateLoaded, setPrepareStateLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const activePdfUrlRef = useRef<string | null>(null);
  const revokeTimerRef = useRef<number | null>(null);
  const grossPay = profile.confirmedFields.find(
    (field) => field.fieldId === "grossPay",
  );
  const householdSize = understand.householdSize?.value;
  const combinedAnnualisedCents = understand.calculation?.combined.resultCents;

  const revokeTemporaryPdfUrl = useCallback(() => {
    if (revokeTimerRef.current !== null) {
      window.clearTimeout(revokeTimerRef.current);
      revokeTimerRef.current = null;
    }

    if (activePdfUrlRef.current !== null) {
      URL.revokeObjectURL(activePdfUrlRef.current);
      activePdfUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const restored = loadCurrentPrepareSession(
        window.sessionStorage,
        profile,
        understand,
      );
      const nextSession =
        restored ?? createPrepareSession(profile, understand);

      if (!restored) {
        savePrepareSession(window.sessionStorage, nextSession);
      }

      setPrepareSession(nextSession);
      setPrepareStateLoaded(true);
    }, 0);

    function handleSessionDeleted() {
      revokeTemporaryPdfUrl();
      setPrepareSession(null);
      setPrepareStateLoaded(false);
      setLastGeneratedAt(null);
      setGenerationStatus("idle");
      setGenerationError(null);
    }

    window.addEventListener(SESSION_DELETED_EVENT, handleSessionDeleted);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(SESSION_DELETED_EVENT, handleSessionDeleted);
      revokeTemporaryPdfUrl();
    };
  }, [profile, understand, revokeTemporaryPdfUrl]);

  const reviewProgress = useMemo(
    () =>
      getPrepareReviewProgress(profile, understand, prepareSession),
    [profile, understand, prepareSession],
  );

  const previewGeneratedAt =
    lastGeneratedAt ?? prepareSession?.updatedAt ?? null;

  const previewBuildResult = useMemo(() => {
    if (!reviewProgress.packetReady || !previewGeneratedAt) {
      return null;
    }

    try {
      return buildReadinessPacketContent({
        profile,
        understand,
        prepareReview: prepareSession,
        generatedAt: previewGeneratedAt,
      });
    } catch {
      return {
        status: "blocked" as const,
        reasons: [
          "The packet preview could not be constructed from the current confirmed structured information.",
        ],
      };
    }
  }, [
    prepareSession,
    previewGeneratedAt,
    profile,
    reviewProgress.packetReady,
    understand,
  ]);

  const packet: ReadinessPacketContent | null =
    previewBuildResult?.status === "ready" ? previewBuildResult.packet : null;
  const packetReady = reviewProgress.packetReady && packet !== null;

  function persistPrepareSession(
    nextSession: PrepareSession,
    message: string,
  ) {
    savePrepareSession(window.sessionStorage, nextSession);
    setPrepareSession(nextSession);
    setLastGeneratedAt(null);
    setGenerationStatus("idle");
    setGenerationError(null);
    revokeTemporaryPdfUrl();
    window.dispatchEvent(new Event(PREPARE_UPDATED_EVENT));

    const nextProgress = getPrepareReviewProgress(
      profile,
      understand,
      nextSession,
    );
    setAnnouncement(
      `${message} ${nextProgress.completedReviewCount} of ${nextProgress.totalReviewCount} Prepare reviews completed.`,
    );
  }

  function updateChecklistItem(
    itemId: PrepareDocumentCategoryId,
    checked: boolean,
  ) {
    if (!prepareSession) {
      return;
    }

    const item = checklistItems.find((candidate) => candidate.id === itemId);
    const nextSession = setPrepareDocumentReview(
      prepareSession,
      itemId,
      checked,
    );
    persistPrepareSession(
      nextSession,
      `${item?.label ?? "Document"} marked ${checked ? "reviewed" : "not reviewed"}.`,
    );
  }

  function updateMissingOrExpiredReview(checked: boolean) {
    if (!prepareSession) {
      return;
    }

    persistPrepareSession(
      setMissingOrExpiredReview(prepareSession, checked),
      `Missing or expired items marked ${checked ? "reviewed" : "not reviewed"}.`,
    );
  }

  async function downloadPacket() {
    if (!prepareSession || !reviewProgress.packetReady) {
      return;
    }

    setGenerationStatus("generating");
    setGenerationError(null);
    setAnnouncement("Generating the readiness packet PDF in this browser.");
    revokeTemporaryPdfUrl();

    try {
      const generatedAt = new Date().toISOString();
      const latestPacketResult = buildReadinessPacketContent({
        profile,
        understand,
        prepareReview: prepareSession,
        generatedAt,
      });

      if (latestPacketResult.status !== "ready") {
        throw new Error(latestPacketResult.reasons.join(" "));
      }

      const { generateReadinessPacketPdf } = await import("@/lib/packet-pdf");
      const generated = await generateReadinessPacketPdf(
        latestPacketResult.packet,
      );
      const objectUrl = URL.createObjectURL(generated.blob);
      activePdfUrlRef.current = objectUrl;

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = generated.filename;
      anchor.rel = "noopener";
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();

      revokeTimerRef.current = window.setTimeout(() => {
        if (activePdfUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          activePdfUrlRef.current = null;
        }
        revokeTimerRef.current = null;
      }, 0);

      setLastGeneratedAt(generatedAt);
      setGenerationStatus("success");
      setAnnouncement("Readiness packet PDF generated and downloaded.");
    } catch {
      revokeTemporaryPdfUrl();
      setGenerationStatus("error");
      setGenerationError(generationErrorMessage);
      setAnnouncement(generationErrorMessage);
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  }

  const grossPayDisplay =
    grossPay?.valueCents === null || grossPay?.valueCents === undefined
      ? grossPay?.value ?? "No confirmed value"
      : formatCurrencyFromCents(grossPay.valueCents);
  const pendingReviewText = reviewProgress.pendingReviewIds
    .map((requirementId) => pendingRequirementLabels[requirementId])
    .join(", ");

  return (
    <div className="space-y-5">
      <section
        aria-labelledby="prepare-prerequisites-title"
        className="rounded-2xl border border-brand/30 bg-brand-soft p-5 shadow-card sm:p-6"
      >
        <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-dark">
          <ShieldCheck aria-hidden="true" size={18} />
          Canonical workflow state restored
        </p>
        <h2
          id="prepare-prerequisites-title"
          className="mt-2 text-xl font-bold text-ink"
        >
          Profile and Understand prerequisites are complete
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Prepare uses the same validated Profile and acknowledged Understand
          session that unlocked this route. The numerical HUD comparison never
          controls packet access.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-brand/20 bg-white p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Profile revision
            </dt>
            <dd className="mt-1 font-extrabold text-ink">{profile.revision}</dd>
          </div>
          <div className="rounded-xl border border-brand/20 bg-white p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Gross pay
            </dt>
            <dd className="mt-1 font-extrabold text-ink">{grossPayDisplay}</dd>
          </div>
          <div className="rounded-xl border border-brand/20 bg-white p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Household size
            </dt>
            <dd className="mt-1 font-extrabold text-ink">
              {householdSize ?? "Not confirmed"}
            </dd>
          </div>
          <div className="rounded-xl border border-brand/20 bg-white p-3">
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Annualised amount
            </dt>
            <dd className="mt-1 font-extrabold text-ink">
              {combinedAnnualisedCents === undefined
                ? "No current calculation"
                : formatCurrencyFromCents(combinedAnnualisedCents)}
            </dd>
          </div>
        </dl>
      </section>

      <p
        className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
        role="status"
      >
        {prepareStateLoaded
          ? `${reviewProgress.completedReviewCount} of ${reviewProgress.totalReviewCount} Prepare reviews completed`
          : "Restoring temporary Prepare review state"}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="checklist-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <ClipboardCheck aria-hidden="true" size={23} className="text-brand" />
          <h2 id="checklist-title" className="mt-4 text-xl font-bold text-ink">
            Document checklist
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Review each product readiness category yourself. Items are never
            marked complete from the income comparison and do not certify that a
            property will accept a document.
          </p>
          <fieldset className="mt-5" disabled={!prepareStateLoaded}>
            <legend className="sr-only">Document review controls</legend>
            <div className="space-y-3">
              {checklistItems.map((item) => {
                const checked =
                  prepareSession?.documentReviews[item.id] ?? false;

                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 outline-none transition-colors hover:border-brand/40 hover:bg-brand-soft/30 focus-within:ring-4 focus-within:ring-teal-200"
                  >
                    <input
                      type="checkbox"
                      aria-label={`Review ${item.label}`}
                      checked={checked}
                      onChange={(event) =>
                        updateChecklistItem(item.id, event.target.checked)
                      }
                      className="mt-1 size-5 shrink-0 accent-brand"
                    />
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">
                        Review {item.label}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        {item.description}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        {checked ? (
                          <CheckCircle2 aria-hidden="true" size={15} />
                        ) : (
                          <CircleAlert aria-hidden="true" size={15} />
                        )}
                        Status: {checked ? "Reviewed by renter" : "Not reviewed"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        <section
          aria-labelledby="missing-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <TriangleAlert aria-hidden="true" size={23} className="text-amber-700" />
          <h2 id="missing-title" className="mt-4 text-xl font-bold text-ink">
            Missing or expired items
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            No missing, expired, valid, or accepted status is decided
            automatically. Record only that you reviewed this section.
          </p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-sun-soft p-4 outline-none focus-within:ring-4 focus-within:ring-amber-200">
            <input
              type="checkbox"
              aria-label="I reviewed missing or expired items"
              checked={prepareSession?.missingOrExpiredReviewed ?? false}
              disabled={!prepareStateLoaded}
              onChange={(event) =>
                updateMissingOrExpiredReview(event.target.checked)
              }
              className="mt-1 size-5 shrink-0 accent-brand"
            />
            <span>
              <span className="block font-bold text-ink">
                I reviewed missing or expired items
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                This records only your review action. It does not certify
                document validity, completeness, acceptance, or compliance.
              </span>
              <span className="mt-2 block text-xs font-bold text-amber-950">
                Status:{" "}
                {prepareSession?.missingOrExpiredReviewed
                  ? "Reviewed by renter"
                  : "Not reviewed"}
              </span>
            </span>
          </label>
        </section>
      </div>

      {packet ? (
        <ReadinessPacketPreview packet={packet} />
      ) : (
        <section
          aria-labelledby="packet-preview-title"
          className="rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <FileStack aria-hidden="true" size={23} className="text-brand" />
          <h2 id="packet-preview-title" className="mt-4 text-xl font-bold text-ink">
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
                Complete all Prepare reviews to build the packet preview.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {previewBuildResult?.status === "blocked"
                  ? previewBuildResult.reasons.join(" ")
                  : pendingReviewText
                    ? `Still required: ${pendingReviewText}.`
                    : "The current structured packet information is being validated."}
              </p>
            </div>
          </div>
        </section>
      )}

      <section
        aria-labelledby="download-title"
        className="rounded-2xl border border-line bg-ink p-6 text-white shadow-card"
      >
        <Download aria-hidden="true" size={23} className="text-teal-300" />
        <h2 id="download-title" className="mt-4 text-xl font-bold">
          Download packet
        </h2>
        <p id="download-help" className="mt-3 text-sm leading-6 text-slate-300">
          {packetReady
            ? `The packet will be generated only in this browser as ${packet.filename}. No uploaded source file or preview is embedded.`
            : pendingReviewText
              ? `Download remains disabled. Still required: ${pendingReviewText}.`
              : "Download remains disabled until the current structured packet information is ready."}
        </p>

        {generationError ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mt-4 rounded-xl border border-rose-300 bg-rose-950/40 p-4 text-sm font-bold text-rose-100 outline-none focus:ring-4 focus:ring-rose-300"
          >
            {generationError}
          </div>
        ) : null}

        {generationStatus === "success" ? (
          <p
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal-200"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 aria-hidden="true" size={18} />
            Readiness packet PDF generated and downloaded.
          </p>
        ) : null}

        <button
          type="button"
          disabled={!packetReady || generationStatus === "generating"}
          aria-describedby="download-help"
          onClick={downloadPacket}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-ink outline-none transition-colors hover:bg-teal-50 focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/70"
        >
          {generationStatus === "generating" ? (
            <>
              <LoaderCircle aria-hidden="true" size={19} className="animate-spin" />
              Generating readiness packet PDF…
            </>
          ) : (
            <>
              <Download aria-hidden="true" size={19} />
              Download readiness packet PDF
            </>
          )}
        </button>
      </section>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {generationStatus === "success" ? "" : announcement}
      </p>
    </div>
  );
}
