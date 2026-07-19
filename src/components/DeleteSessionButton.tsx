"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearHousingReadySession,
  SESSION_ACTIVE_EVENT,
  SESSION_DELETED_EVENT,
} from "@/lib/session";

export function DeleteSessionButton() {
  const router = useRouter();
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    function markSessionActive() {
      setDeleted(false);
    }

    window.addEventListener(SESSION_ACTIVE_EVENT, markSessionActive);
    return () =>
      window.removeEventListener(SESSION_ACTIVE_EVENT, markSessionActive);
  }, []);

  function deleteSession() {
    const confirmed = window.confirm(
      "Delete this temporary HousingReady session? Confirmed fields, document metadata, and active previews will be cleared. This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    clearHousingReadySession(window.sessionStorage);
    window.dispatchEvent(new Event(SESSION_DELETED_EVENT));
    setDeleted(true);
    router.replace("/");
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={deleteSession}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-bold text-rose-700 shadow-sm outline-none transition-colors hover:border-rose-300 hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-200"
      >
        <Trash2 aria-hidden="true" size={17} />
        Delete Session
      </button>
      {deleted ? (
        <p
          className="mt-1 text-xs font-semibold text-brand-dark"
          role="status"
          aria-live="polite"
        >
          Temporary session deleted.
        </p>
      ) : null}
    </div>
  );
}
