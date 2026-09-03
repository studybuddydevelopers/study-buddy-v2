import type { Metadata } from "next";
import Image from "@/components/Image";

const PREVIEW_SRC = "/temp-logo-preview/source";
const SVG_WIDTH = 1265;
const SVG_HEIGHT = 948;

const LOGO_SIZE_TESTS = [
  { size: 16, use: "Browser favicon", note: "Too small for the two figures" },
  { size: 24, use: "Compact icon", note: "The purple shape reads; faces do not" },
  { size: 28, use: "Current app header", note: "Current Logo size=lg icon height" },
  { size: 32, use: "Common navbar", note: "People are visible, but details are soft" },
  { size: 40, use: "Standard navbar", note: "The two-student idea starts to read" },
  { size: 48, use: "Large navbar", note: "Recognisable at a quick glance" },
  { size: 64, use: "Illustrated mark", note: "Recommended minimum for this artwork" },
] as const;

export const metadata: Metadata = {
  title: "Temporary SVG Preview | Study Buddy",
  description: "A temporary preview of the Study Buddy SVG artwork.",
};

export default function TemporaryLogoPreviewPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#171717]">
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-primary-600">
              Temporary preview
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Student illustration
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              The newest clean SVG from Downloads, shown in a few likely Study
              Buddy placements. This route is intentionally not linked in the
              main navigation.
            </p>
          </div>
          <code className="rounded-full border border-primary-200 bg-white px-4 py-2 text-xs font-semibold text-primary-700 shadow-sm">
            /temp-logo-preview
          </code>
        </div>

        <section className="overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm">
          <div className="grid items-center lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-600">
                Landing-page preview
              </p>
              <h2 className="mt-4 text-4xl font-bold leading-tight text-secondary-500 sm:text-5xl">
                Ace your WAEC exams with Study Buddy
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-gray-600">
                Practise the right topics, understand your mistakes, and walk
                into exam day with confidence.
              </p>
              <span className="mt-7 inline-flex rounded-full bg-primary-500 px-6 py-3 text-sm font-bold text-white shadow-sm">
                Get started
              </span>
            </div>

            <div className="flex min-h-[360px] items-center bg-[#EDE9F8] p-5 sm:p-8">
              <Image
                src={PREVIEW_SRC}
                alt="Two smiling students pointing toward the centre"
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                loading="eager"
                fetchPriority="high"
                rounded="xl"
                className="object-contain"
              />
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.72fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
                Original artwork
              </p>
              <h2 className="mt-2 text-xl font-bold text-gray-950">
                Full SVG proportions
              </h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <Image
                src={PREVIEW_SRC}
                alt="Full-size student illustration"
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                rounded="none"
                className="object-contain"
              />
            </div>
          </section>

          <section className="rounded-3xl bg-secondary-500 p-5 text-white shadow-sm sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-200">
              Website logo sizing
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              How small is a normal logo?
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-6 text-secondary-100">
              <p>
                Browser favicons are usually <strong className="text-white">16–32px</strong>.
              </p>
              <p>
                Navbar icons are usually <strong className="text-white">24–40px tall</strong>.
              </p>
              <p>
                A full logo lockup is commonly <strong className="text-white">32–48px tall</strong>.
              </p>
            </div>
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-sm font-bold text-white">For this illustration</p>
              <p className="mt-2 text-xs leading-5 text-secondary-100">
                Keep it at 48–64px tall or larger. Below that, the faces, hands,
                and shirt initials merge together. A simpler symbol is stronger
                for a favicon or compact navbar.
              </p>
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
            Navbar reality check
          </p>
          <h2 className="mt-2 text-xl font-bold text-gray-950">
            Shown inside a website header
          </h2>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <HeaderLogoPreview size={28} label="Current app size · 28px tall" />
            <HeaderLogoPreview size={48} label="Recommended preview · 48px tall" />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
            Exact pixel tests
          </p>
          <h2 className="mt-2 text-xl font-bold text-gray-950">
            Is the illustration still recognisable?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Each sample below is rendered at the labelled height—not enlarged—so
            it matches the space a real website logo would occupy.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOGO_SIZE_TESTS.map(({ size, use, note }) => (
              <article
                key={size}
                className="rounded-2xl border border-gray-200 bg-[#F8F9FA] p-4"
              >
                <div className="flex h-20 items-center justify-center rounded-xl border border-gray-200 bg-white">
                  <ArtworkAtHeight size={size} />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-950">{use}</h3>
                  <span className="shrink-0 text-xs font-bold text-primary-600">
                    {size}px
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-600">{note}</p>
              </article>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-xs leading-5 text-gray-500">
          Website asset: /images/study-buddy-students.svg
        </p>
      </section>
    </main>
  );
}

function ArtworkAtHeight({ size }: { size: number }) {
  const width = Math.round((size * SVG_WIDTH) / SVG_HEIGHT);

  return (
    <div className="shrink-0 overflow-hidden bg-white" style={{ width }}>
      <Image
        src={PREVIEW_SRC}
        alt=""
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        rounded="none"
        className="object-contain"
      />
    </div>
  );
}

function HeaderLogoPreview({ size, label }: { size: number; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <ArtworkAtHeight size={size} />
          <span className="truncate text-lg font-bold text-[#6C3483]">
            Study Buddy
          </span>
        </div>
        <div className="hidden items-center gap-5 text-xs font-semibold text-gray-500 sm:flex">
          <span>Materials</span>
          <span>Exams</span>
          <span>Progress</span>
        </div>
      </div>
      <p className="border-t border-gray-200 bg-[#F8F9FA] px-4 py-2 text-xs font-semibold text-gray-600 sm:px-5">
        {label}
      </p>
    </div>
  );
}
