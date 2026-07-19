import type { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";
import { UnderstandWorkflow } from "@/components/UnderstandWorkflow";

export const metadata: Metadata = {
  title: "Understand",
  description:
    "Review confirmed Profile inputs, deterministic calculations, and the frozen Cambridge 2026 MTSP rule corpus.",
};

export default function UnderstandPage() {
  return (
    <PageContainer
      eyebrow="Stage 2 of 3 · Understand"
      title="Understand the information and the rules"
      description="Review confirmed inputs, transparent arithmetic, corpus-grounded explanations, and source status. This workspace prepares and explains; it never makes a housing decision."
    >
      <UnderstandWorkflow />
    </PageContainer>
  );
}
