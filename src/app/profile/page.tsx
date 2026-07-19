import type { Metadata } from "next";
import { Files } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { ProfileWorkflow } from "@/components/ProfileWorkflow";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Upload synthetic documents and confirm readiness profile details.",
};

export default function ProfilePage() {
  return (
    <PageContainer
      eyebrow="Stage 1 of 3 · Profile"
      introIcon={Files}
      title="Build your readiness profile"
      description="Upload fictional samples, inspect every extracted value and its source evidence, make corrections, and explicitly confirm what should be retained."
    >
      <ProfileWorkflow />
    </PageContainer>
  );
}
