"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { frozen2026MtspCorpus } from "@/data/rules";
import { isCompletedProfileSession } from "@/lib/profile-fingerprint";
import { loadProfileSession } from "@/lib/session";
import { loadCurrentUnderstandSession } from "@/lib/understand-session";
import { getUnderstandProgress } from "@/lib/understand-state";

type PrepareAccessGuardProps = {
  children: ReactNode;
};

export function PrepareAccessGuard({ children }: PrepareAccessGuardProps) {
  const { replace } = useRouter();
  const [access, setAccess] = useState<
    "checking" | "allowed" | "redirecting"
  >("checking");
  const [message, setMessage] = useState(
    "Checking Profile and Understand completion.",
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const profile = loadProfileSession(window.sessionStorage);
      if (!isCompletedProfileSession(profile)) {
        setAccess("redirecting");
        setMessage("Complete Profile before opening Prepare.");
        replace("/profile");
        return;
      }

      const understand = loadCurrentUnderstandSession(
        window.sessionStorage,
        profile,
      );
      const progress = getUnderstandProgress(
        profile,
        understand,
        frozen2026MtspCorpus,
      );

      if (!understand?.understandComplete || !progress.understandComplete) {
        setAccess("redirecting");
        setMessage("Complete the verified Understand review before opening Prepare.");
        replace("/understand");
        return;
      }

      setAccess("allowed");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [replace]);

  if (access === "allowed") {
    return children;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <section className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        {access === "checking" ? (
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
