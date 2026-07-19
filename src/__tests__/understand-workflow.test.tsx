import {
  act,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import { UnderstandWorkflow } from "@/components/UnderstandWorkflow";
import { frozen2026MtspCorpus } from "@/data/rules";
import { applyConfirmedProfileCorrection } from "@/lib/profile-corrections";
import {
  PROFILE_UPDATED_EVENT,
  saveProfileSession,
} from "@/lib/session";
import { loadUnderstandSession } from "@/lib/understand-session";

const { pushMock, replaceMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

async function waitForReadyWorkflow() {
  return screen.findByRole("heading", {
    name: "Confirmed household information",
  });
}

async function confirmHouseholdSize(
  user: ReturnType<typeof userEvent.setup>,
  size: `${number}`,
) {
  const householdSelect = screen.getByRole("combobox", {
    name: "Renter-confirmed household size",
  });
  await user.selectOptions(householdSelect, size);
  await user.click(
    screen.getByRole("button", { name: "Confirm household size" }),
  );
  await waitFor(() => {
    expect(loadUnderstandSession(window.sessionStorage)?.householdSize).toMatchObject({
      value: Number(size),
    });
  });
}

async function acknowledgeComparison(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    await screen.findByRole("button", {
      name: "I reviewed the comparison and official source",
    }),
  );
  await waitFor(() => {
    expect(loadUnderstandSession(window.sessionStorage)?.understandComplete).toBe(
      true,
    );
  });
}

describe("Understand Profile access and loading", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to Profile when the temporary Profile is incomplete", async () => {
    saveProfileSession(
      window.sessionStorage,
      makeCompleteIncomeProfile({ profileComplete: false }),
    );

    render(<UnderstandWorkflow />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/profile");
    });
    expect(
      screen.getByRole("heading", { name: "Completed Profile required" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "A completed confirmed Profile is required. Returning to Profile.",
    );
    expect(
      screen.queryByRole("button", { name: "Continue to Prepare" }),
    ).toBeNull();
  });

  it("loads and displays only the confirmed Profile values", async () => {
    saveProfileSession(window.sessionStorage, makeCompleteIncomeProfile());
    render(<UnderstandWorkflow />);

    const profileHeading = await waitForReadyWorkflow();
    const profilePanel = profileHeading.closest("section");
    if (!profilePanel) {
      throw new Error("Expected the confirmed Profile section.");
    }

    expect(replaceMock).not.toHaveBeenCalled();
    expect(within(profilePanel).getByText("Maria Johnson")).toBeVisible();
    expect(within(profilePanel).getByText("$1,620.00")).toBeVisible();
    expect(within(profilePanel).getByText("Biweekly")).toBeVisible();
    expect(within(profilePanel).getByText("$650.00")).toBeVisible();
    expect(
      within(profilePanel).getAllByText("synthetic-pay-stub.pdf, page 1"),
    ).not.toHaveLength(0);
    expect(screen.getByText("$49,920.00")).toBeVisible();
  });
});

describe("Understand acknowledgement, completion, and freshness", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires acknowledgement, stores review provenance, completes Understand, and unlocks Prepare", async () => {
    const user = userEvent.setup();
    const profile = makeCompleteIncomeProfile({ grossPay: "$1,700.00" });
    saveProfileSession(window.sessionStorage, profile);
    render(<UnderstandWorkflow />);
    await waitForReadyWorkflow();

    expect(loadUnderstandSession(window.sessionStorage)?.householdSize).toBeNull();
    await confirmHouseholdSize(user, "2");

    const continueButton = screen.getByRole("button", {
      name: "Continue to Prepare",
    });
    expect(continueButton).toBeDisabled();
    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      reviewAcknowledgement: null,
      understandComplete: false,
    });

    expect(screen.getAllByText("$52,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$82,320.00").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "The confirmed annualised amount is $30,320.00 below the displayed 60% MTSP reference threshold.",
      ),
    ).toBeVisible();

    await acknowledgeComparison(user);

    const stored = loadUnderstandSession(window.sessionStorage);
    expect(stored).toMatchObject({
      profileRevision: profile.revision,
      ruleReviewState: "complete",
      understandComplete: true,
      reviewAcknowledgement: {
        acknowledgedAt: expect.any(String),
        profileRevision: profile.revision,
        householdSize: 2,
        thresholdSourceId: frozen2026MtspCorpus.corpusId,
        thresholdSourceVersion: frozen2026MtspCorpus.sourceVersion,
      },
    });
    expect(stored?.reviewAcknowledgement?.calculationInputFingerprint).toBe(
      stored?.calculation?.inputFingerprint,
    );
    expect(continueButton).toBeEnabled();
    expect(continueButton).toHaveFocus();
    expect(screen.getByText("Understand requirements are complete. You can continue to Prepare.")).toBeVisible();

    await user.click(continueButton);
    expect(pushMock).toHaveBeenCalledWith("/prepare");
  });

  it("clears acknowledgement and relocks Prepare when household size changes", async () => {
    const user = userEvent.setup();
    saveProfileSession(window.sessionStorage, makeCompleteIncomeProfile());
    render(<UnderstandWorkflow />);
    await waitForReadyWorkflow();
    await confirmHouseholdSize(user, "2");
    await acknowledgeComparison(user);

    const householdSelect = screen.getByRole("combobox", {
      name: "Renter-confirmed household size",
    });
    await user.selectOptions(householdSelect, "3");

    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      householdSize: null,
      ruleReviewState: "pending-review",
      reviewAcknowledgement: null,
      reviewInvalidationReason: "household-size-changed",
      understandComplete: false,
    });
    expect(
      screen.getByRole("button", { name: "Continue to Prepare" }),
    ).toBeDisabled();
    expect(screen.getByText("Confirmation required")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Confirm household size" }),
    );
    await waitFor(() => {
      expect(loadUnderstandSession(window.sessionStorage)?.householdSize).toMatchObject({
        value: 3,
      });
    });
    expect(screen.getAllByText("$92,580.00").length).toBeGreaterThan(0);
    expect(loadUnderstandSession(window.sessionStorage)?.understandComplete).toBe(
      false,
    );

    await acknowledgeComparison(user);
    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      reviewAcknowledgement: { householdSize: 3 },
      reviewInvalidationReason: null,
      understandComplete: true,
    });
  });

  it("recalculates and requires review again after a confirmed Profile correction", async () => {
    const user = userEvent.setup();
    const originalProfile = makeCompleteIncomeProfile();
    saveProfileSession(window.sessionStorage, originalProfile);
    render(<UnderstandWorkflow />);
    await waitForReadyWorkflow();
    await confirmHouseholdSize(user, "2");
    await acknowledgeComparison(user);

    const correction = applyConfirmedProfileCorrection(
      originalProfile,
      "employment.grossPay.currentPeriod",
      "$1,700.00",
      "2026-07-18T15:00:00.000Z",
    );
    if (!correction.ok) {
      throw new Error(correction.error);
    }
    saveProfileSession(window.sessionStorage, correction.session);
    act(() => {
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    });

    await waitFor(() => {
      expect(screen.getAllByText("$52,000.00").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("$1,700.00 × 26")).toBeVisible();
    expect(screen.getByText("$44,200.00")).toBeVisible();
    expect(screen.getByText("$650.00 × 12")).toBeVisible();
    expect(screen.getByText("$7,800.00")).toBeVisible();
    expect(screen.queryByText("$49,920.00")).toBeNull();
    expect(
      screen.getAllByText(
        /Annualised income calculation updated because confirmed gross pay changed from \$1,620\.00 to \$1,700\.00\./,
      ).length,
    ).toBeGreaterThan(0);
    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      profileRevision: 2,
      profileStale: false,
      reviewAcknowledgement: null,
      reviewInvalidationReason: "profile-changed",
      calculation: { combined: { resultCents: 5_200_000 } },
      understandComplete: false,
    });
    expect(
      screen.getByRole("button", { name: "Continue to Prepare" }),
    ).toBeDisabled();
  });

  it("allows an above-threshold comparison to be reviewed and completed", async () => {
    const user = userEvent.setup();
    saveProfileSession(
      window.sessionStorage,
      makeCompleteIncomeProfile({ grossPay: "$3,000.00" }),
    );
    render(<UnderstandWorkflow />);
    await waitForReadyWorkflow();
    await confirmHouseholdSize(user, "2");

    expect(screen.getAllByText("$85,800.00").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "The confirmed annualised amount is $3,480.00 above the displayed 60% MTSP reference threshold.",
      ),
    ).toBeVisible();

    await acknowledgeComparison(user);
    expect(
      screen.getByRole("button", { name: "Continue to Prepare" }),
    ).toBeEnabled();
    expect(loadUnderstandSession(window.sessionStorage)?.understandComplete).toBe(
      true,
    );
    const neutralComparison = screen.getByText(
      "The confirmed annualised amount is $3,480.00 above the displayed 60% MTSP reference threshold.",
    );
    expect(neutralComparison.textContent).not.toMatch(
      /\b(?:eligible|qualified|approved|passed|accepted)\b/i,
    );
  });

  it("removes an old calculation when corrected Profile data lacks a required input", async () => {
    saveProfileSession(window.sessionStorage, makeCompleteIncomeProfile());
    render(<UnderstandWorkflow />);
    await waitForReadyWorkflow();
    expect(screen.getByText("$49,920.00")).toBeVisible();

    saveProfileSession(
      window.sessionStorage,
      makeCompleteIncomeProfile({
        omitFields: ["monthlyBenefit"],
        updatedAt: "2026-07-18T15:30:00.000Z",
      }),
    );
    act(() => {
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    });

    await waitFor(() => {
      expect(screen.getByText("Calculation unavailable")).toBeVisible();
    });
    expect(screen.queryByText("$49,920.00")).toBeNull();
    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      calculation: null,
      reviewAcknowledgement: null,
      understandComplete: false,
    });
    expect(
      screen.getByRole("button", { name: "Continue to Prepare" }),
    ).toBeDisabled();
  });
});
