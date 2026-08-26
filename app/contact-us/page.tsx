"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Heading2 from "@/components/Heading2";
import Paragraph from "@/components/Paragraph";
import TextField from "@/components/TextField";

const SUBJECTS = [
  "General enquiry",
  "Technical support",
  "Account & billing",
  "Partnerships & schools",
  "Content feedback",
  "Privacy & data",
  "Other",
];

const supportNotes = [
  {
    title: "Reply window",
    description: "We usually reply within one business day, Monday to Friday.",
    icon: Clock,
  },
  {
    title: "Account help",
    description:
      "Include the email on your account and what you were trying to do.",
    icon: ShieldCheck,
  },
  {
    title: "Content feedback",
    description:
      "Tell us the subject, topic, and question if something in the bank looks wrong.",
    icon: FileText,
  },
];

type Field = "name" | "email" | "subject" | "message";

export default function ContactUsPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    name: false,
    email: false,
    subject: false,
    message: false,
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
    message:
      form.message.trim().length >= 10
        ? ""
        : "Message must be at least 10 characters",
  };
  const isValid = Object.values(errors).every((error) => !error);

  const touch = (field: Field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const resetForm = () => {
    setSent(false);
    setServerError("");
    setForm({ name: "", email: "", subject: "", message: "" });
    setTouched({ name: false, email: false, subject: false, message: false });
  };

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
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Contact Study Buddy
            </div>
            <Heading1 gutter="sm">How can we help?</Heading1>
            <Paragraph
              size="lg"
              weight="medium"
              className="max-w-2xl leading-relaxed text-gray-800"
            >
              Send a clear message about your account, a bug, a content issue,
              or a school partnership. The more detail you include, the faster
              we can respond usefully.
            </Paragraph>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:sbstudybuddy0@gmail.com"
              className="rounded-lg border border-gray-200 bg-accent-50 p-4 text-gray-900 transition hover:border-primary-300 hover:bg-primary-50"
            >
              <Mail className="mb-3 h-5 w-5 text-primary-600" aria-hidden="true" />
              <p className="text-sm font-semibold">Email</p>
              <p className="mt-1 break-all text-sm text-gray-700">
                sbstudybuddy0@gmail.com
              </p>
            </a>
            <Link
              href="/privacy-policy"
              className="rounded-lg border border-gray-200 bg-accent-50 p-4 text-gray-900 transition hover:border-primary-300 hover:bg-primary-50"
            >
              <ShieldCheck
                className="mb-3 h-5 w-5 text-primary-600"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold">Privacy</p>
              <p className="mt-1 text-sm text-gray-700">
                Review how student and account data is handled.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-accent-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_340px] lg:py-14">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            {sent ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <CheckCircle2
                  className="mb-4 h-12 w-12 text-green-600"
                  aria-hidden="true"
                />
                <Heading2 gutter="sm" className="text-green-800">
                  Message sent
                </Heading2>
                <Paragraph variant="muted" className="max-w-md">
                  Thanks for reaching out. We will reply to{" "}
                  <span className="font-semibold text-gray-900">
                    {form.email}
                  </span>{" "}
                  within one business day.
                </Paragraph>
                <Button
                  variant="outline"
                  size="md"
                  className="mt-4"
                  onClick={resetForm}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <Heading2 gutter="sm">Send us a message</Heading2>
                  <Paragraph variant="muted" className="text-sm">
                    Required fields are marked with an asterisk.
                  </Paragraph>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Your name"
                    required
                    placeholder="Ada Okafor"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    onFocus={() => touch("name")}
                    error={touched.name ? errors.name : ""}
                  />
                  <TextField
                    label="Email address"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    onFocus={() => touch("email")}
                    error={touched.email ? errors.email : ""}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-gray-900">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.subject}
                    onChange={(event) => {
                      touch("subject");
                      setForm((current) => ({
                        ...current,
                        subject: event.target.value,
                      }));
                    }}
                    onFocus={() => touch("subject")}
                    className={`w-full rounded-xl border bg-gray-50 px-4 py-3 text-[0.95rem] text-gray-900 transition-all duration-200 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 ${
                      touched.subject && errors.subject
                        ? "border-red-500 bg-red-50"
                        : "border-transparent"
                    }`}
                  >
                    <option value="">Select a subject</option>
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                  {touched.subject && errors.subject && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-gray-900">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={7}
                    placeholder="Tell us what happened, what page you were on, and what you expected to see."
                    value={form.message}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    onFocus={() => touch("message")}
                    className={`w-full resize-none rounded-xl border bg-gray-50 px-4 py-3 text-[0.95rem] text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 ${
                      touched.message && errors.message
                        ? "border-red-500 bg-red-50"
                        : "border-transparent"
                    }`}
                  />
                  {touched.message && errors.message && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.message}
                    </p>
                  )}
                </div>

                {serverError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {serverError}
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  loading={loading}
                  disabled={loading}
                  onClick={handleSubmit}
                  icon={<Send className="h-5 w-5" aria-hidden="true" />}
                  className="w-full sm:w-auto"
                >
                  Send message
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {supportNotes.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <Icon className="mb-3 h-5 w-5 text-primary-600" aria-hidden="true" />
                <h2 className="text-base font-bold text-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {description}
                </p>
              </div>
            ))}

            <div className="rounded-lg border border-gray-200 bg-secondary-500 p-5 text-white shadow-sm">
              <h2 className="text-base font-bold">Need to keep studying?</h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary-100">
                You can return to practice materials while we handle your
                message.
              </p>
              <Link
                href="/materials"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline"
              >
                Browse materials
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
