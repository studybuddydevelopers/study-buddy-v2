import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "@/components/Image";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Current Cube Usage Audit | Study Buddy",
  description:
    "A visual inventory of every production placement of the current Study Buddy cube.",
};

export default function CubeUsageAuditPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#171717]">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="rounded-3xl bg-secondary-500 px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-200">
            Inventory only · no replacements assigned
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-white sm:text-4xl">
            Every place the current cube is used
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-secondary-100 sm:text-base">
            Each card recreates the current placement, size, animation, surrounding
            copy, and purpose. The SB loading pattern has not been applied anywhere
            on this page yet.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <SummaryStat value="2" label="True loading states" />
            <SummaryStat value="5" label="Animated non-loading uses" />
            <SummaryStat value="2" label="Static identity uses" />
          </div>
        </header>

        <section className="mt-8">
          <SectionHeading
            eyebrow="Group 1"
            title="The cube is genuinely communicating loading"
            copy="These are the two placements where a loading animation replacement is directly relevant."
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <UsageCard
              number="01"
              title="Global route loading screen"
              role="Loading"
              description="Shown by the root app/loading.tsx boundary while route content is being prepared."
              source="app/loading.tsx"
              size="400 × 400px icon"
              motion="2.5s outer spin + 2s icon rotation + 3s float"
              wide
            >
              <div className="min-h-[510px] min-w-[430px] overflow-hidden rounded-xl bg-white p-6">
                <div className="flex min-h-[460px] flex-col items-center justify-center">
                  <div className="mb-6 animate-[cubeAuditSpin_2.5s_linear_infinite]">
                    <Logo
                      variant="icon"
                      size="max"
                      animated
                      animation="rotate"
                    />
                  </div>
                  <p className="text-base text-gray-500">Loading, please wait…</p>
                </div>
              </div>
            </UsageCard>

            <UsageCard
              number="02"
              title="Password-reset link check"
              role="Loading"
              description="Appears while the reset token is being checked before the password form can open."
              source="app/reset-password/update/ResetPasswordUpdateClient.tsx"
              size="28 × 28px icon"
              motion="Continuous 2s rotation"
            >
              <div className="flex min-h-52 items-center justify-center rounded-xl bg-[#F8F9FA] p-5">
                <div className="flex w-full max-w-md flex-col items-center rounded-2xl bg-white p-7 shadow-md">
                  <h3 className="text-xl font-bold text-secondary-500">
                    Checking Reset Link
                  </h3>
                  <Logo
                    variant="icon"
                    animation="rotate"
                    size="lg"
                    className="mt-6"
                  />
                </div>
              </div>
            </UsageCard>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Group 2"
            title="Animated cube uses that are not loading"
            copy="These placements move, but their job is branding, navigation, or error-state decoration."
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <UsageCard
              number="03"
              title="Site-wide navbar brand"
              role="Navigation"
              description="Persistent brand link shown by ClientLayoutWrapper across the public and authenticated app."
              source="components/NavBar.tsx"
              size="28px icon + 18px name"
              motion="Continuous 2s rotation"
            >
              <div className="flex min-h-40 items-center justify-center rounded-xl bg-[#F8F9FA] p-5">
                <div className="flex w-full items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm">
                  <Logo variant="full" size="lg" animation="rotate" />
                  <div className="flex gap-5 text-xs font-semibold text-gray-500">
                    <span>Materials</span>
                    <span>Exams</span>
                    <span>Profile</span>
                  </div>
                </div>
              </div>
            </UsageCard>

            <UsageCard
              number="04"
              title="Login-page brand header"
              role="Branding"
              description="Sits above the login card and identifies the product before sign-in."
              source="app/login/LoginClient.tsx"
              size="28px icon + 18px name"
              motion="Gentle 3s icon float"
            >
              <AuthBrandPreview />
            </UsageCard>

            <UsageCard
              number="05"
              title="Sign-up-page brand header"
              role="Branding"
              description="The same floating lockup appears above the account-creation card."
              source="app/sign-up/SignUpClient.tsx"
              size="28px icon + 18px name"
              motion="Gentle 3s icon float"
            >
              <AuthBrandPreview />
            </UsageCard>

            <UsageCard
              number="06"
              title="Expired reset-link decoration"
              role="Error decoration"
              description="Four cubes alternate up and down beneath the expired-link heading."
              source="app/reset-password/update/ResetPasswordUpdateClient.tsx"
              size="Four 36 × 36px icons"
              motion="Alternating 0.8s float / reverse float"
            >
              <div className="flex min-h-52 flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-5">
                <h3 className="text-xl font-bold text-secondary-500">
                  Reset Link Expired
                </h3>
                <div className="mt-9 flex items-center justify-center">
                  <Logo variant="icon" animation="floatReverse" size="2xl" />
                  <Logo variant="icon" animation="float" size="2xl" />
                  <Logo variant="icon" animation="floatReverse" size="2xl" />
                  <Logo variant="icon" animation="float" size="2xl" />
                </div>
              </div>
            </UsageCard>

            <UsageCard
              number="07"
              title="Expired reset-link footer icon"
              role="Error decoration"
              description="A second, smaller rotating cube sits below the expired-link message."
              source="app/reset-password/update/ResetPasswordUpdateClient.tsx"
              size="28 × 28px icon"
              motion="Continuous 2s rotation"
            >
              <div className="flex min-h-52 flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-5">
                <p className="mb-5 text-sm text-gray-600">
                  Your password reset link has expired.
                </p>
                <Logo variant="icon" animation="rotate" size="lg" />
              </div>
            </UsageCard>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Group 3"
            title="Static cube identity"
            copy="These placements use the cube without animation and should be treated separately from loading."
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <UsageCard
              number="08"
              title="About-page product badge"
              role="Static branding"
              description="A small external SVG appears beside the Study Buddy name above the About heading."
              source="app/about-us/page.tsx + public/logo-icon.svg"
              size="20 × 20px image"
              motion="None"
            >
              <div className="flex min-h-40 items-center justify-center rounded-xl bg-white p-5">
                <div className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
                  <Image
                    src="/logo-icon.svg"
                    alt=""
                    className="!h-5 !w-5"
                    width={20}
                    height={20}
                    sizes="20px"
                    widths={[20, 40]}
                  />
                  Study Buddy
                </div>
              </div>
            </UsageCard>

            <UsageCard
              number="09"
              title="Browser and metadata icon"
              role="Site identity"
              description="The cube is supplied both by the metadata icon declaration and the special app favicon file."
              source="app/layout.tsx + app/favicon.svg + public/logo-icon.svg"
              size="Typically 16–32px"
              motion="None"
            >
              <div className="flex min-h-40 items-center justify-center rounded-xl bg-[#F8F9FA] p-5">
                <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
                  <div className="flex h-11 items-center gap-2 border-b border-gray-200 px-3">
                    <Image
                      src="/logo-icon.svg"
                      alt=""
                      width={16}
                      height={16}
                      widths={[16, 32]}
                      sizes="16px"
                      rounded="none"
                      className="!h-4 !w-4"
                    />
                    <span className="text-xs text-gray-700">Study Buddy</span>
                    <span className="ml-auto text-gray-400">×</span>
                  </div>
                  <div className="h-10 bg-gray-50" />
                </div>
              </div>
            </UsageCard>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-dashed border-gray-300 bg-white p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
            Development-only reference · excluded from the nine decisions
          </p>
          <div className="mt-4 grid items-center gap-5 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-xl font-bold text-secondary-500">
                The demo showcase is not a product placement
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                <code>app/demo-showcase/page.tsx</code> renders every supported cube
                size to test the component. It should not receive its own replacement
                assignment because users do not encounter it as part of a workflow.
              </p>
            </div>
            <div className="flex items-end gap-3 rounded-xl bg-[#F8F9FA] p-4">
              <Logo variant="icon" size="xs" animation="rotate" />
              <Logo variant="icon" size="lg" animation="rotate" />
              <Logo variant="icon" size="3xl" animation="rotate" />
              <Logo variant="icon" size="5xl" animation="rotate" />
            </div>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <strong>Decision status:</strong> all nine replacement assignments remain
          intentionally unassigned. This page changes no live cube placement.
        </div>
      </div>

      <style>{`
        @keyframes cubeAuditSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function UsageCard({
  number,
  title,
  role,
  description,
  source,
  size,
  motion,
  wide = false,
  children,
}: {
  number: string;
  title: string;
  role: string;
  description: string;
  source: string;
  size: string;
  motion: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-5">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6C3483] text-xs font-bold text-white">
            {number}
          </span>
          <div>
            <h3 className="text-lg font-bold text-secondary-500">{title}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              {description}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
          {role}
        </span>
      </div>

      <div className="overflow-auto p-4 sm:p-5">{children}</div>

      <dl className="grid gap-px border-t border-gray-200 bg-gray-200 sm:grid-cols-3">
        <AuditDetail label="Source" value={source} />
        <AuditDetail label="Current size" value={size} />
        <AuditDetail label="Current motion" value={motion} />
      </dl>

      <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
          Proposed replacement
        </span>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          Unassigned
        </span>
      </div>
    </article>
  );
}

function AuthBrandPreview() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl bg-[#F8F9FA] p-5">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo variant="full" size="lg" animated />
        <p className="text-center text-sm text-gray-500">
          Nigeria&apos;s WAEC prep companion
        </p>
      </div>
      <div className="h-14 w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-sm" />
    </div>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F8F9FA] p-4">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-xs font-semibold leading-5 text-gray-800">{value}</dd>
    </div>
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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-secondary-500">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{copy}</p>
    </div>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-secondary-100">{label}</p>
    </div>
  );
}
