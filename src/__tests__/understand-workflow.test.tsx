import {
  act,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import { UnderstandWorkflow } from "@/components/UnderstandWorkflow";
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

describe("Understand Profile access and loading", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
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

describe("Understand human confirmation and freshness", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
  });

  it("saves household size only after the renter explicitly confirms it", async () => {
    const user = userEvent.setup();
    saveProfileSession(window.sessionStorage, makeCompleteIncomeProfile());
    render(<UnderstandWorkflow />);
    await waitForReadyWorkflow();

    expect(loadUnderstandSession(window.sessionStorage)?.householdSize).toBeNull();
    const householdSelect = screen.getByRole("combobox", {
      name: "Renter-confirmed household size",
    });
    await user.selectOptions(householdSelect, "2");

    expect(loadUnderstandSession(window.sessionStorage)?.householdSize).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Confirm household size" }),
    );

    await waitFor(() => {
      expect(loadUnderstandSession(window.sessionStorage)?.householdSize).toMatchObject(
        { value: 2 },
      );
    });
    expect(screen.getByText("Household size confirmed")).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmed" })).toBeDisabled();

    const continueButton = screen.getByRole("button", {
      name: "Continue to Prepare",
    });
    expect(continueButton).toBeDisabled();
    expect(screen.getByText("Prepare remains locked")).toBeVisible();
    expect(
      screen.getAllByText(/Official 2026 threshold data has not been loaded/),
    ).not.toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: "What rule year is being used?" }),
    );
    expect(
      screen.getByRole("heading", { name: "Plain-language explanation" }),
    ).toBeVisible();

    await user.selectOptions(householdSelect, "3");
    expect(loadUnderstandSession(window.sessionStorage)?.householdSize).toBeNull();
    expect(screen.getByText("Confirmation required")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Plain-language explanation" }),
    ).toBeNull();
  });

  it("updates the displayed calculation after corrected Profile data is saved", async () => {
    saveProfileSession(window.sessionStorage, makeCompleteIncomeProfile());
    render(<UnderstandWorkflow />);
    await waitForReadyWorkflow();
    expect(screen.getByText("$49,920.00")).toBeVisible();

    const correctedProfile = makeCompleteIncomeProfile({
      grossPay: "$1,700.00",
      updatedAt: "2026-07-18T15:00:00.000Z",
    });
    saveProfileSession(window.sessionStorage, correctedProfile);
    act(() => {
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    });

    await waitFor(() => {
      expect(screen.getByText("$52,000.00")).toBeVisible();
    });
    expect(screen.getByText("$1,700.00 × 26")).toBeVisible();
    expect(screen.getByText("$44,200.00")).toBeVisible();
    expect(screen.getByText("$650.00 × 12")).toBeVisible();
    expect(screen.getByText("$7,800.00")).toBeVisible();
    expect(screen.queryByText("$49,920.00")).toBeNull();
    expect(
      screen.getAllByText(
        "Annualised income calculation updated because confirmed gross pay changed from $1,620.00 to $1,700.00.",
      ).length,
    ).toBeGreaterThan(0);
    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      profileStale: false,
      calculation: {
        combined: { resultCents: 5_200_000 },
        evidence: {
          grossPay: { confirmedValue: "$1,700.00" },
        },
      },
      understandComplete: false,
    });
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
      understandComplete: false,
    });
    expect(
      screen.getByRole("button", { name: "Continue to Prepare" }),
    ).toBeDisabled();
  });
});
