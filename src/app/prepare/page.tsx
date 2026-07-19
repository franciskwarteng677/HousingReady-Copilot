import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
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
        title="Prepare your application packet"
        description="Review document readiness, resolve missing or expired items, and preview the packet you control."
      >
        <PrepareWorkflow />

        <div className="mt-8">
          <Link
            href="/understand"
            className="link-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 font-bold text-ink hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft aria-hidden="true" size={19} />
            Back to Understand
          </Link>
        </div>
      </PageContainer>
    </PrepareAccessGuard>
  );
}
