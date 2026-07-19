import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import { ProfileWorkflow } from "@/components/ProfileWorkflow";
import { UnderstandWorkflow } from "@/components/UnderstandWorkflow";
import {
  loadProfileSession,
  PROFILE_SESSION_KEY,
  saveProfileSession,
} from "@/lib/session";
import {
  createUnderstandSession,
  loadUnderstandSession,
  saveUnderstandSession,
} from "@/lib/understand-session";
import { buildIncomeCalculation } from "@/lib/understand-state";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
}));

const CALCULATED_AT = "2026-07-18T14:00:00.000Z";

describe("restored confirmed Profile editing", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("commits a revisioned integer-cent correction only after explicit confirmation and invalidates Understand", async () => {
    const user = userEvent.setup();
    const originalProfile = makeCompleteIncomeProfile();
    const calculationResult = buildIncomeCalculation(
      originalProfile,
      CALCULATED_AT,
    );
    if (calculationResult.outcome !== "calculated") {
      throw new Error("Expected the complete Profile fixture to calculate.");
    }

    saveProfileSession(window.sessionStorage, originalProfile);
    saveUnderstandSession(
      window.sessionStorage,
      createUnderstandSession({
        profile: originalProfile,
        householdSize: null,
        calculation: calculationResult.calculation,
        ruleReviewState: "blocked-missing-verified-data",
        updatedAt: CALCULATED_AT,
      }),
    );
    const originalSerializedProfile = window.sessionStorage.getItem(
      PROFILE_SESSION_KEY,
    );

    const profileView = render(<ProfileWorkflow />);

    expect(
      await screen.findByRole("button", { name: "Edit confirmed values" }),
    ).toBeVisible();
    expect(screen.getByText("Status: No documents selected")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Edit confirmed values" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Edit Gross pay" }),
    );

    const grossPayInput = screen.getByRole("textbox", {
      name: "New confirmed gross pay",
    });
    await user.clear(grossPayInput);
    await user.type(grossPayInput, "1700");
    await user.click(
      screen.getByRole("button", { name: "Save correction" }),
    );

    expect(
      screen.getByText("Correction awaiting explicit confirmation"),
    ).toBeVisible();
    expect(window.sessionStorage.getItem(PROFILE_SESSION_KEY)).toBe(
      originalSerializedProfile,
    );
    expect(loadProfileSession(window.sessionStorage)).toMatchObject({
      revision: 1,
      correctionHistory: [],
      confirmedFields: expect.arrayContaining([
        expect.objectContaining({
          fieldId: "grossPay",
          value: "$1,620.00",
          valueCents: 162_000,
        }),
      ]),
    });
    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      profileStale: false,
      calculation: {
        combined: { resultCents: 4_992_000 },
      },
    });

    await user.click(
      screen.getByRole("button", { name: "Confirm correction" }),
    );

    await waitFor(() => {
      expect(loadProfileSession(window.sessionStorage)).toMatchObject({
        revision: 2,
        confirmedFields: expect.arrayContaining([
          expect.objectContaining({
            fieldId: "grossPay",
            value: "$1,700.00",
            valueCents: 170_000,
            confirmationOrigin: "renter-corrected",
          }),
        ]),
        correctionHistory: [
          expect.objectContaining({
            revision: 2,
            changedFieldId: "grossPay",
            reviewGroupId: "employment.grossPay.currentPeriod",
            previousConfirmedValue: "$1,620.00",
            newConfirmedValue: "$1,700.00",
            previousValueCents: 162_000,
            newValueCents: 170_000,
          }),
        ],
      });
    });
    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      profileStale: true,
      calculation: null,
      understandComplete: false,
      previousCalculationInputs: {
        grossPayValue: "$1,620.00",
      },
    });
    expect(
      screen.getAllByText("Corrected and confirmed by renter"),
    ).not.toHaveLength(0);

    profileView.unmount();
    render(<UnderstandWorkflow />);

    expect(
      await screen.findByText("$52,000.00"),
    ).toBeVisible();
    expect(screen.getByText("$1,700.00 × 26")).toBeVisible();
    expect(screen.getByText("$44,200.00")).toBeVisible();
    expect(screen.getByText("$650.00 × 12")).toBeVisible();
    expect(screen.getByText("$7,800.00")).toBeVisible();
    expect(screen.queryByText("$49,920.00")).toBeNull();
    expect(
      screen.getAllByText(
        /Annualised income calculation updated because confirmed gross pay changed from \$1,620\.00 to \$1,700\.00\./,
      ),
    ).not.toHaveLength(0);
    expect(loadUnderstandSession(window.sessionStorage)).toMatchObject({
      profileStale: false,
      calculation: {
        employment: { resultCents: 4_420_000 },
        benefits: { resultCents: 780_000 },
        combined: { resultCents: 5_200_000 },
      },
    });
  });
});
