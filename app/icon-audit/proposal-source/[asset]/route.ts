import { readFile } from "node:fs/promises";

const ILLUSTRATION_SOURCES: Record<string, string> = {
  "expert-guidance": "/Users/efeon/Downloads/vectorised-7ee14105.svg",
  "practice-tests": "/Users/efeon/Downloads/vectorised-78d33136.svg",
  "study-plan": "/Users/efeon/Downloads/vectorised-1a5fc589.svg",
};

const STUDY_BUDDY_PURPLES: Record<string, string> = {
  "#170a3f": "#3B2A56",
  "#291470": "#3B2A56",
  "#301b6b": "#4F387D",
  "#3b1f92": "#4F387D",
  "#3b2573": "#4F387D",
  "#432692": "#4F387D",
  "#4b3a69": "#4F387D",
  "#502fb6": "#513D96",
  "#512cbf": "#513D96",
  "#543495": "#513D96",
  "#543bb4": "#513D96",
  "#723bd2": "#633894",
  "#7f47d7": "#683E99",
  "#9a65de": "#683E99",
  "#ccb2ec": "#9E92B0",
  "#d8cde6": "#9E92B0",
  "#e6d1f3": "#E9E6ED",
  "#ebe2f5": "#E9E6ED",
  "#efe0f9": "#E9E6ED",
};

function applyStudyBuddyPurplePalette(svg: string) {
  return svg.replace(/#[\da-f]{6}/gi, (colour) => (
    STUDY_BUDDY_PURPLES[colour.toLowerCase()] ?? colour
  ));
}

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
      applyStudyBuddyPurplePalette(
        await readFile(/* turbopackIgnore: true */ sourcePath, "utf8"),
      ),
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
