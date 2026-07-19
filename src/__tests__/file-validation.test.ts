import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  validateDocumentFile,
  validateDocumentFiles,
} from "@/lib/file-validation";
import { makeTestFile } from "@/__tests__/fixtures";

describe("document file validation", () => {
  it("rejects an unsupported file type with an accessible message", async () => {
    const file = makeTestFile({
      name: "notes.txt",
      type: "text/plain",
      bytes: new TextEncoder().encode("synthetic notes"),
    });

    const result = await validateDocumentFile(file);

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        fileName: "notes.txt",
        code: "unsupported-type",
        message: "notes.txt is not a supported PDF, JPG, or PNG file.",
      }),
    });
  });

  it("rejects a file larger than the 10 MB per-file limit", async () => {
    const file = makeTestFile({
      name: "too-large.pdf",
      size: MAX_FILE_SIZE_BYTES + 1,
    });

    const result = await validateDocumentFile(file);

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        fileName: "too-large.pdf",
        code: "oversized",
        message: "too-large.pdf is larger than the 10 MB per-file limit.",
      }),
    });
  });

  it("keeps accepted and rejected files separate in a multi-file selection", async () => {
    const validPdf = makeTestFile({ name: "sample.pdf" });
    const unsupported = makeTestFile({
      name: "malware.exe",
      type: "application/x-msdownload",
      bytes: new Uint8Array([0x4d, 0x5a]),
    });

    const result = await validateDocumentFiles([validPdf, unsupported]);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({
      file: validPdf,
      mimeType: "application/pdf",
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.code).toBe("unsupported-type");
  });
});
