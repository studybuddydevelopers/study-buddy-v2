import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TextField from "./TextField";
import SelectField from "./SelectField";
import MultiSelectField from "./MultiSelectField";
import MultiSelectOptionCard from "./MultiSelectOptionCard";
import SingleChoiceOption from "./SingleChoiceOption";
import Paragraph from "./Paragraph";
import Card from "./Card";
import StudyPreferencesClient from "@/app/settings/study-preferences/StudyPreferencesClient";

vi.mock("next/image", () => ({ default: () => null }));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.tsx$/.test(file) && !/\.test\.tsx$/.test(file) ? [file] : [];
  });
}

describe("site accessibility safeguards", () => {
  it("reserves the main landmark for the shared shell", () => {
    const owners = ["app", "components"].flatMap(sourceFiles).filter((file) =>
      /<main[\s>]|role=["']main["']/.test(readFileSync(file, "utf8"))
    );
    expect(owners.map((file) => relative(".", file))).toEqual(["app/ClientLayoutWrapper.tsx"]);
  });

  it("provides a keyboard skip link to a focusable main landmark", () => {
    const shell = readFileSync("app/ClientLayoutWrapper.tsx", "utf8");
    expect(shell).toContain('href="#main-content"');
    expect(shell).toMatch(/<main[^>]*id="main-content"[^>]*tabIndex=\{-1\}/);
  });

  it("associates field errors and required state with the input", () => {
    const html = renderToStaticMarkup(createElement(TextField, { id: "email", label: "Email", required: true, error: "Enter your email" }));
    expect(html).toContain('for="email"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="email-error"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain('required=""');
  });

  it("associates select labels and errors with unique controls", () => {
    const html = renderToStaticMarkup(createElement(SelectField, { label: "Subject", options: [], required: true, error: "Choose a subject" }));
    const id = html.match(/<select[^>]*\sid="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`for="${id}"`);
    expect(html).toContain(`aria-describedby="${id}-error"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('required=""');
  });

  it("uses a named native disclosure button for the multi-select", () => {
    const html = renderToStaticMarkup(createElement(MultiSelectField, { label: "Subjects", options: [] }));
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls=');
    expect(html).toContain('aria-labelledby=');
    expect(html).not.toContain('alt="Toggle dropdown"');
  });

  it.each([
    ["checkbox", createElement(MultiSelectOptionCard, { label: "Maths", value: "maths" })],
    ["radio", createElement(SingleChoiceOption, { label: "Maths", name: "subject", value: "maths" })],
  ])("keeps custom %s controls in the keyboard order", (_name, element) => {
    const html = renderToStaticMarkup(element);
    expect(html).not.toContain('class="hidden"');
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('focus-within:');
  });

  it("does not leave faded text invisible when reduced motion is enabled", () => {
    const html = renderToStaticMarkup(<Paragraph fadeIn>Visible text</Paragraph>);
    expect(html).toContain('motion-safe:opacity-0');
    expect(html).not.toMatch(/(?:class="| )opacity-0(?: |")/);
  });

  it("names settings switches and connects their descriptions", () => {
    const html = renderToStaticMarkup(<StudyPreferencesClient backHref="/profile" backLabel="Back to profile" />);
    expect(html.match(/role="switch"/g)).toHaveLength(2);
    expect(html.match(/aria-labelledby=/g)).toHaveLength(2);
    expect(html.match(/aria-describedby=/g)).toHaveLength(2);
    expect(html).toContain("peer-focus-visible:outline");
  });

  it("activates interactive cards with Enter or Space, not descendant keystrokes", () => {
    const onClick = vi.fn();
    const card = Card({ children: "Open topic", onClick });
    const target = {};
    const preventDefault = vi.fn();
    for (const key of ["Enter", " "]) {
      card.props.onKeyDown({ key, target, currentTarget: target, preventDefault });
    }
    card.props.onKeyDown({ key: "Enter", target: {}, currentTarget: target, preventDefault });
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(card.props.tabIndex).toBe(0);
    expect(Card({ children: "Static card" }).props.onClick).toBeUndefined();
  });

  it("uses a modal native dialog with focus recovery for chat deletion", () => {
    const chat = readFileSync("app/chat/ChatClient.tsx", "utf8");
    expect(chat).toContain("<dialog");
    expect(chat).toContain("dialog?.showModal()");
    expect(chat).toContain("previousFocus.focus()");
    expect(chat).toContain('aria-label="Message to AI tutor"');
  });

  it("provides a primary heading without changing account-entry typography", () => {
    const files = ["login/LoginClient", "sign-up/SignUpClient", "forgot-password/ForgotPasswordClient", "check-email/CheckEmailClient", "reset-password/update/ResetPasswordUpdateClient"];
    for (const file of files) {
      expect(readFileSync(`app/${file}.tsx`, "utf8")).toContain('<Heading2 as="h1"');
    }
  });
});
