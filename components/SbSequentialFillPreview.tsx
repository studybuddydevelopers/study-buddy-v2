"use client";

import { useEffect, useId, useState } from "react";
import Image from "@/components/Image";

const MARK_SRC = "/images/proposed-sb-mark.svg";
const CYCLE_MS = 9000;
const S_END = 0.45;
const B_END = 0.9;
const S_TRACE =
  "M245 395 C245 500 245 610 245 650 C245 700 305 720 340 680 C370 645 370 525 370 435 C370 365 330 320 285 280 C250 248 245 205 245 130 C245 75 275 45 315 45 C355 45 380 72 380 120 L380 200 C380 235 396 252 420 265";
const B_TRACE =
  "M420 265 C445 275 455 300 455 330 L455 640 C455 690 485 720 535 720 C580 720 615 700 615 645 L615 460 C615 390 555 360 470 360 L515 360 C575 360 610 330 610 275 L610 135 C610 80 580 45 530 45 C488 45 455 70 455 125 L455 215 C455 242 442 263 420 265";

export default function SbSequentialFillPreview() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setPhase(B_END);
        return;
      }

      setPhase(((now - startedAt) % CYCLE_MS) / CYCLE_MS);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const sProgress = clamp(phase / S_END);
  const bProgress = clamp((phase - S_END) / (B_END - S_END));
  const percentage = Math.round(clamp(phase / B_END) * 100);
  const activeLabel =
    sProgress < 1 ? "Drawing S" : bProgress < 1 ? "Drawing B" : "Ready";

  return (
    <section className="mt-8 rounded-3xl border border-primary-200 bg-primary-50 p-5 shadow-sm sm:p-7">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
          Proposed loading behaviour
        </p>
        <h2 className="mt-2 text-2xl font-bold text-secondary-500">
          Write the S first, then the B
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          One uninterrupted purple stroke starts at the lower S and completes its
          full cursive curve. From that exact endpoint it continues down through
          B&apos;s lower stem, curves around the lower and upper bowls, and completes
          B without lifting or restarting. The completed mark then holds briefly.
        </p>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="overflow-hidden rounded-2xl border border-primary-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
            Loading screen · exact 400px “max” slot
          </div>
          <div className="overflow-auto p-4 sm:p-6">
            <div className="mx-auto flex min-h-[470px] min-w-[400px] flex-col items-center justify-center">
              <SequentialFillMark
                size={400}
                sProgress={sProgress}
                bProgress={bProgress}
                label={`Study Buddy loading: ${percentage}%`}
              />
              <p className="mt-5 text-lg font-bold text-[#6C3483]">
                Loading {percentage}%
              </p>
              <p className="mt-1 text-sm font-medium text-gray-500">{activeLabel}</p>
            </div>
          </div>
        </article>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <ContextCard title="Navbar · exact 28px slot">
            <div className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-white px-4 shadow-sm">
              <div className="flex items-center gap-2">
                <SequentialFillMark
                  size={28}
                  sProgress={sProgress}
                  bProgress={bProgress}
                  label={`Study Buddy logo loading: ${percentage}%`}
                />
                <span className="text-lg font-bold text-secondary-500">Study Buddy</span>
              </div>
              <span className="hidden text-xs font-semibold text-gray-500 sm:inline">
                Materials
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-600">
              This shows the trace loop in the same always-visible position where
              the cube currently rotates.
            </p>
          </ContextCard>

          <ContextCard title="Password-reset status · exact 28px slot">
            <div className="flex min-h-28 flex-col items-center justify-center rounded-xl bg-white shadow-sm">
              <SequentialFillMark
                size={28}
                sProgress={sProgress}
                bProgress={bProgress}
                label={`Checking reset link: ${percentage}%`}
              />
              <p className="mt-3 text-sm font-bold text-secondary-500">
                Checking reset link
              </p>
              <p className="mt-1 text-xs text-gray-500">{percentage}%</p>
            </div>
          </ContextCard>

          <ContextCard title="Compact status · 36px">
            <div className="flex min-h-28 items-center justify-center gap-4 rounded-xl bg-white shadow-sm">
              <SequentialFillMark
                size={36}
                sProgress={sProgress}
                bProgress={bProgress}
                label={`Study Buddy progress: ${percentage}%`}
              />
              <div>
                <p className="text-sm font-bold text-secondary-500">{activeLabel}</p>
                <p className="mt-1 text-xs text-gray-500">{percentage}% complete</p>
              </div>
            </div>
          </ContextCard>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-primary-200 bg-white p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
          Fixed trace checkpoints
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <TraceCheckpoint label="25% · lower S" sProgress={0.5} bProgress={0} />
          <TraceCheckpoint label="50% · S complete" sProgress={1} bProgress={0} />
          <TraceCheckpoint
            label="62% · continues down B"
            sProgress={1}
            bProgress={0.25}
          />
          <TraceCheckpoint
            label="75% · curves around B"
            sProgress={1}
            bProgress={0.5}
          />
          <TraceCheckpoint label="100% · complete" sProgress={1} bProgress={1} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SequenceStep
          number="1"
          title="Start at the lower S"
          copy="The trace begins at the lower terminal, like placing a pen on paper."
        />
        <SequenceStep
          number="2"
          title="Follow the cursive S"
          copy="It travels around the lower curve, through the centre, and completes the top."
        />
        <SequenceStep
          number="3"
          title="Continue directly into B"
          copy="Without lifting, the same stroke travels down B, curves around both bowls, and completes the mark."
        />
      </div>
    </section>
  );
}

function TraceCheckpoint({
  label,
  sProgress,
  bProgress,
}: {
  label: string;
  sProgress: number;
  bProgress: number;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-[#F8F9FA] p-4">
      <SequentialFillMark
        size={120}
        sProgress={sProgress}
        bProgress={bProgress}
        label={label}
      />
      <p className="mt-3 text-xs font-bold text-secondary-500">{label}</p>
    </div>
  );
}

function SequentialFillMark({
  size,
  sProgress,
  bProgress,
  label,
}: {
  size: number;
  sProgress: number;
  bProgress: number;
  label: string;
}) {
  const maskId = `sb-trace-${useId().replaceAll(":", "")}`;
  const completionPass = clamp((bProgress - 0.9) / 0.1);
  const imageProps = {
    src: MARK_SRC,
    width: size,
    height: size,
    widths: [size, size * 2],
    sizes: `${size}px`,
    rounded: "none" as const,
    className: "!absolute !inset-0 !h-full !w-full object-contain",
  };

  return (
    <span
      role="img"
      aria-label={label}
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        {...imageProps}
        alt=""
        className={`${imageProps.className} opacity-[0.14]`}
      />
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 745 745"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="745"
            height="745"
          >
            <rect width="745" height="745" fill="black" />
            <path
              d={S_TRACE}
              fill="none"
              stroke="white"
              strokeWidth="104"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - sProgress}
            />
            <path
              d={B_TRACE}
              fill="none"
              stroke="white"
              strokeWidth="126"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - bProgress}
            />
            <rect
              width="745"
              height="745"
              fill="white"
              opacity={completionPass}
            />
          </mask>
        </defs>
        <image
          href={MARK_SRC}
          width="745"
          height="745"
          preserveAspectRatio="xMidYMid meet"
          mask={`url(#${maskId})`}
        />
      </svg>
    </span>
  );
}

function ContextCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-primary-200 bg-[#F8F9FA] p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
        {title}
      </h3>
      {children}
    </article>
  );
}

function SequenceStep({
  number,
  title,
  copy,
}: {
  number: string;
  title: string;
  copy: string;
}) {
  return (
    <article className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6C3483] text-xs font-bold text-white">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-bold text-secondary-500">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-gray-600">{copy}</p>
      </div>
    </article>
  );
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}
