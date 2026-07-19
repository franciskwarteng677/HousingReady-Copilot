import { ShieldAlert } from "lucide-react";

type SourceEvidenceProps = {
  sourceText: string;
};

export function SourceEvidence({ sourceText }: SourceEvidenceProps) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">
        <ShieldAlert aria-hidden="true" size={15} className="text-amber-700" />
        Untrusted document text
      </p>
      <blockquote className="mt-2 border-l-2 border-brand pl-3 text-sm leading-6 text-slate-700">
        {sourceText}
      </blockquote>
    </div>
  );
}
