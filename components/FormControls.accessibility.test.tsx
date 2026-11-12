import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TextField from "./TextField";
import SelectField from "./SelectField";
import MultiSelectField from "./MultiSelectField";
import MultiSelectOptionCard from "./MultiSelectOptionCard";
import SingleChoiceOption from "./SingleChoiceOption";

vi.mock("next/image", () => ({ default: () => null }));

const options = [
  { value: "maths", label: "Mathematics" },
  { value: "english", label: "English" },
];

// These are rendered-markup checks, not browser focus or announcement tests.
describe.each([
  { name: "TextField", tag: "input", Field: TextField },
  { name: "SelectField", tag: "select", Field: SelectField },
])("$name accessible field associations", ({ tag, Field }) => {
  it("gives repeated fields unique IDs and associates each error with its own control", () => {
    const html = renderToStaticMarkup(
      <>
        <Field label="First subject" options={options} error="First error" required />
        <Field label="Second subject" options={options} error="Second error" required />
      </>
    );
    const controls = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map(([control]) => control);
    expect(controls).toHaveLength(2);
    const ids = controls.map((control) => control.match(/\bid="([^"]+)"/)?.[1]);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(2);
    controls.forEach((control, index) => {
      const id = ids[index];
      expect(html).toContain(`for="${id}"`);
      expect(control).toContain('required=""');
      expect(control).toContain('aria-invalid="true"');
      expect(control).toContain(`aria-describedby="${id}-error"`);
      expect(html).toMatch(new RegExp(`<p[^>]*id="${id}-error"[^>]*role="alert"[^>]*>${index === 0 ? "First" : "Second"} error</p>`));
    });
  });

  it("does not leave dangling error references on an optional, valid field", () => {
    const html = renderToStaticMarkup(<Field label="Subject" options={options} />);
    expect(html).not.toContain("aria-invalid=");
    expect(html).not.toContain("aria-describedby=");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('required=""');
  });

  it("uses native disabled semantics", () => {
    const html = renderToStaticMarkup(<Field label="Subject" options={options} disabled />);
    const control = html.match(new RegExp(`<${tag}\\b[^>]*>`))?.[0];
    expect(control).toContain('disabled=""');
  });
});

describe("password control accessibility", () => {
  it("preserves an explicit ID, form metadata and a named non-submit visibility button", () => {
    const html = renderToStaticMarkup(
      <TextField id="account-password" name="password" label="Password" type="password" autoComplete="current-password" />
    );
    expect(html).toContain('for="account-password"');
    expect(html).toContain('id="account-password"');
    expect(html).toContain('name="password"');
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="current-password"');
    const toggle = html.match(/<button\b[^>]*>/)?.[0];
    expect(toggle).toContain('type="button"');
    expect(toggle).toContain('aria-label="Show password"');
    expect(toggle).toContain('aria-controls="account-password"');
    expect(toggle).toContain("h-11 w-11");
  });

  it("disables both the input and visibility action when unavailable", () => {
    const html = renderToStaticMarkup(<TextField label="Password" type="password" disabled />);
    expect(html.match(/<input\b[^>]*>/)?.[0]).toContain('disabled=""');
    expect(html.match(/<button\b[^>]*>/)?.[0]).toContain('disabled=""');
  });

  it("does not add a visibility action to ordinary text fields", () => {
    expect(renderToStaticMarkup(<TextField label="Name" />)).not.toContain("<button");
  });
});

describe("multi-select accessible markup", () => {
  it("names the trigger from both its label and selection and links to the hidden options", () => {
    const html = renderToStaticMarkup(
      <MultiSelectField label="Subjects" options={options} value={["maths"]} error="Choose two subjects" />
    );
    const trigger = html.match(/<button\b[^>]*>/)?.[0] ?? "";
    const names = trigger.match(/aria-labelledby="([^"]+)"/)?.[1].split(" ") ?? [];
    expect(names).toHaveLength(2);
    expect(html).toMatch(new RegExp(`<label[^>]*id="${names[0]}"[^>]*>Subjects`));
    expect(html).toMatch(new RegExp(`<span[^>]*id="${names[1]}"[^>]*>Mathematics</span>`));
    const optionsId = trigger.match(/aria-controls="([^"]+)"/)?.[1];
    expect(optionsId).toBeTruthy();
    expect(html).toMatch(new RegExp(`<div[^>]*id="${optionsId}"[^>]*hidden=""[^>]*role="group"`));
    const errorId = trigger.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(errorId).toBeTruthy();
    expect(html).toMatch(new RegExp(`<p[^>]*id="${errorId}"[^>]*role="alert"`));
    expect(trigger).toContain('type="button"');
    expect(trigger).toContain('aria-expanded="false"');
    const checkboxes = html.match(/<input\b[^>]*>/g) ?? [];
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toContain('checked=""');
    expect(checkboxes[1]).not.toContain('checked=""');
  });

  it("provides a fallback name when no visible label is supplied", () => {
    const html = renderToStaticMarkup(<MultiSelectField options={options} placeholder="Choose subjects" />);
    const nameId = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(nameId).toBeTruthy();
    expect(html).toMatch(new RegExp(`<span[^>]*id="${nameId}"[^>]*>Choose subjects</span>`));
    expect(html).toContain('aria-label="Choose subjects"');
  });

  it("disables every native action, not only its visual trigger", () => {
    const html = renderToStaticMarkup(<MultiSelectField label="Subjects" options={options} disabled />);
    const controls = html.match(/<(?:button|input)\b[^>]*>/g) ?? [];
    expect(controls).toHaveLength(3);
    controls.forEach((control) => expect(control).toContain('disabled=""'));
    expect(html).toContain('hidden=""');
  });

  it("avoids duplicate IDs across multiple instances", () => {
    const html = renderToStaticMarkup(<><MultiSelectField label="Subjects" options={options} /><MultiSelectField label="Topics" options={options} /></>);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("native choice-card semantics", () => {
  it("keeps radio choices in one named group with a single selected value", () => {
    const html = renderToStaticMarkup(
      <>
        <SingleChoiceOption label="Mathematics" name="subject" value="maths" checked onChange={() => {}} />
        <SingleChoiceOption label="English" name="subject" value="english" checked={false} onChange={() => {}} />
      </>
    );
    const radios = html.match(/<input\b[^>]*>/g) ?? [];
    expect(radios).toHaveLength(2);
    radios.forEach((radio) => {
      expect(radio).toContain('type="radio"');
      expect(radio).toContain('name="subject"');
      expect(radio).toContain('class="sr-only"');
      expect(radio).not.toContain('tabindex="-1"');
    });
    expect(radios[0]).toContain('checked=""');
    expect(radios[1]).not.toContain('checked=""');
  });

  it.each([true, false])("exposes checkbox selection natively when checked is %s", (checked) => {
    const html = renderToStaticMarkup(<MultiSelectOptionCard label="Mathematics" value="maths" checked={checked} />);
    const checkbox = html.match(/<input\b[^>]*>/)?.[0];
    expect(checkbox).toContain('type="checkbox"');
    expect(checkbox?.includes('checked=""')).toBe(checked);
    expect(checkbox).toContain('value="maths"');
    expect(checkbox).toContain('class="sr-only"');
    expect(html).toContain("Mathematics");
  });
});
