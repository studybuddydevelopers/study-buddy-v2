import { describe, expect, it } from "vitest";
import { notificationContent } from "./notifications";
import { decodeNotificationCursor, encodeNotificationCursor } from "./notification-input";

const review = { id: "review/1", status: "UPHELD", paperTitleSnapshot: "Maths", questionReferenceSnapshot: "Part I · Q1", originalScore: 4, revisedScore: null, maxScore: 8 };
describe("notification content and cursors", () => {
  it("describes upheld decisions without claiming the mark increased", () => {
    expect(notificationContent(review)).toEqual({
      title: "Your marking review is complete",
      description: "Maths · Part I · Q1. Support confirmed your original mark of 4 out of 8.",
      href: "/marking-reviews/review%2F1",
    });
  });
  it("also describes downward adjustments honestly", () => {
    expect(notificationContent({ ...review, status: "MARK_ADJUSTED", revisedScore: 2 }).description).toContain("from 4 to 2 out of 8");
  });
  it("round trips the date and tie-breaking id", () => {
    const cursor = { id: "4d84f1a0-c7be-4f56-80a0-f623b559b3e1", createdAt: new Date("2026-10-25T00:00:00.000Z") };
    expect(decodeNotificationCursor(encodeNotificationCursor(cursor))).toEqual(cursor);
  });
  it.each(["", "not-json", "x".repeat(513), Buffer.from('{"id":"fake","createdAt":"invalid"}').toString("base64url")])("rejects invalid cursor %s", value => {
    expect(decodeNotificationCursor(value)).toBeNull();
  });
});
