import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import { PrepareAccessGuard } from "@/components/PrepareAccessGuard";
import { applyConfirmedProfileCorrection } from "@/lib/profile-corrections";
import { saveProfileSession } from "@/lib/session";
import {
  acknowledgeUnderstandReview,
  confirmHouseholdSize,
  createUnderstandSession,
  saveUnderstandSession,
} from "@/lib/understand-session";
import { buildIncomeCalculation } from "@/lib/understand-state";
import type { ProfileSession } from "@/lib/profile-schema";

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const CREATED_AT = "2026-07-18T14:00:00.000Z";

function savePendingUnderstand(profile: ProfileSession) {
  const result = buildIncomeCalculation(profile, CREATED_AT);
  if (result.outcome !== "calculated") {
    throw new Error("Expected the complete Profile fixture to calculate.");
  }

  saveProfileSession(window.sessionStorage, profile);
  const pending = createUnderstandSession({
    profile,
    householdSize: confirmHouseholdSize(2, CREATED_AT),
    calculation: result.calculation,
    ruleReviewState: "pending-review",
    updatedAt: CREATED_AT,
  });
  saveUnderstandSession(window.sessionStorage, pending);
  return pending;
}

function saveCompletedUnderstand(profile: ProfileSession) {
  const pending = savePendingUnderstand(profile);
  const completed = acknowledgeUnderstandReview(
    profile,
    pending,
    "2026-07-18T14:05:00.000Z",
  );
  saveUnderstandSession(window.sessionStorage, completed);
  return completed;
}

describe("Prepare stage access guard", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it("returns to Profile when no completed Profile exists", async () => {
    render(
      <PrepareAccessGuard>
        <p>Prepare placeholder content</p>
      </PrepareAccessGuard>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/profile");
    });
    expect(screen.getByRole("heading", { name: "Prepare is locked" })).toBeVisible();
    expect(screen.queryByText("Prepare placeholder content")).toBeNull();
  });

  it("returns to Understand before the comparison is acknowledged", async () => {
    savePendingUnderstand(makeCompleteIncomeProfile());

    render(
      <PrepareAccessGuard>
        <p>Prepare placeholder content</p>
      </PrepareAccessGuard>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/understand");
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Complete the verified Understand review before opening Prepare.",
    );
    expect(screen.queryByText("Prepare placeholder content")).toBeNull();
  });

  it("permits direct Prepare navigation after Understand acknowledgement", async () => {
    const completed = saveCompletedUnderstand(makeCompleteIncomeProfile());
    expect(completed.understandComplete).toBe(true);

    render(
      <PrepareAccessGuard>
        <p>Prepare placeholder content</p>
      </PrepareAccessGuard>,
    );

    expect(await screen.findByText("Prepare placeholder content")).toBeVisible();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "Prepare is locked" }),
    ).toBeNull();
  });

  it("relocks Prepare when a confirmed Profile correction makes Understand stale", async () => {
    const originalProfile = makeCompleteIncomeProfile();
    saveCompletedUnderstand(originalProfile);
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

    render(
      <PrepareAccessGuard>
        <p>Prepare placeholder content</p>
      </PrepareAccessGuard>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/understand");
    });
    expect(screen.queryByText("Prepare placeholder content")).toBeNull();
  });
});
