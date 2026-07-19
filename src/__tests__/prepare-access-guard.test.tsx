import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCompleteIncomeProfile } from "@/__tests__/fixtures";
import { PrepareAccessGuard } from "@/components/PrepareAccessGuard";
import { saveProfileSession } from "@/lib/session";

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

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

  it("returns to Understand when Profile is complete but rule review is blocked", async () => {
    saveProfileSession(window.sessionStorage, makeCompleteIncomeProfile());

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
});
