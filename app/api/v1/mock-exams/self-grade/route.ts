import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "MANUAL_MARKING_DISABLED",
      message:
        "Written mock exams are marked by Study Buddy AI. Report an individual marking decision if you believe it is wrong.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
