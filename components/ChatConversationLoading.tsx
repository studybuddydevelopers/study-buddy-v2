"use client";

import { useId } from "react";
import type { CSSProperties } from "react";

// A fixed shuffled order keeps the splashes playful without changing on hydration.
const SPOTS = [
  [240, 110], [110, 40], [395, 120], [310, 40], [50, 120],
  [210, 40], [335, 120], [145, 120], [370, 40], [450, 120],
  [165, 40], [285, 120], [270, 40], [95, 120], [190, 120],
] as const;

export default function ChatConversationLoading() {
  const id = useId().replaceAll(":", "");
  const lettering = `chat-loading-letters-${id}`;
  const splash = `chat-loading-splash-${id}`;
  const mask = `chat-loading-mask-${id}`;

  return (
    <div role="status" aria-label="Loading conversations" className="flex min-h-52 items-center justify-center py-8 sm:min-h-64">
      <svg aria-hidden="true" viewBox="0 0 480 180" className="chat-conversation-loading w-full max-w-lg overflow-visible">
        <defs>
          <g id={lettering} textAnchor="middle" fontFamily="ui-rounded, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif" fontWeight="900" strokeLinejoin="round">
            <text x="240" y="67" fontSize="62">Loading</text>
            <text x="240" y="139" fontSize="52" textLength="430" lengthAdjust="spacingAndGlyphs">conversations</text>
          </g>
          <g id={splash}>
            <circle r="66" />
            <circle cx="54" cy="-32" r="19" />
            <circle cx="-53" cy="-24" r="15" />
            <circle cx="48" cy="42" r="18" />
            <circle cx="-34" cy="56" r="14" />
            <circle cx="-59" cy="28" r="11" />
            <circle cx="30" cy="-59" r="12" />
          </g>
          <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="480" height="180" style={{ maskType: "luminance" }}>
            <rect width="480" height="180" fill="black" />
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
        <use href={`#${lettering}`} transform="translate(0 4)" fill="#E6D7EE" stroke="#E6D7EE" strokeWidth="5" />
        <use href={`#${lettering}`} fill="#F7F0FB" stroke="#6C3483" strokeWidth="2.5" />
        <use href={`#${lettering}`} fill="#6C3483" mask={`url(#${mask})`} />
      </svg>
    </div>
  );
}
