import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import {
  PROFILE_SESSION_KEY,
  SESSION_DELETED_EVENT,
} from "@/lib/session";
import { UNDERSTAND_SESSION_KEY } from "@/lib/understand-session";

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

describe("Delete Session", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    window.sessionStorage.clear();
  });

  it("confirms, clears only HousingReady keys, dispatches reset, and returns home", () => {
    window.sessionStorage.setItem(PROFILE_SESSION_KEY, "profile");
    window.sessionStorage.setItem(UNDERSTAND_SESSION_KEY, "understand");
    window.sessionStorage.setItem("housingready:preview:v1", "temporary");
    window.sessionStorage.setItem("housingready-copilot-session", "legacy");
    window.sessionStorage.setItem("another-app:keep", "preserved");
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deletedEvent = vi.fn();
    window.addEventListener(SESSION_DELETED_EVENT, deletedEvent, {
      once: true,
    });

    render(<DeleteSessionButton />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Session" }));

    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining("Delete this temporary HousingReady session?"),
    );
    expect(window.sessionStorage.getItem(PROFILE_SESSION_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(UNDERSTAND_SESSION_KEY)).toBeNull();
    expect(window.sessionStorage.getItem("housingready:preview:v1")).toBeNull();
    expect(
      window.sessionStorage.getItem("housingready-copilot-session"),
    ).toBeNull();
    expect(window.sessionStorage.getItem("another-app:keep")).toBe("preserved");
    expect(deletedEvent).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Temporary session deleted.",
    );
  });

  it("does nothing when deletion is cancelled", () => {
    window.sessionStorage.setItem(PROFILE_SESSION_KEY, "profile");
    window.sessionStorage.setItem(UNDERSTAND_SESSION_KEY, "understand");
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const deletedEvent = vi.fn();
    window.addEventListener(SESSION_DELETED_EVENT, deletedEvent, {
      once: true,
    });

    render(<DeleteSessionButton />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Session" }));

    expect(window.sessionStorage.getItem(PROFILE_SESSION_KEY)).toBe("profile");
    expect(window.sessionStorage.getItem(UNDERSTAND_SESSION_KEY)).toBe(
      "understand",
    );
    expect(deletedEvent).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Temporary session deleted.")).toBeNull();
  });
});
