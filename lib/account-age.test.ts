import { describe, expect, it } from "vitest";
import { ageOnDate, parseBirthDate } from "@/lib/account-age";

const NOW = new Date("2026-09-09T12:00:00.000Z");

describe("parseBirthDate", () => {
  it("rejects invalid dates", () => {
    expect(parseBirthDate("2010-02-30", NOW).ok).toBe(false);
    expect(parseBirthDate("not-a-date", NOW).ok).toBe(false);
  });

  it("classifies users below 13", () => {
    expect(parseBirthDate("2013-09-10", NOW)).toMatchObject({
      ok: true,
      age: 12,
      ageBand: "TOO_YOUNG",
    });
  });

  it("classifies ages 13 to 17 as minors", () => {
    expect(parseBirthDate("2013-09-09", NOW)).toMatchObject({
      ok: true,
      age: 13,
      ageBand: "MINOR",
    });
    expect(parseBirthDate("2008-09-10", NOW)).toMatchObject({
      ok: true,
      age: 17,
      ageBand: "MINOR",
    });
  });

  it("classifies age 18 and above as adults", () => {
    expect(parseBirthDate("2008-09-09", NOW)).toMatchObject({
      ok: true,
      age: 18,
      ageBand: "ADULT",
    });
  });
});

describe("ageOnDate", () => {
  it("handles a birthday boundary", () => {
    expect(ageOnDate(new Date("2000-09-10T00:00:00.000Z"), NOW)).toBe(25);
    expect(ageOnDate(new Date("2000-09-09T00:00:00.000Z"), NOW)).toBe(26);
  });
});
