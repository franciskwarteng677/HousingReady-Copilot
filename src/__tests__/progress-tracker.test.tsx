import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import { ProgressTracker } from "@/components/ProgressTracker";
import { saveProfileSession } from "@/lib/session";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(() => "/understand"),
}));

vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
}));

describe("application progress tracker", () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue("/understand");
  });

  it("shows Profile completed, Understand current, and Prepare locked", async () => {
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
});
