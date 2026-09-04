import { readFile } from "node:fs/promises";

const ILLUSTRATION_SOURCES: Record<string, string> = {
  "expert-guidance": "/Users/efeon/Downloads/vectorised-7ee14105.svg",
  "practice-tests": "/Users/efeon/Downloads/vectorised-78d33136.svg",
  "study-plan": "/Users/efeon/Downloads/vectorised-1a5fc589.svg",
};

function addViewBox(svg: string) {
  if (/<svg\b[^>]*\bviewBox=/i.test(svg)) return svg;

  return svg.replace(/<svg\b([^>]*)>/i, (root, attributes: string) => {
    const width = attributes.match(/\bwidth="([\d.]+)"/i)?.[1];
    const height = attributes.match(/\bheight="([\d.]+)"/i)?.[1];

    if (!width || !height) return root;

    return `<svg${attributes} viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">`;
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const { asset } = await params;
  const sourcePath = ILLUSTRATION_SOURCES[asset];

  if (!sourcePath) {
    return new Response("Unknown icon-audit illustration.", { status: 404 });
  }

  try {
    const svg = addViewBox(
      await readFile(/* turbopackIgnore: true */ sourcePath, "utf8"),
    );
    const body = new TextEncoder().encode(svg);

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Length": String(body.byteLength),
        "Content-Type": "image/svg+xml",
      },
    });
  } catch {
    return new Response("The downloaded illustration could not be found.", {
      status: 404,
    });
  }
}
