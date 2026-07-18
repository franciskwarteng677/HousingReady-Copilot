"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SESSION_STORAGE_KEY } from "@/lib/session";

export function DeleteSessionButton() {
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    function markSessionActive() {
      setCleared(false);
    }

    window.addEventListener("housingready:session-active", markSessionActive);
    return () =>
      window.removeEventListener(
        "housingready:session-active",
        markSessionActive,
      );
  }, []);

  function deleteSession() {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new Event("housingready:session-cleared"));
    setCleared(true);
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
      {cleared ? (
        <p
          className="mt-1 text-xs font-semibold text-brand-dark"
          role="status"
          aria-live="polite"
        >
          Session cleared.
        </p>
      ) : null}
    </div>
  );
}
