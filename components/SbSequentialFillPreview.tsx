"use client";

import { useEffect, useId, useState } from "react";
import Image from "@/components/Image";

const MARK_SRC = "/images/proposed-sb-mark.svg";
const CYCLE_MS = 9000;
const S_END = 0.45;
const B_END = 0.9;
const S_TRACE =
  "M245 395 C245 500 245 610 245 650 C245 700 305 720 340 680 C370 645 370 525 370 435 C370 365 330 320 285 280 C250 248 245 205 245 130 C245 75 275 45 315 45 C355 45 380 72 380 120 L380 200 C380 235 396 252 420 265";
const B_STEM_END = 0.25;
const B_LOWER_END = 0.62;
const B_STEM_TRACE =
  "M420 265 C443 276 456 301 456 330 L456 635";
const B_LOWER_TRACE =
  "M456 635 C456 682 485 710 530 710 C565 710 585 687 585 646 L585 460 C585 407 548 372 475 365";
const B_UPPER_TRACE =
  "M475 365 C545 365 585 335 585 280 L585 130 C585 80 560 45 525 45 C485 45 456 75 456 125 L456 215 C456 240 443 258 420 265";
const EQUALIZER_BAR_COUNT = 12;
const SPIRAL_PATH = createSpiralPath();
const DIAGONAL_BRUSH_IN_STROKES = [
  "M-180 180 L180 -180",
  "M-180 370 L370 -180",
  "M-180 560 L560 -180",
  "M-180 750 L750 -180",
  "M-180 940 L940 -180",
  "M-180 1130 L1130 -180",
  "M-180 1320 L1320 -180",
  "M-180 1510 L1510 -180",
  "M-180 1700 L1700 -180",
] as const;
const DIAGONAL_BRUSH_OUT_STROKES = [
  "M1700 -180 L-180 1700",
  "M1510 -180 L-180 1510",
  "M1320 -180 L-180 1320",
  "M1130 -180 L-180 1130",
  "M940 -180 L-180 940",
  "M750 -180 L-180 750",
  "M560 -180 L-180 560",
  "M370 -180 L-180 370",
  "M180 -180 L-180 180",
] as const;
const SPLASH_POINTS = [
  { x: 235, y: 60, rotation: -18 },
  { x: 425, y: 60, rotation: 14 },
  { x: 600, y: 60, rotation: -8 },
  { x: 235, y: 220, rotation: 11 },
  { x: 425, y: 220, rotation: -15 },
  { x: 600, y: 220, rotation: 20 },
  { x: 235, y: 380, rotation: -10 },
  { x: 425, y: 380, rotation: 17 },
  { x: 600, y: 380, rotation: -21 },
  { x: 235, y: 540, rotation: 19 },
  { x: 425, y: 540, rotation: -12 },
  { x: 600, y: 540, rotation: 8 },
  { x: 235, y: 700, rotation: -16 },
  { x: 425, y: 700, rotation: 13 },
  { x: 600, y: 700, rotation: -5 },
] as const;
const SPLASH_OUT_ORDER = [7, 0, 13, 5, 10, 2, 12, 8, 3, 14, 6, 1, 11, 4, 9] as const;

export function SbEqualizerLoadingPattern({ size = 400 }: { size?: number }) {
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

  const equalizerLevels = Array.from({ length: EQUALIZER_BAR_COUNT }, (_, index) => {
    const cycles = 5 + (index % 4);
    const wave = Math.sin(phase * Math.PI * 2 * cycles + index * 1.35);

    return 0.18 + ((wave + 1) / 2) * 0.82;
  });

  return (
    <div className="flex flex-col items-center justify-center">
      <EqualizerFillMark
        size={size}
        levels={equalizerLevels}
        label="Study Buddy volume-bar loading animation"
      />
      <p className="mt-5 text-base text-gray-500">Loading, please wait…</p>
    </div>
  );
}

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
  const bottomUpProgress = clamp(phase / B_END);
  const brushInProgress = segmentProgress(phase, 0.02, 0.42);
  const brushOutProgress = segmentProgress(phase, 0.58, 0.98);
  const brushStatus =
    brushInProgress < 1
      ? "Brushing diagonally in…"
      : brushOutProgress === 0
        ? "Fully brushed"
        : "Brushing diagonally out…";
  const splashInProgress = segmentProgress(phase, 0.02, 0.42);
  const splashOutProgress = segmentProgress(phase, 0.58, 0.98);
  const splashStatus =
    splashInProgress < 1
      ? "Splashing in…"
      : splashOutProgress === 0
        ? "Fully splashed"
        : "Splashing out…";
  const equalizerLevels = Array.from({ length: EQUALIZER_BAR_COUNT }, (_, index) => {
    const cycles = 5 + (index % 4);
    const wave = Math.sin(phase * Math.PI * 2 * cycles + index * 1.35);

    return 0.18 + ((wave + 1) / 2) * 0.82;
  });
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

      <div className="mt-5 rounded-2xl border border-primary-200 bg-white p-4 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Diagonal brush motion test
            </p>
            <h3 className="mt-2 text-xl font-bold text-secondary-500">
              Brush the SB diagonally in and out
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              Parallel strokes sweep from the lower-left toward the upper-right until
              the mark is full. After a short hold, the purple is brushed away across
              the opposite diagonal. Everything remains clipped inside the pale SB
              frame.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-primary-50 p-4">
              <BrushFillMark
                size={200}
                brushInProgress={brushInProgress}
                brushOutProgress={brushOutProgress}
                label={`Study Buddy diagonal brush animation: ${brushStatus}`}
              />
              <p className="mt-3 text-sm font-bold text-[#6C3483]">
                {brushStatus}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { size: 56, label: "56px" },
                { size: 36, label: "36px" },
                { size: 28, label: "28px" },
              ].map(({ size, label }) => (
                <div
                  key={size}
                  className="flex min-h-28 flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-3"
                >
                  <BrushFillMark
                    size={size}
                    brushInProgress={brushInProgress}
                    brushOutProgress={brushOutProgress}
                    label={`Study Buddy diagonal brush at ${label}`}
                  />
                  <p className="mt-3 text-xs font-bold text-secondary-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Partly brushed",
              brushInProgress: 0.35,
              brushOutProgress: 0,
            },
            {
              label: "Fully brushed",
              brushInProgress: 1,
              brushOutProgress: 0,
            },
            {
              label: "Partly removed",
              brushInProgress: 1,
              brushOutProgress: 0.45,
            },
            {
              label: "Cleared",
              brushInProgress: 1,
              brushOutProgress: 1,
            },
          ].map((checkpoint) => (
            <div
              key={checkpoint.label}
              className="flex flex-col items-center rounded-xl bg-[#F8F9FA] p-3"
            >
              <BrushFillMark
                size={80}
                brushInProgress={checkpoint.brushInProgress}
                brushOutProgress={checkpoint.brushOutProgress}
                label={checkpoint.label}
              />
              <p className="mt-2 text-xs font-bold text-secondary-500">
                {checkpoint.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-primary-200 bg-white p-4 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Splash motion test
            </p>
            <h3 className="mt-2 text-xl font-bold text-secondary-500">
              Fill and clear the SB with splashes
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              Purple ink-like splashes expand across the SB until it is completely
              filled. After a short hold, a new splash order removes the colour while
              the pale letter frame stays visible.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-primary-50 p-4">
              <SplashFillMark
                size={200}
                splashInProgress={splashInProgress}
                splashOutProgress={splashOutProgress}
                label={`Study Buddy splash animation: ${splashStatus}`}
              />
              <p className="mt-3 text-sm font-bold text-[#6C3483]">
                {splashStatus}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { size: 56, label: "56px" },
                { size: 36, label: "36px" },
                { size: 28, label: "28px" },
              ].map(({ size, label }) => (
                <div
                  key={size}
                  className="flex min-h-28 flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-3"
                >
                  <SplashFillMark
                    size={size}
                    splashInProgress={splashInProgress}
                    splashOutProgress={splashOutProgress}
                    label={`Study Buddy splash animation at ${label}`}
                  />
                  <p className="mt-3 text-xs font-bold text-secondary-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Partly splashed",
              splashInProgress: 0.35,
              splashOutProgress: 0,
            },
            {
              label: "Fully splashed",
              splashInProgress: 1,
              splashOutProgress: 0,
            },
            {
              label: "Partly cleared",
              splashInProgress: 1,
              splashOutProgress: 0.45,
            },
            {
              label: "Cleared",
              splashInProgress: 1,
              splashOutProgress: 1,
            },
          ].map((checkpoint) => (
            <div
              key={checkpoint.label}
              className="flex flex-col items-center rounded-xl bg-[#F8F9FA] p-3"
            >
              <SplashFillMark
                size={80}
                splashInProgress={checkpoint.splashInProgress}
                splashOutProgress={checkpoint.splashOutProgress}
                label={checkpoint.label}
              />
              <p className="mt-2 text-xs font-bold text-secondary-500">
                {checkpoint.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-primary-200 bg-white p-4 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Spiral motion test
            </p>
            <h3 className="mt-2 text-xl font-bold text-secondary-500">
              A rotating spiral inside the SB frame
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              One continuous purple spiral turns slowly behind the pale SB frame.
              The exact letter shape clips the motion, so every curve remains inside
              the mark.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-primary-50 p-4">
              <SpiralFillMark
                size={200}
                rotation={phase * 360}
                label="Study Buddy spiral animation"
              />
              <p className="mt-3 text-sm font-bold text-[#6C3483]">
                Thinking…
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { size: 56, label: "56px" },
                { size: 36, label: "36px" },
                { size: 28, label: "28px" },
              ].map(({ size, label }) => (
                <div
                  key={size}
                  className="flex min-h-28 flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-3"
                >
                  <SpiralFillMark
                    size={size}
                    rotation={phase * 360}
                    label={`Study Buddy spiral at ${label}`}
                  />
                  <p className="mt-3 text-xs font-bold text-secondary-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-primary-200 bg-white p-4 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Equalizer motion test
            </p>
            <h3 className="mt-2 text-xl font-bold text-secondary-500">
              Volume bars moving inside the SB frame
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              The pale SB remains fixed as the frame while every purple bar rises
              and falls independently. The animation is clipped to the exact letter
              shape, so no bar can spill beyond the mark.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-primary-50 p-4">
              <EqualizerFillMark
                size={200}
                levels={equalizerLevels}
                label="Study Buddy equalizer animation"
              />
              <p className="mt-3 text-sm font-bold text-[#6C3483]">
                Listening…
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { size: 56, label: "56px" },
                { size: 36, label: "36px" },
                { size: 28, label: "28px" },
              ].map(({ size, label }) => (
                <div
                  key={size}
                  className="flex min-h-28 flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-3"
                >
                  <EqualizerFillMark
                    size={size}
                    levels={equalizerLevels}
                    label={`Study Buddy equalizer at ${label}`}
                  />
                  <p className="mt-3 text-xs font-bold text-secondary-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-primary-200 bg-white p-4 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
              Alternative motion test
            </p>
            <h3 className="mt-2 text-xl font-bold text-secondary-500">
              Both letters fill from bottom to top
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              S and B rise together in one clean vertical fill. This option is less
              like handwriting, but it remains especially clear in the small navbar
              and loading-status slots.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-primary-50 p-4">
              <BottomUpFillMark
                size={200}
                progress={bottomUpProgress}
                label={`Study Buddy bottom-up fill: ${percentage}%`}
              />
              <p className="mt-3 text-sm font-bold text-[#6C3483]">
                Rising together · {percentage}%
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0.25, 0.5, 0.75, 1].map((progress) => (
                <div
                  key={progress}
                  className="flex flex-col items-center rounded-xl bg-[#F8F9FA] p-3"
                >
                  <BottomUpFillMark
                    size={80}
                    progress={progress}
                    label={`Bottom-up fill at ${progress * 100}%`}
                  />
                  <p className="mt-2 text-xs font-bold text-secondary-500">
                    {progress * 100}%
                  </p>
                </div>
              ))}
            </div>
          </div>
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
  const sClipId = `${maskId}-s-only`;
  const bStemClipId = `${maskId}-b-stem`;
  const bLowerClipId = `${maskId}-b-lower`;
  const bUpperClipId = `${maskId}-b-upper`;
  const bStemProgress = segmentProgress(bProgress, 0, B_STEM_END);
  const bLowerProgress = segmentProgress(
    bProgress,
    B_STEM_END,
    B_LOWER_END
  );
  const bUpperProgress = segmentProgress(bProgress, B_LOWER_END, 1);
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
          <clipPath id={sClipId} clipPathUnits="userSpaceOnUse">
            <rect x="0" y="0" width="423" height="745" />
          </clipPath>
          <clipPath id={bStemClipId} clipPathUnits="userSpaceOnUse">
            <rect x="423" y="245" width="86" height="500" />
          </clipPath>
          <clipPath id={bLowerClipId} clipPathUnits="userSpaceOnUse">
            <rect x="423" y="358" width="322" height="387" />
          </clipPath>
          <clipPath id={bUpperClipId} clipPathUnits="userSpaceOnUse">
            <rect x="423" y="0" width="322" height="374" />
          </clipPath>
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
              clipPath={`url(#${sClipId})`}
            />
            <path
              d={B_STEM_TRACE}
              fill="none"
              stroke="white"
              strokeWidth="86"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - bStemProgress}
              clipPath={`url(#${bStemClipId})`}
            />
            <path
              d={B_LOWER_TRACE}
              fill="none"
              stroke="white"
              strokeWidth="86"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - bLowerProgress}
              clipPath={`url(#${bLowerClipId})`}
            />
            <path
              d={B_UPPER_TRACE}
              fill="none"
              stroke="white"
              strokeWidth="86"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - bUpperProgress}
              clipPath={`url(#${bUpperClipId})`}
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

function BottomUpFillMark({
  size,
  progress,
  label,
}: {
  size: number;
  progress: number;
  label: string;
}) {
  const maskId = `sb-bottom-up-${useId().replaceAll(":", "")}`;
  const clampedProgress = clamp(progress);
  const revealY = 745 * (1 - clampedProgress);

  return (
    <span
      role="img"
      aria-label={label}
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        widths={[size, size * 2]}
        sizes={`${size}px`}
        rounded="none"
        className="!absolute !inset-0 !h-full !w-full object-contain opacity-[0.14]"
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
            <rect
              x="0"
              y={revealY}
              width="745"
              height={745 - revealY}
              fill="white"
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

function EqualizerFillMark({
  size,
  levels,
  label,
}: {
  size: number;
  levels: number[];
  label: string;
}) {
  const maskId = `sb-equalizer-${useId().replaceAll(":", "")}`;
  const barWidth = 24;
  const barStep = 35;
  const barStartX = 207;
  const barBottom = 720;
  const maximumBarHeight = 690;

  return (
    <span
      role="img"
      aria-label={label}
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        widths={[size, size * 2]}
        sizes={`${size}px`}
        rounded="none"
        className="!absolute !inset-0 !h-full !w-full object-contain opacity-[0.14]"
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
            style={{ maskType: "alpha" }}
          >
            <image
              href={MARK_SRC}
              width="745"
              height="745"
              preserveAspectRatio="xMidYMid meet"
            />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          {levels.map((level, index) => {
            const barHeight = maximumBarHeight * clamp(level);

            return (
              <rect
                key={index}
                x={barStartX + index * barStep}
                y={barBottom - barHeight}
                width={barWidth}
                height={barHeight}
                rx={barWidth / 2}
                fill="#6C3483"
              />
            );
          })}
        </g>
      </svg>
    </span>
  );
}

function SpiralFillMark({
  size,
  rotation,
  label,
}: {
  size: number;
  rotation: number;
  label: string;
}) {
  const maskId = `sb-spiral-${useId().replaceAll(":", "")}`;

  return (
    <span
      role="img"
      aria-label={label}
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        widths={[size, size * 2]}
        sizes={`${size}px`}
        rounded="none"
        className="!absolute !inset-0 !h-full !w-full object-contain opacity-[0.14]"
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
            style={{ maskType: "alpha" }}
          >
            <image
              href={MARK_SRC}
              width="745"
              height="745"
              preserveAspectRatio="xMidYMid meet"
            />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <path
            d={SPIRAL_PATH}
            fill="none"
            stroke="#6C3483"
            strokeWidth="34"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`rotate(${rotation} 372.5 372.5)`}
          />
        </g>
      </svg>
    </span>
  );
}

function BrushFillMark({
  size,
  brushInProgress,
  brushOutProgress,
  label,
}: {
  size: number;
  brushInProgress: number;
  brushOutProgress: number;
  label: string;
}) {
  const maskId = `sb-brush-${useId().replaceAll(":", "")}`;

  return (
    <span
      role="img"
      aria-label={label}
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        widths={[size, size * 2]}
        sizes={`${size}px`}
        rounded="none"
        className="!absolute !inset-0 !h-full !w-full object-contain opacity-[0.14]"
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
            {DIAGONAL_BRUSH_IN_STROKES.map((path, index) => (
              <path
                key={`in-${path}`}
                d={path}
                fill="none"
                stroke="white"
                strokeWidth="170"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={
                  1 -
                  staggeredStrokeProgress(
                    brushInProgress,
                    index,
                    DIAGONAL_BRUSH_IN_STROKES.length
                  )
                }
              />
            ))}
            {DIAGONAL_BRUSH_OUT_STROKES.map((path, index) => (
              <path
                key={`out-${path}`}
                d={path}
                fill="none"
                stroke="black"
                strokeWidth="170"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={
                  1 -
                  staggeredStrokeProgress(
                    brushOutProgress,
                    index,
                    DIAGONAL_BRUSH_OUT_STROKES.length
                  )
                }
              />
            ))}
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

function SplashFillMark({
  size,
  splashInProgress,
  splashOutProgress,
  label,
}: {
  size: number;
  splashInProgress: number;
  splashOutProgress: number;
  label: string;
}) {
  const maskId = `sb-splash-${useId().replaceAll(":", "")}`;

  return (
    <span
      role="img"
      aria-label={label}
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        widths={[size, size * 2]}
        sizes={`${size}px`}
        rounded="none"
        className="!absolute !inset-0 !h-full !w-full object-contain opacity-[0.14]"
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
            {SPLASH_POINTS.map((splash, index) => (
              <SplashMaskShape
                key={`in-${splash.x}-${splash.y}`}
                splash={splash}
                progress={staggeredStrokeProgress(
                  splashInProgress,
                  index,
                  SPLASH_POINTS.length
                )}
                fill="white"
              />
            ))}
            {SPLASH_OUT_ORDER.map((splashIndex, index) => {
              const splash = SPLASH_POINTS[splashIndex];

              return (
                <SplashMaskShape
                  key={`out-${splash.x}-${splash.y}`}
                  splash={splash}
                  progress={staggeredStrokeProgress(
                    splashOutProgress,
                    index,
                    SPLASH_OUT_ORDER.length
                  )}
                  fill="black"
                />
              );
            })}
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

function SplashMaskShape({
  splash,
  progress,
  fill,
}: {
  splash: (typeof SPLASH_POINTS)[number];
  progress: number;
  fill: "white" | "black";
}) {
  const scale = 1 - Math.pow(1 - clamp(progress), 3);

  return (
    <g
      transform={`translate(${splash.x} ${splash.y}) rotate(${splash.rotation}) scale(${scale})`}
      fill={fill}
    >
      <circle r="130" />
      <circle cx="108" cy="-62" r="34" />
      <circle cx="-106" cy="-46" r="27" />
      <circle cx="95" cy="84" r="30" />
      <circle cx="-68" cy="112" r="24" />
      <circle cx="-118" cy="55" r="18" />
      <circle cx="60" cy="-118" r="20" />
    </g>
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

function segmentProgress(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start));
}

function createSpiralPath() {
  const centre = 372.5;
  const turns = 5.5;
  const pointCount = 220;
  const points = Array.from({ length: pointCount + 1 }, (_, index) => {
    const progress = index / pointCount;
    const angle = -Math.PI / 2 + progress * turns * Math.PI * 2;
    const radius = 8 + progress * 430;
    const x = centre + Math.cos(angle) * radius;
    const y = centre + Math.sin(angle) * radius;

    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ");
}

function staggeredStrokeProgress(progress: number, index: number, count: number) {
  const strokeWindow = 0.34;
  const start = (index / (count - 1)) * (1 - strokeWindow);

  return segmentProgress(progress, start, start + strokeWindow);
}
