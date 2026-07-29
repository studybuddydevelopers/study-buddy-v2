import { inflateRawSync } from "node:zlib";
import { ResourceExtractionQuality } from "@prisma/client";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionHeading {
  text: string;
  pageNumber?: number;
}

export interface ExtractionResult {
  text: string;
  pages: ExtractedPage[];
  headings: ExtractionHeading[];
  questionNumbers: string[];
  warnings: string[];
  quality: ResourceExtractionQuality;
}

interface ExtractInput {
  buffer: Buffer;
  mimeType?: string | null;
  fileName?: string | null;
}

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/markdown",
]);

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function extractDocument(input: ExtractInput): ExtractionResult {
  const mimeType = normalizeMime(input.mimeType, input.fileName);

  if (TEXT_MIME_TYPES.has(mimeType)) {
    return extractPlainText(input.buffer, mimeType);
  }

  if (mimeType === "application/pdf") {
    return extractPdfBestEffort(input.buffer);
  }

  if (mimeType === DOCX_MIME_TYPE) {
    return extractDocxBestEffort(input.buffer);
  }

  return failedExtraction(`Unsupported file type: ${mimeType || "unknown"}.`);
}

function normalizeMime(mimeType?: string | null, fileName?: string | null) {
  const explicit = mimeType?.trim().toLowerCase();
  if (explicit) return explicit;

  const lowerName = fileName?.toLowerCase() ?? "";
  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
    return "text/markdown";
  }
  if (lowerName.endsWith(".txt")) return "text/plain";
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".docx")) return DOCX_MIME_TYPE;

  return "";
}

function extractPlainText(buffer: Buffer, mimeType: string): ExtractionResult {
  const text = normalizeText(buffer.toString("utf8"));
  if (!text) return failedExtraction("The text file did not contain usable text.");

  const headings = findHeadings(text, mimeType === "text/markdown");
  return {
    text,
    pages: [{ pageNumber: 1, text }],
    headings,
    questionNumbers: findQuestionNumbers(text),
    warnings: [],
    quality: ResourceExtractionQuality.HIGH,
  };
}

function extractPdfBestEffort(buffer: Buffer): ExtractionResult {
  const raw = buffer.toString("latin1");
  const literalStrings = Array.from(raw.matchAll(/\(([^()]{3,})\)\s*Tj/g)).map(
    (match) => decodePdfLiteral(match[1] ?? "")
  );
  const arrayStrings = Array.from(raw.matchAll(/\[((?:\([^()]*\)\s*)+)\]\s*TJ/g))
    .flatMap((match) =>
      Array.from((match[1] ?? "").matchAll(/\(([^()]*)\)/g)).map((item) =>
        decodePdfLiteral(item[1] ?? "")
      )
    );
  const text = normalizeText([...literalStrings, ...arrayStrings].join(" "));
  const warnings = [
    "PDF extraction is best-effort and must be reviewed before approval.",
  ];

  if (!text) {
    return {
      text: "",
      pages: [],
      headings: [],
      questionNumbers: [],
      warnings: [
        ...warnings,
        "No usable text was extracted. Scanned PDFs need a future OCR workflow.",
      ],
      quality: ResourceExtractionQuality.FAILED,
    };
  }

  return {
    text,
    pages: [{ pageNumber: 1, text }],
    headings: findHeadings(text, false),
    questionNumbers: findQuestionNumbers(text),
    warnings,
    quality: ResourceExtractionQuality.LOW,
  };
}

function extractDocxBestEffort(buffer: Buffer): ExtractionResult {
  const xml = readZipEntry(buffer, "word/document.xml");
  const warnings = [
    "DOCX extraction is best-effort and must be reviewed before approval.",
  ];

  if (!xml) {
    return {
      text: "",
      pages: [],
      headings: [],
      questionNumbers: [],
      warnings: [...warnings, "Could not read word/document.xml from the DOCX."],
      quality: ResourceExtractionQuality.FAILED,
    };
  }

  const text = normalizeText(
    decodeXmlEntities(
      xml
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  );

  if (!text) return failedExtraction("The DOCX did not contain usable text.");

  return {
    text,
    pages: [{ pageNumber: 1, text }],
    headings: findHeadings(text, false),
    questionNumbers: findQuestionNumbers(text),
    warnings,
    quality: ResourceExtractionQuality.LOW,
  };
}

function readZipEntry(buffer: Buffer, entryName: string) {
  let offset = 0;
  const signature = 0x04034b50;

  while (offset + 30 < buffer.length) {
    const current = buffer.readUInt32LE(offset);
    if (current !== signature) {
      offset += 1;
      continue;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const name = buffer.subarray(nameStart, nameEnd).toString("utf8");
    const dataStart = nameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > buffer.length || compressedSize === 0) {
      offset = Math.max(offset + 1, dataStart);
      continue;
    }

    if (name === entryName) {
      const compressed = buffer.subarray(dataStart, dataEnd);
      if (compressionMethod === 0) return compressed.toString("utf8");
      if (compressionMethod === 8) {
        return inflateRawSync(compressed).toString("utf8");
      }
      return null;
    }

    offset = dataEnd;
  }

  return null;
}

function findHeadings(text: string, markdown: boolean): ExtractionHeading[] {
  const headings: ExtractionHeading[] = [];
  const lines = text.split(/\n+/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (markdown) {
      const markdownHeading = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (markdownHeading?.[1]) headings.push({ text: markdownHeading[1] });
      continue;
    }

    if (
      trimmed.length <= 90 &&
      /[A-Za-z]/.test(trimmed) &&
      (trimmed === trimmed.toUpperCase() || /^[0-9]+(\.[0-9]+)*\s+/.test(trimmed))
    ) {
      headings.push({ text: trimmed });
    }
  }

  return headings.slice(0, 100);
}

function findQuestionNumbers(text: string) {
  const found = Array.from(
    text.matchAll(/(?:^|\n)\s*(?:question\s*)?([0-9]{1,3})[.)]\s+/gi)
  ).map((match) => match[1]);

  return Array.from(new Set(found.filter(Boolean))).slice(0, 200);
}

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\([()\\])/g, "$1");
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function failedExtraction(message: string): ExtractionResult {
  return {
    text: "",
    pages: [],
    headings: [],
    questionNumbers: [],
    warnings: [message],
    quality: ResourceExtractionQuality.FAILED,
  };
}
