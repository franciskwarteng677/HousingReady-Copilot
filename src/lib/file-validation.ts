import type { SupportedDocumentMimeType } from "@/lib/profile-schema";
import type {
  FileValidationError,
  FileValidationErrorCode,
} from "@/types/profile";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const extensionMimeTypes: Record<string, SupportedDocumentMimeType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export type ValidatedFile = {
  file: File;
  mimeType: SupportedDocumentMimeType;
};

export type FileValidationResult =
  | { ok: true; value: ValidatedFile }
  | { ok: false; error: FileValidationError };

function makeError(
  file: File,
  code: FileValidationErrorCode,
  message: string,
): FileValidationResult {
  return {
    ok: false,
    error: {
      id:
        file.name +
        ":" +
        file.size +
        ":" +
        file.lastModified +
        ":" +
        code,
      fileName: file.name,
      code,
      message,
    },
  };
}

function hasBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function detectMimeType(bytes: Uint8Array): SupportedDocumentMimeType | null {
  if (hasBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }

  if (hasBytes(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (
    hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }

  return null;
}

function getExtension(fileName: string): string {
  return fileName.includes(".")
    ? (fileName.split(".").pop() ?? "").toLowerCase()
    : "";
}

export async function validateDocumentFile(
  file: File,
): Promise<FileValidationResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return makeError(
      file,
      "oversized",
      file.name + " is larger than the 10 MB per-file limit.",
    );
  }

  const normalizedDeclaredType =
    file.type === "image/jpg" ? "image/jpeg" : file.type;
  const declaredTypeIsSupported =
    normalizedDeclaredType === "" ||
    normalizedDeclaredType === "application/pdf" ||
    normalizedDeclaredType === "image/jpeg" ||
    normalizedDeclaredType === "image/png";

  if (!declaredTypeIsSupported) {
    return makeError(
      file,
      "unsupported-type",
      file.name + " is not a supported PDF, JPG, or PNG file.",
    );
  }

  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const detectedType = detectMimeType(header);
  const extensionType = extensionMimeTypes[getExtension(file.name)];

  if (!detectedType || !extensionType) {
    return makeError(
      file,
      "unsupported-type",
      file.name + " is not a supported PDF, JPG, or PNG file.",
    );
  }

  if (
    detectedType !== extensionType ||
    (normalizedDeclaredType !== "" && normalizedDeclaredType !== detectedType)
  ) {
    return makeError(
      file,
      "invalid-signature",
      file.name +
        " does not match its declared file type and was not added.",
    );
  }

  return {
    ok: true,
    value: {
      file,
      mimeType: detectedType,
    },
  };
}

export async function validateDocumentFiles(files: readonly File[]): Promise<{
  accepted: ValidatedFile[];
  errors: FileValidationError[];
}> {
  const results = await Promise.all(files.map(validateDocumentFile));

  return {
    accepted: results.flatMap((result) =>
      result.ok ? [result.value] : [],
    ),
    errors: results.flatMap((result) =>
      result.ok ? [] : [result.error],
    ),
  };
}

export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return sizeInBytes + " B";
  }

  if (sizeInBytes < 1024 * 1024) {
    return (sizeInBytes / 1024).toFixed(1) + " KB";
  }

  return (sizeInBytes / (1024 * 1024)).toFixed(2) + " MB";
}

export function formatMimeType(
  mimeType: SupportedDocumentMimeType,
): string {
  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType === "image/png") {
    return "PNG image";
  }

  return "JPG image";
}
