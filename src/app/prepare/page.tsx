import type { Metadata } from "next";
import { ArrowLeft, FolderCheck } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { PrepareAccessGuard } from "@/components/PrepareAccessGuard";
import { PrepareWorkflow } from "@/components/PrepareWorkflow";

export const metadata: Metadata = {
  title: "Prepare",
  description:
    "Review a document checklist and prepare a downloadable application packet.",
};

export default function PreparePage() {
  return (
    <PrepareAccessGuard>
      <PageContainer
        eyebrow="Stage 3 of 3 · Prepare"
        introIcon={FolderCheck}
        title="Prepare your application packet"
        description="Review deterministic document-readiness results and preview the application-preparation packet you control."
      >
        <PrepareWorkflow />

        <div className="mt-8">
          <Link
            href="/understand"
            className="link-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 font-extrabold text-ink shadow-sm transition-[transform,border-color,background-color] duration-200 motion-safe:hover:-translate-y-0.5 hover:border-brand/30 hover:bg-brand-soft/40 motion-safe:active:translate-y-0"
          >
            <ArrowLeft aria-hidden="true" size={19} />
            Back to Understand
          </Link>
        </div>
      </PageContainer>
    </PrepareAccessGuard>
  );
}
