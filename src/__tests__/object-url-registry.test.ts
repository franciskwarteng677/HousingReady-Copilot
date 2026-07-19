import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectUrlRegistry } from "@/lib/object-url-registry";
import { makeTestFile } from "@/__tests__/fixtures";

const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

describe("temporary object URL registry", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi
        .fn()
        .mockReturnValueOnce("blob:first")
        .mockReturnValueOnce("blob:second")
        .mockReturnValueOnce("blob:replacement"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
  });

  it("revokes every active preview URL and clears the registry", () => {
    const registry = new ObjectUrlRegistry();
    const file = makeTestFile({ name: "preview.png", type: "image/png" });

    registry.create("first", file);
    registry.create("second", file);
    registry.create("first", file);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
    expect(registry.size).toBe(2);

    registry.revokeAll();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:second");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:replacement");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    expect(registry.size).toBe(0);
  });
});
