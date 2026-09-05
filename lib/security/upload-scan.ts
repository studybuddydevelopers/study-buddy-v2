import { createConnection } from "node:net";
import { spawn } from "node:child_process";

const DEFAULT_CLAMAV_PORT = 3310;
const DEFAULT_CLAMAV_TIMEOUT_MS = 20_000;
const CLAMAV_CHUNK_BYTES = 64 * 1024;
const MAX_CLAMAV_REPLY_BYTES = 16 * 1024;
const DEFAULT_PDF_CDR_TIMEOUT_MS = 20_000;
const DEFAULT_PDF_CDR_MAX_OUTPUT_BYTES = 30 * 1024 * 1024;
const MAX_PDF_CDR_STDERR_BYTES = 32 * 1024;
const MAX_DOCX_DOCUMENT_XML_BYTES = 8 * 1024 * 1024;
const MAX_DOCX_ENTRIES = 2_000;

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
  | "MALWARE_SCANNER_UNAVAILABLE"
  | "CONTENT_DISARM_FAILED"
  | "CONTENT_DISARM_UNAVAILABLE";

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
      code === "MALWARE_SCANNER_UNAVAILABLE" ||
      code === "CONTENT_DISARM_UNAVAILABLE"
        ? 503
        : code === "MALWARE_DETECTED" || code === "CONTENT_DISARM_FAILED"
          ? 422
          : 400;
  }
}

/** Validate, scan, reconstruct PDFs, then scan the bytes that will be stored. */
export async function validateAndScanUpload(
  file: UploadFileLike,
  expectedType: ExpectedUploadType = "auto"
) {
  let buffer = Buffer.from(await file.arrayBuffer());
  validateUploadSignature(
    { name: file.name, mimeType: file.type, buffer },
    expectedType
  );
  await scanBufferWithClamAv(buffer);

  if (detectFileType(buffer) === "pdf") {
    const reconstructed = await reconstructPdf(buffer);
    if (reconstructed !== buffer) {
      buffer = reconstructed;
      validateUploadSignature(
        { name: file.name, mimeType: "application/pdf", buffer },
        "pdf"
      );
      assertPdfHasNoActiveContent(buffer);
      await scanBufferWithClamAv(buffer);
    }
  }

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
    validateDocxContainer(input.buffer);
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

export async function reconstructPdf(buffer: Buffer) {
  const configured = process.env.PDF_CDR_REQUIRED?.trim().toLowerCase();
  const required =
    configured === "true" ||
    (configured !== "false" && process.env.NODE_ENV === "production");
  const configuredCommand = process.env.PDF_CDR_COMMAND?.trim();

  if (!required && !configuredCommand) return buffer;

  const command = configuredCommand || "gs";
  const timeoutMs = boundedInteger(
    process.env.PDF_CDR_TIMEOUT_MS,
    DEFAULT_PDF_CDR_TIMEOUT_MS,
    1_000,
    120_000
  );
  const maxOutputBytes = boundedInteger(
    process.env.PDF_CDR_MAX_OUTPUT_BYTES,
    DEFAULT_PDF_CDR_MAX_OUTPUT_BYTES,
    1_024,
    100 * 1024 * 1024
  );

  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(
      command,
      [
        "-q",
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-dCompatibilityLevel=1.7",
        "-sDEVICE=pdfwrite",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-sOutputFile=-",
        "-",
      ],
      {
        shell: false,
        stdio: "pipe",
        env: {
          PATH: process.env.PATH,
          NODE_ENV: process.env.NODE_ENV,
          LANG: "C",
          LC_ALL: "C",
          TMPDIR: process.env.TMPDIR,
        },
      }
    );
    const output: Buffer[] = [];
    let outputBytes = 0;
    let stderrBytes = 0;
    let settled = false;

    const finishWithError = (error: UploadSecurityError) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      child.kill("SIGKILL");
      reject(error);
    };

    const deadline = setTimeout(() => {
      finishWithError(
        new UploadSecurityError(
          "CONTENT_DISARM_FAILED",
          "The PDF reconstruction timed out."
        )
      );
    }, timeoutMs);
    deadline.unref?.();

    child.once("error", (error: NodeJS.ErrnoException) => {
      finishWithError(
        new UploadSecurityError(
          "CONTENT_DISARM_UNAVAILABLE",
          error.code === "ENOENT"
            ? "The PDF reconstruction service is not installed."
            : "The PDF reconstruction service is unavailable."
        )
      );
    });
    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > maxOutputBytes) {
        finishWithError(
          new UploadSecurityError(
            "CONTENT_DISARM_FAILED",
            "The reconstructed PDF exceeded the safe output limit."
          )
        );
        return;
      }
      output.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > MAX_PDF_CDR_STDERR_BYTES) {
        finishWithError(
          new UploadSecurityError(
            "CONTENT_DISARM_FAILED",
            "The PDF reconstruction service returned excessive diagnostics."
          )
        );
      }
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (code !== 0 || outputBytes === 0) {
        reject(
          new UploadSecurityError(
            "CONTENT_DISARM_FAILED",
            "The PDF could not be safely reconstructed."
          )
        );
        return;
      }
      resolve(Buffer.concat(output, outputBytes));
    });
    child.stdin.once("error", () => {
      // The close/error handlers produce the normalized failure response.
    });
    child.stdin.end(buffer);
  });
}

export function assertPdfHasNoActiveContent(buffer: Buffer) {
  const normalizedNames = buffer
    .toString("latin1")
    .replace(/#([0-9a-f]{2})/gi, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
  const activeNames =
    /\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|RichMedia|XFA)\b/i;
  if (activeNames.test(normalizedNames)) {
    throw new UploadSecurityError(
      "CONTENT_DISARM_FAILED",
      "The reconstructed PDF still contains active content."
    );
  }
}

export function validateDocxContainer(buffer: Buffer) {
  let offset = 0;
  let entries = 0;
  let foundDocumentXml = false;

  while (offset + 30 <= buffer.byteLength && entries < MAX_DOCX_ENTRIES) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1;
      continue;
    }

    entries += 1;
    const flags = buffer.readUInt16LE(offset + 6);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const dataStart = nameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;

    if (
      flags & 0x1 ||
      flags & 0x8 ||
      nameEnd > buffer.byteLength ||
      dataEnd > buffer.byteLength
    ) {
      throw invalidSignature("The DOCX container uses an unsupported ZIP layout.");
    }

    const name = buffer.subarray(nameStart, nameEnd).toString("utf8");
    if (name === "word/document.xml") {
      foundDocumentXml = true;
      if (
        uncompressedSize === 0 ||
        uncompressedSize > MAX_DOCX_DOCUMENT_XML_BYTES
      ) {
        throw invalidSignature("The DOCX document content exceeds the safe limit.");
      }
    }

    offset = dataEnd;
  }

  if (!foundDocumentXml || entries >= MAX_DOCX_ENTRIES) {
    throw invalidSignature("The uploaded ZIP is not a supported DOCX document.");
  }
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
