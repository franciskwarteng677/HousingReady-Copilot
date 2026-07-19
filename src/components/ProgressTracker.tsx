"use client";

import { Check, ChevronRight, CircleDot, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { progressSteps } from "@/data/progress-steps";
import {
  PROFILE_UPDATED_EVENT,
  SESSION_DELETED_EVENT,
} from "@/lib/session";
import { UNDERSTAND_UPDATED_EVENT } from "@/lib/understand-session";
import { loadCanonicalWorkflowState } from "@/lib/workflow-state";

export function ProgressTracker() {
  const pathname = usePathname();
  const [profileComplete, setProfileComplete] = useState(false);
  const [understandComplete, setUnderstandComplete] = useState(false);

  useEffect(() => {
    function updateProfileState() {
      const workflowState = loadCanonicalWorkflowState(
        window.sessionStorage,
      );

      setProfileComplete(workflowState.status !== "profile-incomplete");
      setUnderstandComplete(workflowState.status === "ready");
    }

    const timeoutId = window.setTimeout(updateProfileState, 0);
    window.addEventListener(PROFILE_UPDATED_EVENT, updateProfileState);
    window.addEventListener(UNDERSTAND_UPDATED_EVENT, updateProfileState);
    window.addEventListener(SESSION_DELETED_EVENT, updateProfileState);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(PROFILE_UPDATED_EVENT, updateProfileState);
      window.removeEventListener(UNDERSTAND_UPDATED_EVENT, updateProfileState);
      window.removeEventListener(SESSION_DELETED_EVENT, updateProfileState);
    };
  }, []);

  return (
    <nav
      aria-label="Application preparation progress"
      className="border-b border-line bg-white/95 shadow-[0_12px_30px_-28px_rgba(21,48,71,0.7)] backdrop-blur"
    >
      <ol className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-2 px-4 py-3.5 sm:gap-5 sm:px-6 sm:py-4 lg:gap-8 lg:px-8">
        {progressSteps.map((step, index) => {
          const isCurrent = pathname === step.href;
          const stageIsComplete =
            (index === 0 && profileComplete) ||
            (index === 1 && understandComplete);
          const isCompleted =
            stageIsComplete && !isCurrent;
          const isCurrentAndCompleted = stageIsComplete && isCurrent;
          const isLocked =
            (index === 1 && !profileComplete) ||
            (index === 2 && (!profileComplete || !understandComplete));
          const itemClassName = `group relative z-10 flex min-h-[5.5rem] w-full min-w-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border px-1.5 py-2.5 text-center shadow-sm transition duration-200 sm:min-h-[4.75rem] sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:py-3 sm:text-left ${
            isLocked
              ? "cursor-not-allowed border-slate-200/80 bg-slate-50/90 text-slate-500 shadow-none"
              : isCurrent
                ? "border-brand/50 bg-gradient-to-br from-brand-soft via-white to-white text-brand-dark shadow-[0_14px_32px_-24px_rgba(11,118,110,0.85)] ring-1 ring-brand/10"
                : isCompleted
                  ? "border-brand/25 bg-white text-brand-dark shadow-[0_10px_28px_-26px_rgba(11,118,110,0.9)] motion-safe:hover:-translate-y-0.5 hover:border-brand/45 hover:bg-brand-soft/40 hover:shadow-[0_16px_34px_-24px_rgba(11,118,110,0.65)]"
                  : "border-line bg-white text-slate-700 motion-safe:hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand-dark hover:shadow-[0_16px_34px_-26px_rgba(21,48,71,0.6)]"
          }`;
          const statusText = isLocked
            ? index === 1
              ? "Profile required"
              : "Understand required"
            : isCurrentAndCompleted
              ? "Completed · current step"
              : isCurrent
                ? "Current step"
                : isCompleted
                  ? "Completed"
                  : `Step ${index + 1}`;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-1 transition-colors ${
                  isLocked
                    ? "bg-slate-200"
                    : isCurrent
                      ? "bg-brand"
                      : isCompleted
                        ? "bg-brand/55"
                        : "bg-transparent group-hover:bg-brand/25"
                }`}
              />
              <span
                aria-hidden="true"
                className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold shadow-sm transition duration-200 sm:size-10 sm:text-sm ${
                  isLocked
                    ? "border-slate-200 bg-white text-slate-500 shadow-none"
                    : isCurrent
                    ? "border-brand bg-brand text-white ring-4 ring-brand/10"
                      : isCompleted
                        ? "border-brand/30 bg-brand-soft text-brand-dark"
                        : "border-slate-200 bg-slate-50 text-slate-700 group-hover:border-brand/25 group-hover:bg-white group-hover:text-brand-dark"
                }`}
              >
                {isLocked ? (
                  <LockKeyhole className="size-3.5 sm:size-4" strokeWidth={2.2} />
                ) : isCompleted || isCurrentAndCompleted ? (
                  <Check className="size-4 sm:size-[1.125rem]" strokeWidth={2.7} />
                ) : (
                  index + 1
                )}
                {isCurrent && !isCurrentAndCompleted ? (
                  <span className="absolute -right-1 -top-1 inline-flex size-3 items-center justify-center rounded-full bg-sun text-brand-dark ring-2 ring-white">
                    <CircleDot className="size-2" strokeWidth={3} />
                  </span>
                ) : null}
              </span>
              <span className="min-w-0 sm:flex-1">
                <span
                  className={`hidden text-[0.625rem] font-extrabold uppercase leading-none tracking-[0.16em] sm:block ${
                    isLocked ? "text-slate-400" : "text-brand/80"
                  }`}
                >
                  Stage {index + 1} of {progressSteps.length}
                </span>
                <span className="block text-xs font-extrabold leading-tight sm:mt-1 sm:text-[0.95rem]">
                  {step.label}
                </span>
                <span
                  className={`mt-0.5 inline-flex items-center justify-center gap-1 text-[0.625rem] font-bold leading-tight sm:justify-start sm:text-xs ${
                    isLocked
                      ? "text-slate-500"
                      : isCurrent || isCompleted
                        ? "text-brand-dark"
                        : "text-slate-500"
                  }`}
                >
                  {isCompleted || isCurrentAndCompleted ? (
                    <Check className="size-3" aria-hidden="true" strokeWidth={2.7} />
                  ) : isLocked ? (
                    <LockKeyhole className="size-3" aria-hidden="true" />
                  ) : isCurrent ? (
                    <CircleDot className="size-3" aria-hidden="true" />
                  ) : null}
                  {statusText}
                </span>
              </span>
            </>
          );

          return (
            <li key={step.id} className="relative flex min-w-0">
              {index < progressSteps.length - 1 ? (
                <ChevronRight
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-[0.875rem] top-1/2 z-20 hidden size-4 -translate-y-1/2 rounded-full bg-white p-0.5 sm:block lg:-right-6 ${
                    isCompleted
                      ? "text-brand"
                      : "text-slate-300"
                  }`}
                  strokeWidth={2.5}
                />
              ) : null}
              {isLocked ? (
                <span
                  aria-disabled="true"
                  aria-label={
                    "Step " +
                    (index + 1) +
                    ": " +
                    step.label +
                    (index === 1
                      ? ", complete Profile first"
                      : ", complete Understand first")
                  }
                  className={itemClassName}
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={step.href}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Step ${index + 1}: ${step.label}${isCurrentAndCompleted ? ", completed, current step" : isCurrent ? ", current step" : ""}`}
                  className={`${itemClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
