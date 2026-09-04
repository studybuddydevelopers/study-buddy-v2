import { readFile } from "node:fs/promises";

const STUDY_PLAN_SOURCE =
  "/Users/efeon/Downloads/clock-with-calendar-illustration-of-study-schedule-vector.svg";

const SKIN_SUBPATHS = [46, 60, 75, 76, 77, 78, 79];
const PENCIL_SUBPATHS = [8, 9, 10, 11, 12, 13, 14];

function findPath(svg: string, fill: string) {
  return svg.match(
    new RegExp(`<path d="([^"]+)" fill="${fill}"[^>]*\\/>`),
  );
}

function selectSubpaths(svg: string, fill: string, indexes: number[]) {
  const match = findPath(svg, fill);

  if (!match) return "";

  const subpaths = match[1].split(/(?=M)/).filter(Boolean);
  return indexes.map((index) => subpaths[index]).filter(Boolean).join("");
}

function removeCaption(svg: string) {
  const withoutCaptionPaths = ["#070405", "#FCFCFC"].reduce(
    (currentSvg, fill) => {
      const path = findPath(currentSvg, fill);

      if (!path) return currentSvg;

      const artworkOnly = path[1]
        .split(/(?=M)/)
        .filter(Boolean)
        .filter((subpath) => {
          const firstMove = subpath.match(/^M-?[\d.]+\s+(-?[\d.]+)/);
          return !firstMove || Number(firstMove[1]) < 800;
        })
        .join("");

      return currentSvg.replace(path[1], artworkOnly);
    },
    svg,
  );

  return withoutCaptionPaths.replace(
    'viewBox="0 0 980 980"',
    'viewBox="90 20 820 820"',
  );
}

export async function GET() {
  try {
    const source = await readFile(STUDY_PLAN_SOURCE, "utf8");
    let svg = source
      .replaceAll("#080807", "#070405")
      .replaceAll("#1b1e36", "#3B2A56")
      .replaceAll("#1f82f9", "#6C3483")
      .replaceAll("#3bdc6b", "#9B6AAF")
      .replaceAll("#bedded", "#E9E6ED")
      .replaceAll("#f16071", "#895033")
      .replaceAll("#f6ce46", "#D8C9DF")
      .replaceAll("#fefffe", "#FCFCFC");

    svg = removeCaption(svg);

    const pencil = selectSubpaths(svg, "#895033", PENCIL_SUBPATHS);
    const skin = selectSubpaths(svg, "#FCFCFC", SKIN_SUBPATHS);
    const blackPath = findPath(svg, "#070405")?.[0] ?? "";
    const customDetails = `
      <g aria-label="Study Buddy learner illustration">
        <path d="${pencil}" fill="#F6CE46" fill-rule="evenodd" stroke="#F6CE46" stroke-linejoin="round" stroke-width="0.25"/>
        <path d="${skin}" fill="#895033" fill-rule="evenodd" stroke="#895033" stroke-linejoin="round" stroke-width="0.25"/>
        ${blackPath}
        <text x="245" y="505" fill="#FCFCFC" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="900" letter-spacing="-2" text-anchor="middle">SB</text>
      </g>`;

    svg = svg.replace("</svg>", `${customDetails}</svg>`);
    const body = new TextEncoder().encode(svg);

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Length": String(body.byteLength),
        "Content-Type": "image/svg+xml",
      },
    });
  } catch {
    return new Response("The downloaded study-plan SVG could not be found.", {
      status: 404,
    });
  }
}
