import type { SVGProps } from "react";

export type StudyBuddyIconName =
  | "dashboard"
  | "materials"
  | "exams"
  | "progress"
  | "chat"
  | "profile"
  | "settings"
  | "bell"
  | "chevron"
  | "plan"
  | "practice"
  | "mentors"
  | "shield"
  | "pastQuestions"
  | "flashcards"
  | "textbook"
  | "analytics"
  | "support"
  | "plus"
  | "pencil"
  | "trash"
  | "eye"
  | "eyeOff"
  | "unfold"
  | "help"
  | "checkbox"
  | "spinner"
  | "encouragement"
  | "arrow"
  | "success"
  | "learnerSuccess"
  | "messageSent"
  | "wifi"
  | "database"
  | "lock"
  | "userCheck"
  | "privacyRequest"
  | "mail"
  | "warning"
  | "card"
  | "scale"
  | "clock"
  | "document"
  | "send";

interface StudyBuddyIconProps
  extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: StudyBuddyIconName;
  size?: number;
  title?: string;
}

const INK = "#070405";
const PURPLE = "#6C3483";
const DEEP_PURPLE = "#3B2A56";
const LAVENDER = "#E9E6ED";
const WARM = "#895033";
const GOLD = "#F6CE46";
const PAPER = "#FCFCFC";

export default function StudyBuddyIcon({
  name,
  size = 64,
  title,
  ...props
}: StudyBuddyIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      <path
        d="M8.5 24.2C10.4 13.1 20 7.2 31.8 7.8c12.7.6 23.8 6.1 25.1 17.2 1.4 11.8-2.4 25.8-13.6 29.2-11 3.4-27.4 2-33.2-8.8-3.4-6.3-2.8-14.2-1.6-21.2Z"
        fill={LAVENDER}
      />
      <g
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {iconArtwork(name)}
      </g>
    </svg>
  );
}

function iconArtwork(name: StudyBuddyIconName) {
  switch (name) {
    case "dashboard":
      return (
        <>
          <path d="M15 31 32 16l17 15" fill={PURPLE} />
          <path d="M19 29v20h26V29L32 18Z" fill={PAPER} />
          <path d="M28 49V36h8v13" fill={WARM} />
          <path d="M43 19v7" />
        </>
      );
    case "materials":
      return (
        <>
          <path d="M11 18c8-3 15-.9 21 4v30c-6-4.8-13-6.1-21-3Z" fill={PAPER} />
          <path d="M53 18c-8-3-15-.9-21 4v30c6-4.8 13-6.1 21-3Z" fill={PURPLE} />
          <path d="M16 27c4.5-.6 8.2.2 11 2M16 34c4.5-.6 8.2.2 11 2" fill="none" />
          <path d="m44 22-5 2v11l2.5-2 2.5 2Z" fill={WARM} />
        </>
      );
    case "exams":
      return (
        <>
          <rect x="16" y="15" width="32" height="39" rx="4" fill={PAPER} />
          <path d="M25 14h14v7H25z" fill={PURPLE} />
          <path d="m23 31 3 3 6-7M35 31h7M23 43l3 3 6-7M35 43h7" fill="none" />
        </>
      );
    case "progress":
      return (
        <>
          <path d="M15 49h35" fill="none" />
          <path d="M19 47V35h7v12M30 47V27h7v20M41 47V18h7v29" fill={PURPLE} />
          <path d="m17 29 10-7 8 4 13-11" fill="none" />
          <path d="m43 15 5 .1-.8 4.9" fill="none" />
        </>
      );
    case "chat":
      return (
        <>
          <path d="M13 17h38v27H31L19 51v-7h-6Z" fill={PURPLE} />
          <circle cx="23" cy="31" r="2" fill={PAPER} stroke="none" />
          <circle cx="32" cy="31" r="2" fill={PAPER} stroke="none" />
          <circle cx="41" cy="31" r="2" fill={WARM} stroke="none" />
        </>
      );
    case "profile":
      return (
        <>
          <circle cx="32" cy="24" r="10" fill={WARM} />
          <path d="M23 21c1-8 17-10 19 1-5-1-9-3-12-6-2 3-4 4-7 5Z" fill={INK} />
          <path d="M15 51c1-11 8-17 17-17s16 6 17 17" fill={PURPLE} />
          <path d="M27 27c3 2 7 2 10 0" fill="none" />
        </>
      );
    case "settings":
      return (
        <>
          <path
            d="m27 11 10 1 2 7 7-2 6 9-5 5 4 6-7 9-7-3-4 8-10-2-1-7-7-1-2-11 6-3-2-7 8-6 5 4Z"
            fill={PURPLE}
          />
          <circle cx="32" cy="32" r="10" fill={PAPER} />
          <circle cx="32" cy="32" r="5" fill={WARM} />
          <path d="M32 23v4M32 37v4M23 32h4M37 32h4" fill="none" stroke={GOLD} strokeWidth="2.5" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M18 43h28l-4-6v-9c0-7-4-12-10-12s-10 5-10 12v9Z" fill={PURPLE} />
          <path d="M27 46c1 5 9 5 10 0" fill={WARM} />
          <path d="M32 12v4" fill="none" />
        </>
      );
    case "chevron":
      return (
        <>
          <path d="m21 16 16 16-16 16" fill="none" strokeWidth="5" />
          <path d="m35 20 12 12-12 12" fill="none" stroke={PURPLE} strokeWidth="5" />
        </>
      );
    case "plan":
      return (
        <>
          <path d="M13 17c8-2 25-2 37 0v35c-12-2-25-2-37 0Z" fill={PAPER} />
          <path d="M13 17c9-2 26-2 37 0v9H13Z" fill={PURPLE} />
          <path d="M21 13v8M42 13v8" fill="none" strokeWidth="3.2" />
          <path d="M20 33h8v7h-8ZM36 33h8v7h-8ZM36 43h8v5h-8Z" fill={LAVENDER} />
          <path d="M22 46c5-1 5-9 10-9 4 0 3 8 9 8" fill="none" stroke={PURPLE} strokeWidth="3" />
          <circle cx="22" cy="46" r="3" fill={WARM} />
          <path d="m41 42 1.3 2.7 3 .4-2.2 2.1.6 3-2.7-1.4-2.7 1.4.6-3-2.2-2.1 3-.4Z" fill={PURPLE} strokeWidth="1.5" />
        </>
      );
    case "practice":
      return (
        <>
          <path d="M14 12c10 1 20 0 30 2l4 37c-11-2-22-1-33 1Z" fill={PAPER} />
          <path d="M15 13c10 1 20 0 29 2l1 8c-10-2-19-1-29-1Z" fill={PURPLE} />
          <path d="M21 29h10M21 36h8M21 43h9" fill="none" />
          <circle cx="36" cy="29" r="2.5" fill={PURPLE} />
          <circle cx="36" cy="36" r="2.5" fill={PAPER} />
          <circle cx="36" cy="43" r="2.5" fill={PAPER} />
          <path d="m42 45 8-20 5 2-8 20-5 4Z" fill={WARM} />
          <path d="m50 25 5 2" fill="none" stroke={PURPLE} strokeWidth="2" />
        </>
      );
    case "mentors":
      return (
        <>
          <circle cx="21" cy="23" r="7" fill={WARM} />
          <circle cx="43" cy="21" r="7" fill={WARM} />
          <path d="M14 23c0-7 4-11 9-10 4 1 6 4 6 8-4-1-7-3-9-5-1 3-3 5-6 7Z" fill={INK} />
          <path d="M36 20c1-7 6-10 11-7 3 2 4 5 3 9-5 0-8-2-11-5 0 2-1 3-3 3Z" fill={INK} />
          <path d="M10 48c1-11 5-17 12-17 5 0 8 3 10 8 2-6 6-10 12-10 7 0 11 7 11 19" fill={PURPLE} />
          <path d="M18 39c6-2 11 0 14 4 4-4 9-6 15-4v13c-6-2-11 0-15 3-4-3-9-5-14-3Z" fill={PAPER} />
          <path d="M32 43v12" fill="none" />
          <path d="m34 11 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z" fill={WARM} strokeWidth="1.4" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M32 12c7 5 13 6 18 7v13c0 10-6 17-18 22-12-5-18-12-18-22V19c5-1 11-2 18-7Z" fill={PURPLE} />
          <path d="m23 32 6 6 12-14" fill="none" stroke={PAPER} strokeWidth="3.5" />
        </>
      );
    case "pastQuestions":
      return (
        <>
          <path d="M15 15h28l6 6v34H15Z" fill={PAPER} />
          <path d="M43 15v8h6" fill={PURPLE} />
          <path d="M24 30c0-5 3-8 8-8 4 0 7 2 7 6 0 7-8 6-8 12" fill="none" stroke={PURPLE} strokeWidth="3" />
          <circle cx="31" cy="47" r="2" fill={WARM} stroke="none" />
        </>
      );
    case "flashcards":
      return (
        <>
          <rect x="14" y="19" width="31" height="27" rx="4" fill={PAPER} transform="rotate(-8 14 19)" />
          <rect x="21" y="17" width="31" height="29" rx="4" fill={PURPLE} />
          <path d="M28 26h17M28 33h11" fill="none" stroke={PAPER} />
          <path d="m41 41 3 3 6-7" fill="none" stroke={WARM} strokeWidth="3" />
        </>
      );
    case "textbook":
      return (
        <>
          <path d="M8 18c9-3 17-1 24 5v31c-7-5-15-7-24-4Z" fill={PAPER} />
          <path d="M56 18c-9-3-17-1-24 5v31c7-5 15-7 24-4Z" fill={PURPLE} />
          <path d="M32 23v31" fill="none" />
          <path d="M13 27c5-1 10 0 14 2M13 34c5-1 10 0 14 2M37 29c4-2 9-2 14-1M37 36c4-2 9-2 14-1" fill="none" stroke={PURPLE} />
          <path d="M7 50c10-2 18 0 25 5 7-5 15-7 25-5M56 18v32" fill="none" stroke={WARM} strokeWidth="4" />
          <path d="m46 19-1 11-4-3-4 4 1-10" fill={GOLD} strokeWidth="1.6" />
        </>
      );
    case "analytics":
      return (
        <>
          <rect x="11" y="14" width="42" height="34" rx="5" fill={PAPER} />
          <path d="m18 39 8-9 7 4 12-13" fill="none" stroke={PURPLE} strokeWidth="3" />
          <circle cx="26" cy="30" r="2.5" fill={WARM} />
          <circle cx="45" cy="21" r="2.5" fill={PURPLE} />
          <path d="M25 53h14M32 48v5" fill="none" />
        </>
      );
    case "support":
      return (
        <>
          <path d="M15 33a17 17 0 0 1 34 0" fill="none" stroke={PURPLE} strokeWidth="5" />
          <rect x="11" y="31" width="9" height="14" rx="4" fill={WARM} />
          <rect x="44" y="31" width="9" height="14" rx="4" fill={PURPLE} />
          <path d="M48 45c-2 7-7 8-13 8" fill="none" />
          <circle cx="32" cy="53" r="3" fill={WARM} />
        </>
      );
    case "plus":
      return (
        <>
          <circle cx="32" cy="32" r="20" fill={PURPLE} />
          <path d="M32 22v20M22 32h20" fill="none" stroke={PAPER} strokeWidth="4" />
        </>
      );
    case "pencil":
      return (
        <>
          <path d="m16 44-2 8 8-2 27-27-6-6Z" fill={WARM} />
          <path d="m39 21 6 6M16 44l6 6" fill="none" />
          <path d="m43 17 3-3c2-2 7 3 5 5l-2 4Z" fill={PURPLE} />
        </>
      );
    case "trash":
      return (
        <>
          <path d="M19 22h26l-2 31H21Z" fill={PURPLE} />
          <path d="M15 20h34M26 20v-6h12v6M28 29v15M36 29v15" fill="none" />
        </>
      );
    case "eye":
      return (
        <>
          <path d="M10 32c6-10 13-15 22-15s16 5 22 15c-6 10-13 15-22 15S16 42 10 32Z" fill={PAPER} />
          <circle cx="32" cy="32" r="9" fill={PURPLE} />
          <circle cx="35" cy="28" r="2.5" fill={PAPER} stroke="none" />
        </>
      );
    case "eyeOff":
      return (
        <>
          <path d="M11 32c6-9 13-14 21-14s15 5 21 14c-6 9-13 14-21 14S17 41 11 32Z" fill={PAPER} />
          <circle cx="32" cy="32" r="8" fill={PURPLE} />
          <path d="M14 12 51 51" fill="none" stroke={WARM} strokeWidth="5" />
        </>
      );
    case "unfold":
      return (
        <>
          <path d="m20 25 12-11 12 11" fill="none" stroke={PURPLE} strokeWidth="4" />
          <path d="m20 39 12 11 12-11" fill="none" stroke={DEEP_PURPLE} strokeWidth="4" />
          <circle cx="32" cy="32" r="3" fill={WARM} />
        </>
      );
    case "help":
      return (
        <>
          <circle cx="32" cy="32" r="21" fill={PURPLE} />
          <path d="M23.5 25c.8-5.2 3.8-8 8.5-8 5.5 0 9 3.1 9 8 0 6.5-9 6.8-9 14" fill="none" stroke={PAPER} strokeWidth="4" />
          <circle cx="32" cy="48" r="3" fill={GOLD} stroke={PAPER} strokeWidth="1" />
        </>
      );
    case "checkbox":
      return (
        <>
          <rect x="14" y="14" width="36" height="36" rx="8" fill={PURPLE} />
          <path d="m22 32 7 7 14-17" fill="none" stroke={PAPER} strokeWidth="4" />
        </>
      );
    case "spinner":
      return (
        <>
          <path d="M32 12a20 20 0 0 1 18 12" fill="none" stroke={PURPLE} strokeWidth="6" />
          <path d="M50 24a20 20 0 0 1-4 22" fill="none" stroke={WARM} strokeWidth="6" />
          <path d="M46 46a20 20 0 0 1-23 4" fill="none" stroke={PURPLE} strokeWidth="6" opacity=".65" />
          <path d="M23 50a20 20 0 0 1-9-21" fill="none" stroke={DEEP_PURPLE} strokeWidth="6" opacity=".4" />
        </>
      );
    case "encouragement":
      return (
        <>
          <path d="M18 48c-3-7-2-13 2-18l5-7c2-3 6 0 4 3l-3 5 8-15c2-4 7-1 5 3l-5 11 5-9c2-4 7-1 5 3l-5 9 4-6c2-3 6 0 4 3l-7 13c-4 7-13 10-22 5Z" fill={WARM} />
          <path d="m49 12 1 5 5 1-5 2-1 5-2-5-5-2 5-1Z" fill={PURPLE} />
        </>
      );
    case "arrow":
      return (
        <>
          <path d="M12 32h37" fill="none" stroke={PURPLE} strokeWidth="6" />
          <path d="m36 18 14 14-14 14" fill="none" stroke={PURPLE} strokeWidth="6" />
          <circle cx="15" cy="32" r="3" fill={WARM} stroke="none" />
        </>
      );
    case "success":
      return (
        <>
          <circle cx="32" cy="32" r="21" fill={PURPLE} />
          <path d="m21 32 7 8 16-19" fill="none" stroke={PAPER} strokeWidth="4" />
        </>
      );
    case "learnerSuccess":
      return (
        <>
          <path d="M14 11h31l7 8v34H14Z" fill={PAPER} />
          <path d="M45 11v9h7" fill={GOLD} />
          <path
            d="m21 24 2.5 9 3.5-7 3.5 7 2.5-9"
            fill="none"
            stroke={PURPLE}
            strokeWidth="3.2"
          />
          <path d="M21 40h10M21 46h8" fill="none" stroke={DEEP_PURPLE} />
          <path d="M40 27v19" fill="none" stroke={WARM} strokeWidth="3" />
          <circle cx="40" cy="27" r="4" fill={PURPLE} />
          <circle cx="40" cy="36.5" r="4" fill={GOLD} />
          <circle cx="40" cy="46" r="5" fill={PURPLE} />
          <path d="m37.5 46 1.8 2 3.6-4" fill="none" stroke={PAPER} strokeWidth="2" />
        </>
      );
    case "messageSent":
      return (
        <>
          <path d="M11 22h36l6 6v25H11Z" fill={PURPLE} />
          <path d="m12 26 20 15 20-15M12 51l14-14M52 51 40 37" fill="none" stroke={PAPER} />
          <circle cx="47" cy="19" r="10" fill={PAPER} />
          <path d="m42 19 4 4 7-9" fill="none" stroke={PURPLE} strokeWidth="3" />
        </>
      );
    case "wifi":
      return (
        <>
          <path d="M10 25c13-12 31-12 44 0M17 33c9-8 21-8 30 0M24 41c5-4 11-4 16 0" fill="none" stroke={PURPLE} strokeWidth="4" />
          <circle cx="32" cy="49" r="4" fill={GOLD} />
          <path d="M48 18v19m-6-6 6 6 6-6" fill="none" stroke={GOLD} strokeWidth="3.5" />
        </>
      );
    case "database":
      return (
        <>
          <path d="M15 13h34v42H15Z" fill={PAPER} />
          <path d="M24 10h16v8H24Z" fill={PURPLE} />
          <circle cx="25" cy="29" r="6" fill={WARM} />
          <path d="M17 42c1-6 4-9 8-9s7 3 8 9Z" fill={PURPLE} />
          <path d="M36 27h8M36 34h8M36 41h8" fill="none" stroke={PURPLE} />
          <circle cx="42" cy="48" r="4" fill={GOLD} />
          <path d="m40 48 1.5 1.5 3-3" fill="none" stroke={INK} strokeWidth="1.6" />
        </>
      );
    case "lock":
      return (
        <>
          <path d="M20 28v-6c0-8 5-13 12-13s12 5 12 13v6" fill="none" stroke={DEEP_PURPLE} strokeWidth="5" />
          <rect x="15" y="27" width="34" height="28" rx="6" fill={PURPLE} />
          <circle cx="32" cy="39" r="4" fill={WARM} />
          <path d="M32 43v6" fill="none" />
        </>
      );
    case "userCheck":
      return (
        <>
          <circle cx="25" cy="22" r="9" fill={WARM} />
          <path d="M9 51c1-11 7-17 16-17 6 0 11 3 14 8" fill={PURPLE} />
          <circle cx="45" cy="41" r="10" fill={PAPER} />
          <path d="m39 41 4 4 8-10" fill="none" stroke={PURPLE} strokeWidth="3" />
        </>
      );
    case "privacyRequest":
      return (
        <>
          <path d="M10 12h34v41H10Z" fill={PAPER} />
          <path d="M16 9h22v7H16Z" fill={PURPLE} />
          <circle cx="25" cy="27" r="7" fill={WARM} />
          <path d="M14 44c1-9 5-13 11-13s10 4 11 13Z" fill={PURPLE} />
          <circle cx="38" cy="44" r="4" fill={GOLD} />
          <path d="M38 44h17" fill="none" stroke={PURPLE} strokeWidth="5" />
          <path d="m48 36 8 8-8 8" fill="none" stroke={PURPLE} strokeWidth="5" />
        </>
      );
    case "mail":
      return (
        <>
          <path d="M17 11h30v31H17Z" fill={PAPER} />
          <path d="M23 20h18M23 27h13" fill="none" stroke={PURPLE} />
          <path d="M9 27h46v26H9Z" fill={PURPLE} />
          <path d="m10 29 22 16 22-16M10 51l16-12M54 51 38 39" fill="none" stroke={PAPER} />
        </>
      );
    case "warning":
      return (
        <>
          <path d="m32 10 23 42H9Z" fill={WARM} />
          <path d="M32 23v14" fill="none" stroke={PAPER} strokeWidth="4" />
          <circle cx="32" cy="45" r="2.5" fill={PURPLE} stroke="none" />
        </>
      );
    case "card":
      return (
        <>
          <rect x="9" y="17" width="46" height="31" rx="6" fill={PURPLE} />
          <path d="M10 26h44" fill="none" stroke={PAPER} strokeWidth="5" />
          <rect x="17" y="34" width="9" height="7" rx="2" fill={WARM} />
          <path d="M33 39h13" fill="none" stroke={PAPER} />
        </>
      );
    case "scale":
      return (
        <>
          <path d="M32 13v37M18 18h28M21 18 12 36h18ZM43 18 34 36h18Z" fill={PAPER} />
          <path d="M11 36c2 8 16 8 19 0M34 36c2 8 16 8 18 0M22 52h20" fill="none" stroke={PURPLE} strokeWidth="3" />
          <circle cx="32" cy="14" r="4" fill={WARM} />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="32" cy="33" r="20" fill={PAPER} />
          <path d="M32 21v13l9 6" fill="none" stroke={PURPLE} strokeWidth="4" />
          <path d="M23 11h18" fill="none" stroke={WARM} strokeWidth="4" />
        </>
      );
    case "document":
      return (
        <>
          <path d="M15 11h27l8 8v35H15Z" fill={PAPER} />
          <path d="M42 11v10h8" fill={PURPLE} />
          <path d="M23 29h18M23 36h18M23 43h11" fill="none" stroke={PURPLE} />
          <path d="m38 47 3 3 7-8" fill="none" stroke={WARM} strokeWidth="3" />
        </>
      );
    case "send":
      return (
        <>
          <rect x="9" y="22" width="34" height="27" rx="4" fill={PAPER} />
          <path d="m10 25 16 13 16-13M10 47l12-12" fill="none" stroke={PURPLE} />
          <path d="M31 32h23m-8-8 8 8-8 8" fill="none" stroke={PURPLE} strokeWidth="4" />
          <circle cx="15" cy="51" r="3" fill={GOLD} stroke="none" />
        </>
      );
  }
}
