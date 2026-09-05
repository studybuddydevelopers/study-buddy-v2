import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const netMock = vi.hoisted(() => ({ createConnection: vi.fn() }));

vi.mock("node:net", () => ({
  createConnection: netMock.createConnection,
}));

import {
  assertPdfHasNoActiveContent,
  parseClamAvReply,
  scanBufferWithClamAv,
  validateDocxContainer,
  validateUploadSignature,
} from "./upload-scan";

describe("upload security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    netMock.createConnection.mockReset();
  });

  it("accepts a PDF with matching header and EOF marker", () => {
    expect(() =>
      validateUploadSignature(
        file("guide.pdf", "application/pdf", "%PDF-1.7\nbody\n%%EOF\n"),
        "pdf"
      )
    ).not.toThrow();
  });

  it("rejects an executable renamed to PDF", () => {
    expect(() =>
      validateUploadSignature(
        file("guide.pdf", "application/pdf", "MZnot-a-pdf"),
        "pdf"
      )
    ).toThrowError(expect.objectContaining({ code: "INVALID_FILE_SIGNATURE" }));
  });

  it("accepts complete PNG and JPEG signatures", () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from("image-data"),
      Buffer.from([
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60,
        0x82,
      ]),
    ]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02, 0xff, 0xd9]);

    expect(() =>
      validateUploadSignature(
        { name: "figure.png", mimeType: "image/png", buffer: png },
        "image"
      )
    ).not.toThrow();
    expect(() =>
      validateUploadSignature(
        { name: "photo.jpg", mimeType: "image/jpeg", buffer: jpeg },
        "image"
      )
    ).not.toThrow();
  });

  it("rejects an image whose extension and bytes disagree", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]);

    expect(() =>
      validateUploadSignature(
        { name: "photo.png", mimeType: "image/png", buffer: jpeg },
        "image"
      )
    ).toThrowError(expect.objectContaining({ code: "INVALID_FILE_SIGNATURE" }));
  });

  it("rejects active content that survives PDF reconstruction", () => {
    expect(() =>
      assertPdfHasNoActiveContent(
        Buffer.from("%PDF-1.7\n1 0 obj << /OpenAction 2 0 R >>\n%%EOF")
      )
    ).toThrowError(expect.objectContaining({ code: "CONTENT_DISARM_FAILED" }));
  });

  it("requires a bounded DOCX document.xml ZIP entry", () => {
    expect(() => validateDocxContainer(docxEntry(1024))).not.toThrow();
    expect(() => validateDocxContainer(docxEntry(9 * 1024 * 1024))).toThrowError(
      expect.objectContaining({ code: "INVALID_FILE_SIGNATURE" })
    );
  });

  it("classifies clamd responses without exposing malware names", () => {
    expect(parseClamAvReply("stream: OK\0")).toBe("clean");
    expect(parseClamAvReply("stream: Eicar-Signature FOUND\0")).toBe(
      "infected"
    );
    expect(parseClamAvReply("INSTREAM size limit exceeded. ERROR\0")).toBe(
      "error"
    );
  });

  it("streams length-prefixed file bytes to clamd", async () => {
    vi.stubEnv("CLAMAV_HOST", "clamav.railway.internal");
    const socket = new FakeClamAvSocket("stream: OK\0");
    netMock.createConnection.mockReturnValue(socket);

    await scanBufferWithClamAv(Buffer.from("file-bytes"));

    expect(netMock.createConnection).toHaveBeenCalledWith({
      host: "clamav.railway.internal",
      port: 3310,
    });
    expect(socket.writes[0]?.toString()).toBe("zINSTREAM\0");
    expect(socket.writes[1]?.readUInt32BE(0)).toBe(10);
    expect(socket.writes[2]?.toString()).toBe("file-bytes");
    expect(socket.writes[3]).toEqual(Buffer.alloc(4));
  });

  it("rejects a file when clamd reports a malware signature", async () => {
    vi.stubEnv("CLAMAV_HOST", "clamav.railway.internal");
    netMock.createConnection.mockReturnValue(
      new FakeClamAvSocket("stream: Test-Signature FOUND\0")
    );

    await expect(scanBufferWithClamAv(Buffer.from("file"))).rejects.toEqual(
      expect.objectContaining({ code: "MALWARE_DETECTED", status: 422 })
    );
  });

  it("fails closed in production when clamd is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLAMAV_HOST", "");
    vi.stubEnv("MALWARE_SCAN_REQUIRED", "");

    await expect(scanBufferWithClamAv(Buffer.from("file"))).rejects.toEqual(
      expect.objectContaining({
        code: "MALWARE_SCANNER_UNAVAILABLE",
        status: 503,
      })
    );
  });

  it("allows local scans to be disabled explicitly", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLAMAV_HOST", "");
    vi.stubEnv("MALWARE_SCAN_REQUIRED", "false");

    await expect(scanBufferWithClamAv(Buffer.from("file"))).resolves.toBeUndefined();
  });
});

function file(name: string, mimeType: string, contents: string) {
  return { name, mimeType, buffer: Buffer.from(contents) };
}

function docxEntry(declaredUncompressedSize: number) {
  const name = Buffer.from("word/document.xml");
  const data = Buffer.from("x");
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt32LE(data.byteLength, 18);
  header.writeUInt32LE(declaredUncompressedSize, 22);
  header.writeUInt16LE(name.byteLength, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, name, data]);
}

class FakeClamAvSocket extends EventEmitter {
  readonly writes: Buffer[] = [];

  constructor(private readonly reply: string) {
    super();
    queueMicrotask(() => this.emit("connect"));
  }

  setTimeout() {
    return this;
  }

  write(value: Buffer) {
    const copy = Buffer.from(value);
    this.writes.push(copy);
    if (copy.byteLength === 4 && copy.readUInt32BE(0) === 0) {
      queueMicrotask(() => this.emit("data", Buffer.from(this.reply)));
    }
    return true;
  }

  destroy() {
    return this;
  }
}
