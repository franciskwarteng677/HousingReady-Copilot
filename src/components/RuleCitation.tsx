"use client";

import {
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  FileWarning,
} from "lucide-react";
import { useId } from "react";
import type { RulesAssistantCitation } from "@/lib/rules-assistant";

type RuleCitationProps = {
  citation: RulesAssistantCitation;
};

function verificationLabel(
  status: RulesAssistantCitation["verificationStatus"],
): string {
  if (status === "verified") {
    return "Verified source";
  }

  if (status === "template") {
    return "Template data — not official";
  }

  return "Unverified source — not official";
}

export function RuleCitation({ citation }: RuleCitationProps) {
  const instanceId = useId().replace(/[^a-z0-9]/gi, "-");
  const headingId =
    "citation-" +
    citation.citationId.replace(/[^a-z0-9]/gi, "-") +
    "-" +
    instanceId;
  const isVerified = citation.verificationStatus === "verified";
  const safeSourceUrl =
    citation.sourceUrl?.startsWith("https://") ||
    /^\/[A-Za-z0-9/_-]*$/.test(citation.sourceUrl ?? "")
      ? citation.sourceUrl
      : null;
  const isExternal = safeSourceUrl?.startsWith("https://") ?? false;

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-xl border border-line bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Citation and source details
          </p>
          <h4 id={headingId} className="mt-1 font-bold text-ink">
            {citation.sourceTitle}
          </h4>
        </div>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold " +
            (isVerified
              ? "bg-brand-soft text-brand-dark"
              : "bg-sun-soft text-amber-900")
          }
        >
          {isVerified ? (
            <BadgeCheck aria-hidden="true" size={15} />
          ) : citation.verificationStatus === "template" ? (
            <FileWarning aria-hidden="true" size={15} />
          ) : (
            <CircleAlert aria-hidden="true" size={15} />
          )}
          {verificationLabel(citation.verificationStatus)}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-500">Source publisher</dt>
          <dd className="mt-1 font-bold text-ink">
            {citation.sourcePublisher}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Rule year</dt>
          <dd className="mt-1 font-bold text-ink">{citation.ruleYear}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Effective date</dt>
          <dd className="mt-1 font-bold text-ink">
            {citation.effectiveDate ?? "Not loaded"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">
            Passage or table row
          </dt>
          <dd className="mt-1 break-words font-bold text-ink">
            {citation.passageOrTableRowIdentifier}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-slate-500">Geography</dt>
          <dd className="mt-1 font-bold leading-6 text-ink">
            {citation.geography.city}, {citation.geography.state} ·{" "}
            {citation.geography.hudArea}
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg bg-canvas p-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-600">
          Source passage — untrusted text
        </p>
        <blockquote className="mt-2 border-l-2 border-brand pl-3 text-sm leading-6 text-slate-700">
          {citation.supportingExcerpt}
        </blockquote>
      </div>

      {safeSourceUrl ? (
        <a
          href={safeSourceUrl}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer" : undefined}
          className="link-focus mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand hover:text-brand-dark"
        >
          Open source for {citation.sourceTitle}
          {isExternal ? <ExternalLink aria-hidden="true" size={16} /> : null}
        </a>
      ) : (
        <p className="mt-4 text-sm font-semibold text-amber-900">
          Source link not loaded
        </p>
      )}
    </article>
  );
}
