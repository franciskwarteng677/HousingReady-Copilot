import type { ProgressStep } from "@/types/navigation";

export const progressSteps: readonly ProgressStep[] = [
  { id: "profile", label: "Profile", href: "/profile" },
  { id: "understand", label: "Understand", href: "/understand" },
  { id: "prepare", label: "Prepare", href: "/prepare" },
] as const;
