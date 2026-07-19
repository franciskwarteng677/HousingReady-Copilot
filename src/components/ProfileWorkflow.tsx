"use client";

import {
  ArrowRight,
  DatabaseZap,
  FileSearch,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DocumentUploader } from "@/components/DocumentUploader";
import { FieldReviewList } from "@/components/FieldReviewList";
import { ProfileSummary } from "@/components/ProfileSummary";
import { SampleDocumentDownloads } from "@/components/SampleDocumentDownloads";
import { syntheticDemoExtractor } from "@/lib/extraction-service";
import {
  validateDocumentFiles,
  type ValidatedFile,
} from "@/lib/file-validation";
import { ObjectUrlRegistry } from "@/lib/object-url-registry";
import {
  type ExtractedField,
  type ProfileSession,
} from "@/lib/profile-schema";
import {
  confirmAllReviewedFields,
  confirmField,
  correctField,
  excludeField,
  getProfileProgress,
  restoreField,
  retainCandidate,
} from "@/lib/review-state";
import {
  createProfileSession,
  loadProfileSession,
  PROFILE_SESSION_KEY,
  PROFILE_UPDATED_EVENT,
  saveProfileSession,
  SESSION_ACTIVE_EVENT,
  SESSION_DELETED_EVENT,
} from "@/lib/session";
import type {
  FileValidationError,
  ReviewDocument,
} from "@/types/profile";

function createDocumentId(): string {
  if (typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return (
    "document-" +
    Date.now() +
    "-" +
    Math.random().toString(16).slice(2)
  );
}

export function ProfileWorkflow() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(new Map<string, File>());
  const urlsRef = useRef(new ObjectUrlRegistry());
  const [documents, setDocuments] = useState<ReviewDocument[]>([]);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<
    string | undefined
  >(undefined);
  const [fileErrors, setFileErrors] = useState<FileValidationError[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [restoredSession, setRestoredSession] =
    useState<ProfileSession | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);

  const progress = useMemo(
    () => getProfileProgress(documents, fields),
    [documents, fields],
  );

  const currentSession = useMemo(
    () =>
      workflowStarted
        ? createProfileSession(documents, fields)
        : null,
    [documents, fields, workflowStarted],
  );

  const summarySession = workflowStarted
    ? currentSession
    : restoredSession;
  const canContinue = summarySession?.profileComplete ?? false;
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? null;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setRestoredSession(loadProfileSession(window.sessionStorage));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!workflowStarted) {
      return;
    }

    if (documents.length === 0) {
      window.sessionStorage.removeItem(PROFILE_SESSION_KEY);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      return;
    }

    if (currentSession) {
      saveProfileSession(window.sessionStorage, currentSession);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    }
  }, [currentSession, documents.length, workflowStarted]);

  useEffect(() => {
    const registry = urlsRef.current;
    const files = filesRef.current;

    function resetWorkflow() {
      registry.revokeAll();
      files.clear();
      setDocuments([]);
      setFields([]);
      setSelectedDocumentId(null);
      setPreviewFile(null);
      setPreviewImageUrl(undefined);
      setFileErrors([]);
      setRestoredSession(null);
      setWorkflowStarted(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setAnnouncement("The Profile workspace was cleared.");
    }

    window.addEventListener(SESSION_DELETED_EVENT, resetWorkflow);

    return () => {
      window.removeEventListener(SESSION_DELETED_EVENT, resetWorkflow);
      registry.revokeAll();
      files.clear();
    };
  }, []);

  function updateDocument(
    documentId: string,
    update: Partial<ReviewDocument>,
  ) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId
          ? { ...document, ...update }
          : document,
      ),
    );
  }

  async function extractDocument(
    document: ReviewDocument,
    file: File,
  ) {
    try {
      const result = await syntheticDemoExtractor.extract({
        documentId: document.id,
        file,
      });

      if (!filesRef.current.has(document.id)) {
        return;
      }

      if (result.outcome === "fields") {
        updateDocument(document.id, {
          extractionState: "reviewed",
          sampleKind: result.sampleKind,
          noCallMessage: undefined,
        });
        setFields((current) => [
          ...current.filter(
            (field) => field.sourceDocumentId !== document.id,
          ),
          ...result.fields,
        ]);
        setAnnouncement(
          result.fields.length +
            " demo fields found in " +
            document.name +
            ". Review and confirm each field.",
        );
      } else {
        updateDocument(document.id, {
          extractionState: "no-call",
          sampleKind: null,
          noCallMessage: result.message,
        });
        setAnnouncement(document.name + " received a no-call.");
      }
    } catch {
      if (!filesRef.current.has(document.id)) {
        return;
      }

      updateDocument(document.id, {
        extractionState: "error",
        sampleKind: null,
        noCallMessage:
          "This document could not be processed in the current browser session.",
      });
      setAnnouncement(
        document.name + " could not be processed. No fields were created.",
      );
    }
  }

  function addValidatedFiles(validatedFiles: readonly ValidatedFile[]) {
    const newDocuments = validatedFiles.map(({ file, mimeType }) => {
      const id = createDocumentId();
      filesRef.current.set(id, file);
      let imageUrl: string | undefined;
      if (mimeType !== "application/pdf") {
        imageUrl = urlsRef.current.create(id, file);
      }

      const document: ReviewDocument = {
        id,
        name: file.name,
        mimeType,
        size: file.size,
        lastModified: file.lastModified,
        sampleKind: null,
        extractionState: "processing",
      };

      return { document, file, imageUrl };
    });

    if (newDocuments.length === 0) {
      return;
    }

    setWorkflowStarted(true);
    setRestoredSession(null);
    setDocuments((current) => [
      ...current,
      ...newDocuments.map(({ document }) => document),
    ]);
    const firstDocument = newDocuments[0];
    if (!selectedDocumentId && firstDocument) {
      setSelectedDocumentId(firstDocument.document.id);
      setPreviewFile(firstDocument.file);
      setPreviewImageUrl(firstDocument.imageUrl);
    }
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));

    for (const { document, file } of newDocuments) {
      void extractDocument(document, file);
    }
  }

  async function handleFilesSelected(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const result = await validateDocumentFiles(files);
    setFileErrors(result.errors);
    addValidatedFiles(result.accepted);

    const addedText =
      result.accepted.length +
      " " +
      (result.accepted.length === 1 ? "file was" : "files were") +
      " added.";
    const rejectedText =
      result.errors.length > 0
        ? " " +
          result.errors.length +
          " " +
          (result.errors.length === 1 ? "file was" : "files were") +
          " rejected."
        : "";
    setAnnouncement(addedText + rejectedText);
  }

  function handleRemoveDocument(documentId: string) {
    const removed = documents.find(
      (document) => document.id === documentId,
    );
    filesRef.current.delete(documentId);
    urlsRef.current.revoke(documentId);
    setFields((current) =>
      current.filter((field) => field.sourceDocumentId !== documentId),
    );
    setDocuments((current) =>
      current.filter((document) => document.id !== documentId),
    );
    if (selectedDocumentId === documentId) {
      const nextDocument =
        documents.find((document) => document.id !== documentId) ?? null;
      setSelectedDocumentId(nextDocument?.id ?? null);
      setPreviewFile(
        nextDocument
          ? filesRef.current.get(nextDocument.id) ?? null
          : null,
      );
      setPreviewImageUrl(
        nextDocument
          ? urlsRef.current.get(nextDocument.id)
          : undefined,
      );
    }
    setWorkflowStarted(true);
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));
    setAnnouncement(
      removed
        ? removed.name + " was removed and its temporary preview was revoked."
        : "The selected document was removed.",
    );
  }

  function handleSelectDocument(documentId: string) {
    setSelectedDocumentId(documentId);
    setPreviewFile(filesRef.current.get(documentId) ?? null);
    setPreviewImageUrl(urlsRef.current.get(documentId));
  }

  function handleCorrect(candidateId: string, value: string) {
    const field = fields.find((candidate) => candidate.candidateId === candidateId);
    setFields((current) => correctField(current, candidateId, value));
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));
    if (field?.status !== "corrected") {
      setAnnouncement((field?.label ?? "Field") + " status changed to Corrected.");
    }
  }

  function handleConfirm(candidateId: string) {
    const field = fields.find((candidate) => candidate.candidateId === candidateId);
    setFields((current) => confirmField(current, candidateId));
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));
    setAnnouncement((field?.label ?? "Field") + " was confirmed.");
  }

  function handleExclude(candidateId: string) {
    const field = fields.find((candidate) => candidate.candidateId === candidateId);
    setFields((current) => excludeField(current, candidateId));
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));
    setAnnouncement((field?.label ?? "Field") + " was intentionally excluded.");
  }

  function handleRestore(candidateId: string) {
    const field = fields.find((candidate) => candidate.candidateId === candidateId);
    setFields((current) => restoreField(current, candidateId));
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));
    setAnnouncement((field?.label ?? "Field") + " was restored for review.");
  }

  function handleRetain(candidateId: string) {
    const field = fields.find((candidate) => candidate.candidateId === candidateId);
    setFields((current) => retainCandidate(current, candidateId));
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));
    setAnnouncement(
      (field?.label ?? "Field") +
        " conflict resolved. The selected value was retained and the other candidates were excluded.",
    );
  }

  function handleConfirmAll() {
    const result = confirmAllReviewedFields(fields);
    setFields(result.fields);
    window.dispatchEvent(new Event(SESSION_ACTIVE_EVENT));
    setAnnouncement(
      result.skippedConflictCount > 0
        ? "All non-conflicting reviewed fields were confirmed. " +
            result.skippedConflictCount +
            " conflicting " +
            (result.skippedConflictCount === 1 ? "field still requires" : "fields still require") +
            " a retained value."
        : "All reviewed fields were confirmed.",
    );
  }

  let continueMessage =
    "Review at least one provided synthetic sample and confirm every usable field.";

  if (progress.pendingExtractions > 0) {
    continueMessage =
      "Wait for temporary demo extraction to finish before continuing.";
  } else if (progress.unresolvedConflictGroupIds.length > 0) {
    continueMessage =
      "Resolve every conflicting field by retaining one candidate value.";
  } else if (progress.pendingFields > 0) {
    continueMessage =
      "Confirm or intentionally exclude every usable field before continuing.";
  } else if (canContinue) {
    continueMessage =
      "Profile requirements are complete. You can continue to Understand.";
  } else if (restoredSession?.profileComplete && !workflowStarted) {
    continueMessage =
      "The restored confirmed profile is complete. You can continue to Understand.";
  }

  return (
    <div className="space-y-6">
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      <SampleDocumentDownloads />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <DocumentUploader
          inputRef={inputRef}
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          errors={fileErrors}
          onFilesSelected={handleFilesSelected}
          onSelectDocument={handleSelectDocument}
          onRemoveDocument={handleRemoveDocument}
        />

        <aside
          aria-labelledby="demo-boundaries-title"
          className="h-fit rounded-2xl border border-line bg-brand-soft p-6"
        >
          <ShieldCheck aria-hidden="true" size={24} className="text-brand" />
          <h2
            id="demo-boundaries-title"
            className="mt-4 text-lg font-bold text-ink"
          >
            Safe demo boundaries
          </h2>
          <ul className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
            <li className="flex items-start gap-3">
              <FileSearch
                aria-hidden="true"
                size={18}
                className="mt-0.5 shrink-0 text-brand"
              />
              Only exact provided sample fingerprints receive demo fields.
            </li>
            <li className="flex items-start gap-3">
              <DatabaseZap
                aria-hidden="true"
                size={18}
                className="mt-0.5 shrink-0 text-brand"
              />
              Raw files, full text, and preview URLs are never saved to session
              storage.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck
                aria-hidden="true"
                size={18}
                className="mt-0.5 shrink-0 text-brand"
              />
              Protected characteristics are never extracted or inferred.
            </li>
          </ul>
          <p className="mt-5 rounded-xl bg-white p-4 text-sm font-semibold leading-6 text-ink">
            This workflow supports document readiness only. It does not
            determine or imply housing eligibility.
          </p>
        </aside>
      </div>

      <DocumentPreview
        document={selectedDocument}
        file={previewFile}
        imageUrl={previewImageUrl}
      />

      <FieldReviewList
        fields={fields}
        onCorrect={handleCorrect}
        onConfirm={handleConfirm}
        onExclude={handleExclude}
        onRestore={handleRestore}
        onRetain={handleRetain}
        onConfirmAll={handleConfirmAll}
      />

      <ProfileSummary
        session={summarySession}
        restored={!workflowStarted && Boolean(restoredSession)}
      />

      <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div>
          <h2 className="font-bold text-ink">Continue when your review is complete</h2>
          <p
            id="continue-understand-help"
            className="mt-2 text-sm leading-6 text-slate-600"
          >
            {continueMessage}
          </p>
        </div>
        <button
          type="button"
          disabled={!canContinue}
          aria-describedby="continue-understand-help"
          onClick={() => router.push("/understand")}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-white outline-none transition-colors hover:bg-brand-dark focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 sm:mt-0 sm:w-auto"
        >
          Continue to Understand
          <ArrowRight aria-hidden="true" size={19} />
        </button>
      </div>
    </div>
  );
}
