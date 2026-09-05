import { createConnection } from "node:net";

const DEFAULT_CLAMAV_PORT = 3310;
const DEFAULT_CLAMAV_TIMEOUT_MS = 20_000;
const CLAMAV_CHUNK_BYTES = 64 * 1024;
const MAX_CLAMAV_REPLY_BYTES = 16 * 1024;

const PDF_HEADER = Buffer.from("%PDF-");
const PDF_EOF = Buffer.from("%%EOF");
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);
const ZIP_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export type ExpectedUploadType = "auto" | "pdf" | "image";
export type UploadSecurityErrorCode =
  | "INVALID_FILE_SIGNATURE"
  | "MALWARE_DETECTED"
  | "MALWARE_SCANNER_UNAVAILABLE";

interface UploadFileLike {
  name: string;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface FileSignatureInput {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export class UploadSecurityError extends Error {
  readonly code: UploadSecurityErrorCode;
  readonly status: number;

  constructor(code: UploadSecurityErrorCode, message: string) {
    super(message);
    this.name = "UploadSecurityError";
    this.code = code;
    this.status =
      code === "MALWARE_SCANNER_UNAVAILABLE"
        ? 503
        : code === "MALWARE_DETECTED"
          ? 422
          : 400;
  }
}

/** Validate the declared file type, inspect magic bytes, then scan the bytes. */
export async function validateAndScanUpload(
  file: UploadFileLike,
  expectedType: ExpectedUploadType = "auto"
) {
  const buffer = Buffer.from(await file.arrayBuffer());
  validateUploadSignature(
    { name: file.name, mimeType: file.type, buffer },
    expectedType
  );
  await scanBufferWithClamAv(buffer);
  return buffer;
}

export function validateUploadSignature(
  input: FileSignatureInput,
  expectedType: ExpectedUploadType = "auto"
) {
  const name = input.name.toLowerCase();
  const mimeType = input.mimeType.toLowerCase().trim();
  const detected = detectFileType(input.buffer);
  const expected =
    expectedType === "auto"
      ? expectedTypeFromMetadata(name, mimeType)
      : expectedType;

  if (expected === "pdf") {
    if (detected !== "pdf" || !hasPdfEof(input.buffer)) {
      throw invalidSignature("The uploaded file is not a valid PDF.");
    }
    if (mimeType && mimeType !== "application/pdf") {
      throw invalidSignature("The PDF content does not match its declared type.");
    }
    return;
  }

  if (expected === "image") {
    if (detected !== "png" && detected !== "jpeg") {
      throw invalidSignature("The uploaded file is not a valid PNG or JPEG image.");
    }
    if (!hasValidImageTrailer(input.buffer, detected)) {
      throw invalidSignature("The uploaded image is incomplete or malformed.");
    }

    const declared = normalizedImageType(mimeType);
    const extension = imageTypeFromName(name);
    if ((declared && declared !== detected) || (extension && extension !== detected)) {
      throw invalidSignature("The image content does not match its declared type.");
    }
    return;
  }

  // Resource uploads also support DOCX. Validate its ZIP container signature;
  // plain text and Markdown intentionally have no magic-byte signature.
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    if (detected !== "zip") {
      throw invalidSignature("The uploaded file is not a valid DOCX container.");
    }
  }
}

export async function scanBufferWithClamAv(buffer: Buffer) {
  const host = process.env.CLAMAV_HOST?.trim();
  const required = malwareScanIsRequired();

  if (!host) {
    if (required) {
      throw scannerUnavailable("The malware scanner is not configured.");
    }
    return;
  }

  const port = boundedInteger(
    process.env.CLAMAV_PORT,
    DEFAULT_CLAMAV_PORT,
    1,
    65_535
  );
  const timeoutMs = boundedInteger(
    process.env.CLAMAV_TIMEOUT_MS,
    DEFAULT_CLAMAV_TIMEOUT_MS,
    1_000,
    120_000
  );

  const reply = await sendClamAvInstream(buffer, host, port, timeoutMs);
  const result = parseClamAvReply(reply);
  if (result === "infected") {
    throw new UploadSecurityError(
      "MALWARE_DETECTED",
      "The uploaded file failed malware scanning."
    );
  }
  if (result !== "clean") {
    throw scannerUnavailable("The malware scanner could not verify the file.");
  }
}

export function parseClamAvReply(reply: string) {
  const normalized = reply.replace(/\0/g, "").trim();
  if (/\bFOUND$/i.test(normalized)) return "infected" as const;
  if (/\bOK$/i.test(normalized)) return "clean" as const;
  return "error" as const;
}

function sendClamAvInstream(
  buffer: Buffer,
  host: string,
  port: number,
  timeoutMs: number
) {
  return new Promise<string>((resolve, reject) => {
    const socket = createConnection({ host, port });
    const replyChunks: Buffer[] = [];
    let replyBytes = 0;
    let settled = false;

    const rejectUnavailable = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      socket.destroy();
      reject(scannerUnavailable(message));
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      socket.destroy();
      resolve(Buffer.concat(replyChunks).toString("utf8"));
    };

    const deadline = setTimeout(() => {
      rejectUnavailable("The malware scan timed out.");
    }, timeoutMs);
    deadline.unref?.();
    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => {
      rejectUnavailable("The malware scan timed out.");
    });
    socket.once("error", () => {
      rejectUnavailable("The malware scanner is unavailable.");
    });
    socket.on("data", (chunk: Buffer) => {
      replyBytes += chunk.byteLength;
      if (replyBytes > MAX_CLAMAV_REPLY_BYTES) {
        rejectUnavailable("The malware scanner returned an invalid response.");
        return;
      }
      replyChunks.push(chunk);
      if (chunk.includes(0)) finish();
    });
    socket.once("end", finish);
    socket.once("close", () => {
      if (settled) return;
      if (replyChunks.length > 0) finish();
      else rejectUnavailable("The malware scanner closed the connection.");
    });

    socket.once("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0"));
      for (
        let offset = 0;
        offset < buffer.byteLength;
        offset += CLAMAV_CHUNK_BYTES
      ) {
        const chunk = buffer.subarray(offset, offset + CLAMAV_CHUNK_BYTES);
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(chunk.byteLength, 0);
        socket.write(length);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
  });
}

function detectFileType(buffer: Buffer) {
  if (startsWith(buffer, PDF_HEADER)) return "pdf" as const;
  if (startsWith(buffer, PNG_HEADER)) return "png" as const;
  if (startsWith(buffer, JPEG_HEADER)) return "jpeg" as const;
  if (startsWith(buffer, ZIP_HEADER)) return "zip" as const;
  return "unknown" as const;
}

function expectedTypeFromMetadata(name: string, mimeType: string) {
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf" as const;
  }
  if (mimeType.startsWith("image/") || imageTypeFromName(name)) {
    return "image" as const;
  }
  return "other" as const;
}

function hasPdfEof(buffer: Buffer) {
  const finalWindowStart = Math.max(0, buffer.byteLength - 4_096);
  return buffer.indexOf(PDF_EOF, finalWindowStart) !== -1;
}

function hasValidImageTrailer(buffer: Buffer, detected: "png" | "jpeg") {
  if (detected === "png") {
    return (
      buffer.byteLength >= PNG_IEND.byteLength &&
      buffer.subarray(-PNG_IEND.byteLength).equals(PNG_IEND)
    );
  }

  return (
    buffer.byteLength >= JPEG_EOI.byteLength &&
    buffer.subarray(-JPEG_EOI.byteLength).equals(JPEG_EOI)
  );
}

function normalizedImageType(mimeType: string) {
  if (mimeType === "image/png") return "png" as const;
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return "jpeg" as const;
  }
  return null;
}

function imageTypeFromName(name: string) {
  if (name.endsWith(".png")) return "png" as const;
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "jpeg" as const;
  }
  return null;
}

function startsWith(buffer: Buffer, signature: Buffer) {
  return (
    buffer.byteLength >= signature.byteLength &&
    buffer.subarray(0, signature.byteLength).equals(signature)
  );
}

function malwareScanIsRequired() {
  const configured = process.env.MALWARE_SCAN_REQUIRED?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

function invalidSignature(message: string) {
  return new UploadSecurityError("INVALID_FILE_SIGNATURE", message);
}

function scannerUnavailable(message: string) {
  return new UploadSecurityError("MALWARE_SCANNER_UNAVAILABLE", message);
}

function boundedInteger(
  rawValue: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}
