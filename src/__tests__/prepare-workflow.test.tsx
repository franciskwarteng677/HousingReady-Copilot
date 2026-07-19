import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import PreparePage from "@/app/prepare/page";
import {
  createPrepareSession,
  getPrepareReviewProgress,
  loadCurrentPrepareSession,
  PREPARE_SESSION_KEY,
  savePrepareSession,
  setMissingOrExpiredReview,
  setPrepareDocumentReview,
} from "@/lib/prepare-session";
import { saveProfileSession } from "@/lib/session";
import {
  acknowledgeUnderstandReview,
  confirmHouseholdSize,
  createUnderstandSession,
  saveUnderstandSession,
} from "@/lib/understand-session";
import { buildIncomeCalculation } from "@/lib/understand-state";
import type { ProfileSession } from "@/lib/profile-schema";

const { generateReadinessPacketPdfMock, replaceMock } = vi.hoisted(() => ({
  generateReadinessPacketPdfMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/packet-pdf", () => ({
  generateReadinessPacketPdf: generateReadinessPacketPdfMock,
}));

const CALCULATED_AT = "2026-07-18T14:00:00.000Z";
const REVIEWED_AT = "2026-07-18T14:05:00.000Z";
const PREPARE_CREATED_AT = "2026-07-18T14:10:00.000Z";
const GENERATED_PACKET_FILENAME =
  "housingready-readiness-packet-revision-1.pdf";

const reviewControlNames = [
  "Review Identity document",
  "Review Income documentation",
  "Review Residency documentation",
  "I reviewed missing or expired items",
] as const;

function persistPendingUnderstand(profile: ProfileSession) {
  const result = buildIncomeCalculation(profile, CALCULATED_AT);
  if (result.outcome !== "calculated") {
    throw new Error("Expected the complete Profile fixture to calculate.");
  }

  saveProfileSession(window.sessionStorage, profile);
  const pending = createUnderstandSession({
    profile,
    householdSize: confirmHouseholdSize(2, CALCULATED_AT),
    calculation: result.calculation,
    ruleReviewState: "pending-review",
    updatedAt: CALCULATED_AT,
  });
  saveUnderstandSession(window.sessionStorage, pending);

  return { calculation: result.calculation, pending };
}

function persistCompletedWorkflow() {
  const profile = makeCompleteIncomeProfile({ grossPay: "$1,700.00" });
  const { calculation, pending } = persistPendingUnderstand(profile);
  const completed = acknowledgeUnderstandReview(
    profile,
    pending,
    REVIEWED_AT,
  );
  saveUnderstandSession(window.sessionStorage, completed);

  return { calculation, completed, profile };
}

function completePrepareReviews(
  profile: ProfileSession,
  understand: ReturnType<typeof acknowledgeUnderstandReview>,
) {
  let prepare = createPrepareSession(
    profile,
    understand,
    PREPARE_CREATED_AT,
  );
  prepare = setPrepareDocumentReview(
    prepare,
    "identity-document",
    true,
    "2026-07-18T14:11:00.000Z",
  );
  prepare = setPrepareDocumentReview(
    prepare,
    "income-documentation",
    true,
    "2026-07-18T14:12:00.000Z",
  );
  prepare = setPrepareDocumentReview(
    prepare,
    "residency-documentation",
    true,
    "2026-07-18T14:13:00.000Z",
  );
  return setMissingOrExpiredReview(
    prepare,
    true,
    "2026-07-18T14:14:00.000Z",
  );
}

function getReviewControls() {
  return reviewControlNames.map((name) =>
    screen.getByRole("checkbox", { name }),
  );
}

async function selectEveryPrepareReview(
  user: ReturnType<typeof userEvent.setup>,
) {
  await waitFor(() => {
    getReviewControls().forEach((control) => expect(control).toBeEnabled());
  });

  for (const control of getReviewControls()) {
    await user.click(control);
  }
}

async function expectPreparePanelsToInitialize() {
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Prepare your application packet",
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { level: 2, name: "Document checklist" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", {
      level: 2,
      name: "Missing or expired items",
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { level: 2, name: "Packet preview" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { level: 2, name: "Download packet" }),
  ).toBeVisible();
}

async function expectPrepareReviewsToBeAvailableAndPending() {
  await waitFor(() => {
    getReviewControls().forEach((control) => {
      expect(control).toBeEnabled();
      expect(control).not.toBeChecked();
    });
  });
}

describe("Prepare packet workflow", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    generateReadinessPacketPdfMock.mockReset();
  });

  it("keeps the packet locked at zero of four reviews", async () => {
    const { calculation, completed, profile } = persistCompletedWorkflow();

    expect(profile.profileComplete).toBe(true);
    expect(completed.householdSize?.value).toBe(2);
    expect(calculation.combined.resultCents).toBe(5_200_000);
    expect(completed.understandComplete).toBe(true);

    render(<PreparePage />);

    await expectPreparePanelsToInitialize();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/Complete the Profile stage before/i),
    ).not.toBeInTheDocument();

    await expectPrepareReviewsToBeAvailableAndPending();

    expect(
      await screen.findByText("0 of 4 Prepare reviews completed"),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Complete all Prepare reviews to build the packet preview.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Download readiness packet PDF",
      }),
    ).toBeDisabled();
    expect(generateReadinessPacketPdfMock).not.toHaveBeenCalled();
  });

  it("updates the visible four-review counter after each explicit review", async () => {
    const user = userEvent.setup();
    persistCompletedWorkflow();
    render(<PreparePage />);

    await expectPreparePanelsToInitialize();
    expect(
      await screen.findByText("0 of 4 Prepare reviews completed"),
    ).toBeVisible();

    for (const [index, control] of getReviewControls().entries()) {
      await user.click(control);
      expect(
        await screen.findByText(
          `${index + 1} of 4 Prepare reviews completed`,
        ),
      ).toBeVisible();
    }
  });

  it("unlocks the complete packet preview and download after all four reviews", async () => {
    const user = userEvent.setup();
    persistCompletedWorkflow();
    render(<PreparePage />);

    await expectPreparePanelsToInitialize();
    await selectEveryPrepareReview(user);

    expect(screen.getByText("4 of 4 Prepare reviews completed")).toBeVisible();
    expect(
      screen.queryByText(
        "Complete all Prepare reviews to build the packet preview.",
      ),
    ).not.toBeInTheDocument();

    const expectedPreviewSectionHeadings = [
      "Cover",
      "Confirmed renter information",
      "Confirmed income-related information",
      "Transparent annualised calculation",
      "Verified HUD reference comparison",
      "Document-readiness checklist",
      "Confirmed source-document metadata",
      "Source and decision boundaries",
    ];
    const packetPreview = screen.getByRole("region", {
      name: "Packet preview",
    });
    expect(within(packetPreview).getByText("Application Readiness Packet")).toBeVisible();
    expectedPreviewSectionHeadings.forEach((name) => {
      expect(within(packetPreview).getByRole("heading", { name })).toBeVisible();
    });

    expect(
      within(packetPreview).getAllByText(
        "Application-preparation information only — not an eligibility determination.",
      ).length,
    ).toBeGreaterThan(0);
    expect(packetPreview).toHaveTextContent("$1,700.00");
    expect(packetPreview).toHaveTextContent("$52,000.00");
    expect(
      screen.getByRole("button", {
        name: "Download readiness packet PDF",
      }),
    ).toBeEnabled();
    expect(generateReadinessPacketPdfMock).not.toHaveBeenCalled();
  });

  it("restores valid Prepare reviews after a remount for the same workflow revision", async () => {
    const user = userEvent.setup();
    const { completed, profile } = persistCompletedWorkflow();
    const firstRender = render(<PreparePage />);

    await expectPreparePanelsToInitialize();
    await selectEveryPrepareReview(user);
    getReviewControls().forEach((control) => expect(control).toBeChecked());

    const storedReview = loadCurrentPrepareSession(
      window.sessionStorage,
      profile,
      completed,
    );
    expect(storedReview).not.toBeNull();
    expect(
      getPrepareReviewProgress(profile, completed, storedReview),
    ).toMatchObject({
      completedReviewCount: 4,
      packetReady: true,
    });
    firstRender.unmount();

    render(<PreparePage />);

    await expectPreparePanelsToInitialize();
    expect(
      await screen.findByText("4 of 4 Prepare reviews completed"),
    ).toBeVisible();
    getReviewControls().forEach((control) => expect(control).toBeChecked());
    expect(
      screen.getByRole("button", {
        name: "Download readiness packet PDF",
      }),
    ).toBeEnabled();
    expect(generateReadinessPacketPdfMock).not.toHaveBeenCalled();
  });

  it("rejects stale persisted reviews instead of carrying them into the current revision", async () => {
    const { completed, profile } = persistCompletedWorkflow();
    const completedPrepare = completePrepareReviews(profile, completed);

    savePrepareSession(window.sessionStorage, {
      ...completedPrepare,
      binding: {
        ...completedPrepare.binding,
        profileRevision: completedPrepare.binding.profileRevision + 1,
      },
    });

    render(<PreparePage />);

    await expectPreparePanelsToInitialize();
    await expectPrepareReviewsToBeAvailableAndPending();
    expect(
      await screen.findByText("0 of 4 Prepare reviews completed"),
    ).toBeVisible();

    const replacementSession = loadCurrentPrepareSession(
      window.sessionStorage,
      profile,
      completed,
    );
    expect(replacementSession?.binding.profileRevision).toBe(profile.revision);
    expect(
      getPrepareReviewProgress(profile, completed, replacementSession),
    ).toMatchObject({
      completedReviewCount: 0,
      packetReady: false,
    });
  });

  it("generates and downloads only after an explicit renter click", async () => {
    const user = userEvent.setup();
    const createObjectUrlMock = vi.fn(() => "blob:housingready-packet");
    const revokeObjectUrlMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    generateReadinessPacketPdfMock.mockResolvedValue({
      blob: new Blob(["synthetic packet"], { type: "application/pdf" }),
      filename: GENERATED_PACKET_FILENAME,
      pageCount: 2,
    });
    persistCompletedWorkflow();
    render(<PreparePage />);

    await expectPreparePanelsToInitialize();
    await selectEveryPrepareReview(user);

    const downloadButton = screen.getByRole("button", {
      name: "Download readiness packet PDF",
    });
    expect(downloadButton).toBeEnabled();
    expect(generateReadinessPacketPdfMock).not.toHaveBeenCalled();

    await user.click(downloadButton);

    await waitFor(() => {
      expect(generateReadinessPacketPdfMock).toHaveBeenCalledTimes(1);
    });
    const packetArgument = generateReadinessPacketPdfMock.mock.calls[0]?.[0];
    expect(packetArgument).toMatchObject({
      filename: GENERATED_PACKET_FILENAME,
      cover: {
        profileRevision: 1,
        disclaimer:
          "Application-preparation information only — not an eligibility determination.",
      },
      incomeInformation: {
        grossPay: { amountCents: 170_000 },
      },
      annualisedCalculation: {
        combined: { resultCents: 5_200_000 },
      },
    });
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(revokeObjectUrlMock).toHaveBeenCalledWith(
        "blob:housingready-packet",
      );
    });
    expect(
      screen.getAllByText("Readiness packet PDF generated and downloaded.")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("status")
        .some(
          (status) =>
            status.textContent ===
            "Readiness packet PDF generated and downloaded.",
        ),
    ).toBe(true);
    expect(window.sessionStorage.getItem(PREPARE_SESSION_KEY)).not.toContain(
      "blob:housingready-packet",
    );
  });

  it("announces a generation failure, moves focus to it, and allows retry", async () => {
    const user = userEvent.setup();
    generateReadinessPacketPdfMock.mockRejectedValue(
      new Error("Synthetic PDF renderer failure"),
    );
    persistCompletedWorkflow();
    render(<PreparePage />);

    await expectPreparePanelsToInitialize();
    await selectEveryPrepareReview(user);

    const downloadButton = screen.getByRole("button", {
      name: "Download readiness packet PDF",
    });
    await user.click(downloadButton);

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/could not be generated/i);
    await waitFor(() => expect(error).toHaveFocus());
    expect(downloadButton).toBeEnabled();
  });

  it("redirects an incomplete Profile to Profile without exposing Prepare controls", async () => {
    saveProfileSession(
      window.sessionStorage,
      makeCompleteIncomeProfile({ profileComplete: false }),
    );

    render(<PreparePage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/profile");
    });
    expect(screen.getByRole("heading", { name: "Prepare is locked" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Document checklist" }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: /Download/i }),
    ).not.toBeInTheDocument();
  });

  it("redirects an incomplete Understand review without exposing Prepare controls", async () => {
    persistPendingUnderstand(
      makeCompleteIncomeProfile({ grossPay: "$1,700.00" }),
    );

    render(<PreparePage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/understand");
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Complete the verified Understand review before opening Prepare.",
    );
    expect(
      screen.queryByRole("heading", { name: "Document checklist" }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: /Download/i }),
    ).not.toBeInTheDocument();
  });
});
