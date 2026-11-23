"use client";

import { useId } from "react";
import type { CSSProperties } from "react";

// A fixed shuffled order keeps the splashes playful without changing on hydration.
const SPOTS = [
  [425, 380], [235, 60], [600, 540], [425, 60], [235, 700],
  [600, 220], [425, 700], [235, 380], [600, 60], [600, 700],
  [235, 220], [425, 540], [425, 220], [235, 540], [600, 380],
] as const;

export default function ChatConversationLoading() {
  const id = useId().replaceAll(":", "");
  const mark = `chat-loading-mark-${id}`;
  const splash = `chat-loading-splash-${id}`;
  const mask = `chat-loading-mask-${id}`;

  return (
    <div role="status" aria-label="Loading conversations" className="flex min-h-52 flex-col items-center justify-center gap-3 py-8 sm:min-h-64">
      <svg aria-hidden="true" viewBox="0 0 745 745" className="chat-conversation-loading h-32 w-32 sm:h-36 sm:w-36">
        <defs>
          <image id={mark} href="/images/study-buddy-mark.svg" width="745" height="745" />
          <g id={splash} transform="scale(2)">
            <circle r="66" />
            <circle cx="54" cy="-32" r="19" />
            <circle cx="-53" cy="-24" r="15" />
            <circle cx="48" cy="42" r="18" />
            <circle cx="-34" cy="56" r="14" />
            <circle cx="-59" cy="28" r="11" />
            <circle cx="30" cy="-59" r="12" />
          </g>
          <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="745" height="745" style={{ maskType: "luminance" }}>
            <rect width="745" height="745" fill="black" />
            {SPOTS.map(([x, y], index) => (
              <g key={`in-${index}`} transform={`translate(${x} ${y}) rotate(${index * 37})`}>
                <use href={`#${splash}`} fill="white" className="chat-splash-in" style={{ "--splash-delay": `${index * 55}ms` } as CSSProperties} />
              </g>
            ))}
            {SPOTS.map(([x, y], index) => (
              <g key={`out-${index}`} transform={`translate(${x} ${y}) rotate(${index * -29})`}>
                <use href={`#${splash}`} fill="black" className="chat-splash-out" style={{ "--splash-delay": `${((index * 7) % SPOTS.length) * 55}ms` } as CSSProperties} />
              </g>
            ))}
          </mask>
        </defs>
        <use href={`#${mark}`} opacity="0.14" />
        <use href={`#${mark}`} mask={`url(#${mask})`} />
      </svg>
      <p aria-hidden="true" className="text-sm text-gray-500">Loading screen…</p>
    </div>
  );
}
