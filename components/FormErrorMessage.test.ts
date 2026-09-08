import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FormErrorMessage from "./FormErrorMessage";

describe("FormErrorMessage", () => {
  it("renders an atomic alert for assistive technology", () => {
    const html = renderToStaticMarkup(
      createElement(FormErrorMessage, {
        id: "login-error",
        message: "Login failed.",
      })
    );

    expect(html).toContain('id="login-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain("Login failed.");
  });

  it("renders nothing when there is no error", () => {
    const html = renderToStaticMarkup(
      createElement(FormErrorMessage, { id: "login-error", message: "" })
    );

    expect(html).toBe("");
  });
});
