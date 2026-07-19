"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  loadCanonicalWorkflowState,
  type CanonicalWorkflowState,
  type ReadyWorkflowState,
} from "@/lib/workflow-state";

type PrepareAccessGuardProps = {
  children: ReactNode;
};

const PrepareWorkflowContext = createContext<ReadyWorkflowState | null>(null);

export function usePrepareWorkflowState(): ReadyWorkflowState {
  const state = useContext(PrepareWorkflowContext);

  if (!state) {
    throw new Error(
      "Prepare workflow content must render inside PrepareAccessGuard.",
    );
  }

  return state;
}

export function PrepareAccessGuard({ children }: PrepareAccessGuardProps) {
  const { replace } = useRouter();
  const [workflowState, setWorkflowState] =
    useState<CanonicalWorkflowState | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextState = loadCanonicalWorkflowState(window.sessionStorage);
      setWorkflowState(nextState);

      if (nextState.status !== "ready") {
        replace(nextState.redirectTo);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [replace]);

  if (workflowState?.status === "ready") {
    return (
      <PrepareWorkflowContext.Provider value={workflowState}>
        {children}
      </PrepareWorkflowContext.Provider>
    );
  }

  const message =
    workflowState?.status === "profile-incomplete"
      ? "Complete Profile before opening Prepare."
      : workflowState?.status === "understand-incomplete"
        ? "Complete the verified Understand review before opening Prepare."
        : "Checking Profile and Understand completion.";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <section className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        {workflowState === null ? (
          <LoaderCircle
            aria-hidden="true"
            size={28}
            className="mx-auto animate-spin text-brand"
          />
        ) : (
          <LockKeyhole
            aria-hidden="true"
            size={28}
            className="mx-auto text-amber-700"
          />
        )}
        <h1 className="mt-4 text-2xl font-bold text-ink">Prepare is locked</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600" role="status">
          {message}
        </p>
      </section>
    </div>
  );
}
