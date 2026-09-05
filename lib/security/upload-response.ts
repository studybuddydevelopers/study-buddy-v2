import { NextResponse } from "next/server";
import { UploadSecurityError } from "./upload-scan";
import { logSecurityEvent } from "./audit-log";

export function uploadSecurityErrorResponse(error: unknown) {
  if (!(error instanceof UploadSecurityError)) return null;

  logSecurityEvent(
    uploadSecurityEvent(error.code),
    error.code === "MALWARE_SCANNER_UNAVAILABLE" ? "error" : "warn",
    { errorCode: error.code }
  );

  return NextResponse.json(
    { error: error.code, message: error.message },
    {
      status: error.status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function uploadSecurityEvent(code: UploadSecurityError["code"]) {
  if (code === "MALWARE_DETECTED") return "malware_detected";
  if (code === "MALWARE_SCANNER_UNAVAILABLE") {
    return "malware_scanner_unavailable";
  }
  return "invalid_file_signature";
}
