import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseClamAvReply,
  scanBufferWithClamAv,
  validateUploadSignature,
} from "./upload-scan";

describe("upload security", () => {
  afterEach(() => vi.unstubAllEnvs());

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

  it("classifies clamd responses without exposing malware names", () => {
    expect(parseClamAvReply("stream: OK\0")).toBe("clean");
    expect(parseClamAvReply("stream: Eicar-Signature FOUND\0")).toBe(
      "infected"
    );
    expect(parseClamAvReply("INSTREAM size limit exceeded. ERROR\0")).toBe(
      "error"
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
