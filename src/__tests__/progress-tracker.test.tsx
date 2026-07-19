import { act, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import { ProgressTracker } from "@/components/ProgressTracker";
import { applyConfirmedProfileCorrection } from "@/lib/profile-corrections";
import {
  PROFILE_UPDATED_EVENT,
  saveProfileSession,
} from "@/lib/session";
import {
  acknowledgeUnderstandReview,
  confirmHouseholdSize,
  createUnderstandSession,
  saveUnderstandSession,
} from "@/lib/understand-session";
import { buildIncomeCalculation } from "@/lib/understand-state";
import type { ProfileSession } from "@/lib/profile-schema";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(() => "/understand"),
}));

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
}));

const CREATED_AT = "2026-07-18T14:00:00.000Z";

function saveCompletedUnderstand(profile: ProfileSession) {
  const calculation = buildIncomeCalculation(profile, CREATED_AT);
  if (calculation.outcome !== "calculated") {
    throw new Error("Expected the complete Profile fixture to calculate.");
  }

  saveProfileSession(window.sessionStorage, profile);
  const pending = createUnderstandSession({
    profile,
    householdSize: confirmHouseholdSize(2, CREATED_AT),
    calculation: calculation.calculation,
    ruleReviewState: "pending-review",
    updatedAt: CREATED_AT,
  });
  const complete = acknowledgeUnderstandReview(
    profile,
    pending,
    "2026-07-18T14:05:00.000Z",
  );
  saveUnderstandSession(window.sessionStorage, complete);
}

describe("application progress tracker", () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue("/understand");
  });

  it("shows Profile completed, Understand current, and Prepare locked before acknowledgement", async () => {
    saveProfileSession(window.sessionStorage, makeCompleteIncomeProfile());
    render(<ProgressTracker />);

    const profileLink = await screen.findByRole("link", {
      name: "Step 1: Profile",
    });
    await waitFor(() => {
      expect(within(profileLink).getByText("Completed")).toBeVisible();
    });

    expect(
      screen.getByRole("link", {
        name: "Step 2: Understand, current step",
      }),
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByLabelText(
        "Step 3: Prepare, complete Understand first",
      ),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.queryByRole("link", { name: /Step 3: Prepare/ }),
    ).toBeNull();
  });

  it("does not let a direct Prepare path override the lock", async () => {
    pathnameMock.mockReturnValue("/prepare");
    render(<ProgressTracker />);

    expect(
      await screen.findByLabelText(
        "Step 3: Prepare, complete Understand first",
      ),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.queryByRole("link", { name: /Step 3: Prepare/ }),
    ).toBeNull();
  });

  it("marks Understand complete and unlocks Prepare after acknowledgement", async () => {
    pathnameMock.mockReturnValue("/prepare");
    saveCompletedUnderstand(makeCompleteIncomeProfile());
    render(<ProgressTracker />);

    const prepareLink = await screen.findByRole("link", {
      name: "Step 3: Prepare, current step",
    });
    expect(prepareLink).toHaveAttribute("href", "/prepare");
    expect(prepareLink).toHaveAttribute("aria-current", "step");

    const understandLink = screen.getByRole("link", {
      name: "Step 2: Understand",
    });
    await waitFor(() => {
      expect(within(understandLink).getByText("Completed")).toBeVisible();
    });
  });

  it("shows Understand as both completed and current before navigating onward", async () => {
    saveCompletedUnderstand(makeCompleteIncomeProfile());
    render(<ProgressTracker />);

    const understandLink = await screen.findByRole("link", {
      name: "Step 2: Understand, completed, current step",
    });
    expect(understandLink).toHaveAttribute("aria-current", "step");
    expect(
      within(understandLink).getByText("Completed · current step"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Step 3: Prepare" }),
    ).toHaveAttribute("href", "/prepare");
  });

  it("relocks Prepare after a completed review becomes stale", async () => {
    pathnameMock.mockReturnValue("/prepare");
    const originalProfile = makeCompleteIncomeProfile();
    saveCompletedUnderstand(originalProfile);
    render(<ProgressTracker />);

    expect(
      await screen.findByRole("link", {
        name: "Step 3: Prepare, current step",
      }),
    ).toBeVisible();

    const correction = applyConfirmedProfileCorrection(
      originalProfile,
      "employment.grossPay.currentPeriod",
      "$1,700.00",
      "2026-07-18T15:00:00.000Z",
    );
    if (!correction.ok) {
      throw new Error(correction.error);
    }

    act(() => {
      saveProfileSession(window.sessionStorage, correction.session);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    });

    expect(
      await screen.findByLabelText(
        "Step 3: Prepare, complete Understand first",
      ),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.queryByRole("link", { name: /Step 3: Prepare/ }),
    ).toBeNull();
  });
});
