"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { progressSteps } from "@/data/progress-steps";
import {
  loadProfileSession,
  PROFILE_UPDATED_EVENT,
  SESSION_DELETED_EVENT,
} from "@/lib/session";

export function ProgressTracker() {
  const pathname = usePathname();
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    function updateProfileState() {
      setProfileComplete(
        loadProfileSession(window.sessionStorage)?.profileComplete ?? false,
      );
    }

    const timeoutId = window.setTimeout(updateProfileState, 0);
    window.addEventListener(PROFILE_UPDATED_EVENT, updateProfileState);
    window.addEventListener(SESSION_DELETED_EVENT, updateProfileState);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(PROFILE_UPDATED_EVENT, updateProfileState);
      window.removeEventListener(SESSION_DELETED_EVENT, updateProfileState);
    };
  }, []);

  return (
    <nav
      aria-label="Application preparation progress"
      className="border-b border-line bg-white/80"
    >
      <ol className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8">
        {progressSteps.map((step, index) => {
          const isCurrent = pathname === step.href;
          const isLocked = index > 0 && !profileComplete && !isCurrent;
          const itemClassName = `link-focus flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center transition-colors sm:min-h-14 sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${
            isCurrent
              ? "border-brand bg-brand-soft text-brand-dark"
              : isLocked
                ? "cursor-not-allowed border-transparent bg-slate-50 text-slate-500"
                : "border-transparent text-slate-600 hover:border-line hover:bg-canvas"
          }`;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold sm:size-8 sm:text-sm ${
                  isCurrent
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isLocked ? <LockKeyhole size={13} /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold leading-tight sm:text-base">
                  {step.label}
                </span>
                <span className="block text-[10px] font-semibold leading-tight sm:text-xs">
                  {isCurrent
                    ? "Current step"
                    : isLocked
                      ? "Profile required"
                      : `Step ${index + 1}`}
                </span>
              </span>
            </>
          );

          return (
            <li key={step.id}>
              {isLocked ? (
                <span
                  aria-disabled="true"
                  aria-label={
                    "Step " +
                    (index + 1) +
                    ": " +
                    step.label +
                    ", complete Profile first"
                  }
                  className={itemClassName}
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={step.href}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Step ${index + 1}: ${step.label}${isCurrent ? ", current step" : ""}`}
                  className={itemClassName}
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
