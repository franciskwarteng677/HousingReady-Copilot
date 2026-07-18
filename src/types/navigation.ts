export type ProgressStepId = "profile" | "understand" | "prepare";

export type ProgressStep = {
  id: ProgressStepId;
  label: string;
  href: `/${ProgressStepId}`;
};
