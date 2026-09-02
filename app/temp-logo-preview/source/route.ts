import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SVG_PATH = join(
  process.cwd(),
  "public",
  "images",
  "study-buddy-students.svg"
);

export const runtime = "nodejs";

export async function GET() {
  try {
    const svg = await readFile(SVG_PATH, "utf8");

    return new Response(svg, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "Content-Type": "image/svg+xml; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(
      "The temporary SVG could not be found in the Downloads folder.",
      {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }
}
