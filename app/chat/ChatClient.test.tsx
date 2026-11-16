import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatClient from "./ChatClient";

// Initial-render semantics only. SSR does not execute chat loading effects;
// dialog focus/escape and live response announcements still need browser tests.
describe("chat initial accessibility", () => {
  const fetch = vi.fn(() => { throw new Error("Chat markup tests must not contact a service"); });
  beforeEach(() => { fetch.mockClear(); vi.stubGlobal("fetch", fetch); });
  afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });

  it("gives the composer a name and instructions while chats are loading", () => {
    const html = renderToStaticMarkup(<ChatClient />);
    const composer = html.match(/<textarea\b[^>]*>/)?.[0];
    expect(composer).toContain('aria-label="Message to AI tutor"');
    expect(composer).toContain('aria-describedby="chat-composer-help"');
    expect(composer).toContain('disabled=""');
    expect(composer).toContain('maxLength="4000"');
    expect(html).toMatch(/<span\b[^>]*id="chat-composer-help"[^>]*>Press Enter to send, or Shift\+Enter for a new line\. Maximum 4000 characters\.<\/span>/);
  });

  it("keeps the transcript a named keyboard-reachable scroll region", () => {
    const html = renderToStaticMarkup(<ChatClient />);
    const transcript = html.match(/<div\b[^>]*aria-label="Chat messages"[^>]*>/)?.[0];
    expect(transcript).toContain('role="region"');
    expect(transcript).toContain('tabindex="0"');
  });

  it("does not introduce another main or an unsolicited modal on entry", () => {
    const html = renderToStaticMarkup(<ChatClient />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toContain("<main");
    expect(html).not.toContain("<dialog");
  });
});
