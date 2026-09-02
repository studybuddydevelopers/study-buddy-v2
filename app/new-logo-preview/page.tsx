import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "@/components/Image";
import Logo from "@/components/Logo";
import SbSequentialFillPreview from "@/components/SbSequentialFillPreview";

const MARK_SRC = "/images/proposed-sb-mark.svg";

const SIZE_TESTS = [
  { size: 16, label: "16px", use: "Small browser favicon" },
  { size: 20, label: "20px", use: "About badge · xs/sm/md icon" },
  { size: 28, label: "28px", use: "Navbar · login · reset status" },
  { size: 32, label: "32px", use: "XL icon / large favicon" },
  { size: 36, label: "36px", use: "Reset-page floating row" },
  { size: 40, label: "40px", use: "3XL icon" },
  { size: 48, label: "48px", use: "4XL icon" },
  { size: 56, label: "56px", use: "5XL icon" },
  { size: 80, label: "80px", use: "6XL icon" },
] as const;

const ANIMATION_TESTS = [
  {
    name: "Navbar / reset rotation",
    className: "animate-[logoRotate_2s_linear_infinite]",
    note: "The exact continuous two-second rotation used by the cube.",
  },
  {
    name: "Login / sign-up float",
    className: "animate-[logoFloat_3s_ease-in-out_infinite]",
    note: "The exact gentle three-second float used on authentication pages.",
  },
  {
    name: "Reset-page float",
    className: "animate-[logoFloat_0.8s_ease-in-out_infinite]",
    note: "The faster float supported by the shared logo component.",
  },
  {
    name: "Pulse option",
    className: "animate-[logoPulse_2s_infinite]",
    note: "A supported logo setting, shown as a calmer alternative to rotation.",
  },
] as const;

const BACKGROUND_TESTS = [
  { label: "White", color: "#FFFFFF", text: "#171717", result: "Strong" },
  { label: "App off-white", color: "#F8F9FA", text: "#171717", result: "Strong" },
  { label: "Current navy", color: "#102B3F", text: "#FFFFFF", result: "Usable, but muted" },
  { label: "Current purple", color: "#6247AA", text: "#FFFFFF", result: "Low contrast" },
] as const;

export const metadata: Metadata = {
  title: "SB Logo Constraint Preview | Study Buddy",
  description:
    "The proposed SB-only mark shown under the current Study Buddy cube logo constraints.",
};

export default function NewLogoPreviewPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#171717]">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="rounded-3xl bg-secondary-500 px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-200">
                Proposal only · live cube unchanged
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                The SB-only mark under every current logo constraint
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-secondary-100 sm:text-base">
                The embedded “STUDY BUDDY” line and white square have been
                removed. The mark is tightly cropped, transparent, and keeps
                the supplied shape in the selected purple #6C3483.
              </p>
            </div>
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-3xl bg-white shadow-lg">
              <ProposedMark size={120} label="Proposed SB-only logo" />
            </div>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading
            eyebrow="Most visible use"
            title="Exact navbar comparison · 28px"
            copy="Both lockups use the current 28px icon slot, 18px name, spacing, hover growth, and continuous rotation."
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <PreviewPanel title="Current cube">
              <FakeNavbar>
                <Logo variant="full" size="lg" animation="rotate" />
              </FakeNavbar>
            </PreviewPanel>
            <PreviewPanel title="Proposed SB mark">
              <FakeNavbar>
                <div className="flex items-center gap-2">
                  <ProposedMark
                    size={28}
                    animationClass="animate-[logoRotate_2s_linear_infinite]"
                    hover
                    label="Proposed SB logo"
                  />
                  <span className="text-lg font-bold text-secondary-500">
                    Study Buddy
                  </span>
                </div>
              </FakeNavbar>
            </PreviewPanel>
          </div>
        </section>

        <SbSequentialFillPreview />

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading
            eyebrow="Production placements"
            title="How it looks where the cube is actually used"
            copy="These samples recreate the current favicon, About badge, login lockup, reset states, and large loading treatment."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <PreviewPanel title="Browser tab · 16px">
              <div className="overflow-hidden rounded-xl border border-gray-300 bg-gray-100 shadow-sm">
                <div className="flex h-10 items-center gap-2 border-b border-gray-300 bg-white px-3">
                  <ProposedMark size={16} label="SB favicon at 16 pixels" />
                  <span className="truncate text-xs text-gray-700">Study Buddy</span>
                  <span className="ml-auto text-xs text-gray-400">×</span>
                </div>
                <div className="h-8 bg-gray-50" />
              </div>
            </PreviewPanel>

            <PreviewPanel title="About-page badge · 20px">
              <div className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
                <ProposedMark size={20} label="SB logo at 20 pixels" />
                Study Buddy
              </div>
            </PreviewPanel>

            <PreviewPanel title="Login / sign-up · 28px float">
              <div className="flex flex-col items-center gap-2 py-5">
                <div className="flex items-center gap-2">
                  <ProposedMark
                    size={28}
                    animationClass="animate-[logoFloat_3s_ease-in-out_infinite]"
                    label="Floating SB logo"
                  />
                  <span className="text-lg font-bold text-secondary-500">
                    Study Buddy
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Nigeria&apos;s WAEC prep companion
                </p>
              </div>
            </PreviewPanel>

            <PreviewPanel title="Password reset · 28px + four 36px marks">
              <div className="flex flex-col items-center gap-7 py-3">
                <ProposedMark
                  size={28}
                  animationClass="animate-[logoRotate_2s_linear_infinite]"
                  label="Rotating SB status logo"
                />
                <div className="flex items-center justify-center gap-2">
                  {(["floatReverse", "float", "floatReverse", "float"] as const).map(
                    (direction, index) => (
                      <ProposedMark
                        key={`${direction}-${index}`}
                        size={36}
                        animationClass={
                          direction === "float"
                            ? "animate-[logoFloat_0.8s_ease-in-out_infinite]"
                            : "animate-[logoFloatReverse_0.8s_ease-in-out_infinite]"
                        }
                        label={index === 0 ? "Floating SB logo row" : undefined}
                      />
                    )
                  )}
                </div>
              </div>
            </PreviewPanel>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-[#F8F9FA] p-5">
            <div className="mb-4">
              <h3 className="font-bold text-secondary-500">
                Loading screen · current “max” setting
              </h3>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                The production component requests a 25em canvas—about 400px at
                the default browser font size—and combines multiple nested
                rotations with the float animation.
              </p>
            </div>
            <div className="overflow-auto rounded-2xl bg-white p-4">
              <div className="mx-auto flex min-h-[420px] min-w-[400px] items-center justify-center">
                <div className="inline-flex animate-[logoRotate_2.5s_linear_infinite]">
                  <div className="inline-flex animate-[logoRotate_2s_linear_infinite]">
                    <ProposedMark
                      size={400}
                      animationClass="animate-[logoFloat_3s_ease-in-out_infinite]"
                      label="Proposed SB logo at the current maximum loading size"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading
            eyebrow="Size API"
            title="Every compact size supported by the cube component"
            copy="Each mark below is rendered at its labelled CSS dimensions—not enlarged for the preview."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SIZE_TESTS.map(({ size, label, use }) => (
              <article
                key={`${size}-${use}`}
                className="flex min-h-28 items-center gap-4 rounded-2xl border border-gray-200 bg-[#F8F9FA] p-4"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <ProposedMark size={size} label={`SB logo at ${label}`} />
                </div>
                <div>
                  <p className="font-bold text-secondary-500">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">{use}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading
            eyebrow="Motion API"
            title="Every relevant animation setting"
            copy="Hover over a mark as well: the shared component currently enlarges every logo by 10%."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ANIMATION_TESTS.map(({ name, className, note }) => (
              <article
                key={name}
                className="rounded-2xl border border-gray-200 bg-[#F8F9FA] p-5 text-center"
              >
                <div className="flex h-24 items-center justify-center rounded-xl bg-white">
                  <ProposedMark
                    size={56}
                    animationClass={className}
                    hover
                    label={`${name} preview`}
                  />
                </div>
                <h3 className="mt-4 text-sm font-bold text-secondary-500">{name}</h3>
                <p className="mt-2 text-xs leading-5 text-gray-600">{note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading
            eyebrow="Colour constraint"
            title="The supplied purple on current app backgrounds"
            copy="Unlike the cube, this external SVG has a fixed #6C3483 fill. It will not inherit the component’s colour prop."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BACKGROUND_TESTS.map(({ label, color, text, result }) => (
              <article
                key={label}
                className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-black/10 p-5 text-center"
                style={{ backgroundColor: color, color: text }}
              >
                <ProposedMark size={72} label={`SB logo on ${label}`} />
                <p className="mt-4 text-sm font-bold">{label}</p>
                <p className="mt-1 text-xs opacity-75">{result}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-primary-200 bg-primary-50 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
            What this preview reveals
          </p>
          <div className="mt-4 grid gap-4 text-sm leading-6 text-gray-700 md:grid-cols-3">
            <Finding
              title="The crop works"
              copy="The SB now occupies the available icon box and remains identifiable at 16–28px."
            />
            <Finding
              title="Rotation is the weak fit"
              copy="A rotating cube makes visual sense; rotating letters repeatedly turns the brand upside down. Float or pulse suits this mark better."
            />
            <Finding
              title="A light version is needed"
              copy="The fixed purple is strongest on white and off-white. A white SB variant would be safer on navy and purple surfaces."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ProposedMark({
  size,
  animationClass = "",
  hover = false,
  label,
}: {
  size: number;
  animationClass?: string;
  hover?: boolean;
  label?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-flex shrink-0 items-center justify-center ${animationClass}`}
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
        className={`!h-full !w-full object-contain ${
          hover ? "hover:scale-110" : ""
        }`}
      />
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-secondary-500">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{copy}</p>
    </div>
  );
}

function PreviewPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-[#F8F9FA]">
      <div className="border-b border-gray-200 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
        {title}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </article>
  );
}

function FakeNavbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-white px-4 shadow-sm">
      {children}
      <div className="hidden items-center gap-4 text-xs font-semibold text-gray-500 sm:flex">
        <span>Materials</span>
        <span>Exams</span>
        <span>Profile</span>
      </div>
    </div>
  );
}

function Finding({ title, copy }: { title: string; copy: string }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="font-bold text-secondary-500">{title}</h3>
      <p className="mt-2">{copy}</p>
    </article>
  );
}
