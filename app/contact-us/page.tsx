"use client";

import { useState } from "react";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import Link from "next/link";

const SUBJECTS = [
  "General enquiry",
  "Technical support",
  "Account & billing",
  "Partnerships & schools",
  "Content feedback",
  "Privacy & data",
  "Other",
];

type Field = "name" | "email" | "subject" | "message";

export default function ContactUsPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    name: false, email: false, subject: false, message: false,
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errors: Record<Field, string> = {
    name: form.name.trim() ? "" : "Name is required",
    email: !form.email.trim()
      ? "Email is required"
      : !emailRe.test(form.email)
      ? "Enter a valid email"
      : "",
    subject: form.subject ? "" : "Please choose a subject",
    message: form.message.trim().length >= 10
      ? ""
      : "Message must be at least 10 characters",
  };
  const isValid = Object.values(errors).every((e) => !e);

  const touch = (field: Field) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async () => {
    setTouched({ name: true, email: true, subject: true, message: true });
    if (!isValid) return;

    setLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setServerError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 w-full">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-accent-200">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-secondary-200/50 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 mb-3">
            We&apos;re here to help
          </p>
          <Heading1 gutter="sm">Contact us</Heading1>
          <Paragraph size="lg" weight="medium" className="text-gray-800 max-w-2xl mt-4 leading-relaxed">
            Have a question, found a bug, or want to partner with us? Send us a
            message and we&apos;ll get back to you within one business day.
          </Paragraph>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-14 md:py-16">
        <div className="grid gap-12 md:grid-cols-[1fr_300px]">

          {/* ── Form ── */}
          <div>
            {sent ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center space-y-3">
                <div className="text-4xl">✅</div>
                <Heading2 gutter="none" className="text-green-800">Message sent!</Heading2>
                <Paragraph variant="muted" gutter="none">
                  Thanks for reaching out. We&apos;ll reply to{" "}
                  <span className="font-semibold">{form.email}</span> within one business day.
                </Paragraph>
                <button
                  onClick={() => {
                    setSent(false);
                    setForm({ name: "", email: "", subject: "", message: "" });
                    setTouched({ name: false, email: false, subject: false, message: false });
                  }}
                  className="mt-2 text-sm text-primary-600 underline hover:text-primary-700"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <Heading2 gutter="sm">Send us a message</Heading2>

                <div className="flex flex-col sm:flex-row gap-4">
                  <TextField
                    label="Your name"
                    required
                    placeholder="Ada Okafor"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    onFocus={() => touch("name")}
                    error={touched.name ? errors.name : ""}
                    className="flex-1"
                  />
                  <TextField
                    label="Email address"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    onFocus={() => touch("email")}
                    error={touched.email ? errors.email : ""}
                    className="flex-1"
                  />
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-gray-900">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => {
                      touch("subject");
                      setForm((f) => ({ ...f, subject: e.target.value }));
                    }}
                    onFocus={() => touch("subject")}
                    className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 text-[0.95rem] transition-all duration-200
                      focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300
                      ${touched.subject && errors.subject ? "border-red-500 bg-red-50" : "border-transparent"}`}
                  >
                    <option value="">Select a subject…</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {touched.subject && errors.subject && (
                    <p className="text-sm text-red-500 mt-1">{errors.subject}</p>
                  )}
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-gray-900">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Tell us what's on your mind…"
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    onFocus={() => touch("message")}
                    className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-900 text-[0.95rem] transition-all duration-200 resize-none
                      focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300
                      ${touched.message && errors.message ? "border-red-500 bg-red-50" : "border-transparent"}`}
                  />
                  {touched.message && errors.message && (
                    <p className="text-sm text-red-500 mt-1">{errors.message}</p>
                  )}
                </div>

                {serverError && (
                  <p className="text-sm text-red-600">{serverError}</p>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto rounded-xl px-10"
                  loading={loading}
                  disabled={loading}
                  onClick={handleSubmit}
                >
                  Send message
                </Button>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-accent-200 bg-accent-50/80 p-6 shadow-sm space-y-5">
              <Heading2 size="sm" gutter="none" className="text-primary-700">
                Other ways to reach us
              </Heading2>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">Email</p>
                  <a
                    href="mailto:sbstudybuddy0@gmail.com"
                    className="text-primary-600 hover:underline break-all"
                  >
                    sbstudybuddy0@gmail.com
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">WhatsApp tutoring</p>
                  <p className="text-gray-600">
                    Chat with our AI tutor directly on WhatsApp — available 24/7 for
                    WAEC Mathematics help.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">Response time</p>
                  <p className="text-gray-600">
                    We reply within one business day, Monday – Friday.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-accent-200 bg-accent-50/80 p-6 shadow-sm space-y-3">
              <Heading2 size="sm" gutter="none" className="text-primary-700">
                Quick links
              </Heading2>
              <ul className="space-y-2 text-sm">
                {[
                  { label: "About Study Buddy", href: "/about-us" },
                  { label: "Privacy Policy", href: "/privacy-policy" },
                  { label: "Terms of Service", href: "/terms-of-service" },
                  { label: "Sign up free", href: "/sign-up" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-primary-600 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

        </div>
      </div>

    </main>
  );
}
