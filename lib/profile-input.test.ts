import { describe, expect, it } from "vitest";
import { parseProfilePatch } from "./profile-input";

describe("parseProfilePatch", () => {
  it("normalises a complete editable profile", () => {
    expect(
      parseProfilePatch(
        {
          firstName: "  Ada ",
          middleNames: "  Nneka  ",
          lastNames: "  Okafor ",
          phoneNumber: " +234 801 234 5678 ",
          gradeLevel: "SS3",
          examYear: 2027,
          preferredSubjects: ["math-id", "biology-id", "math-id"],
        },
        2026
      )
    ).toEqual({
      ok: true,
      data: {
        firstName: "Ada",
        middleNames: "Nneka",
        lastNames: "Okafor",
        phoneNumber: "+234 801 234 5678",
        gradeLevel: "SS3",
        examYear: 2027,
        preferredSubjects: ["math-id", "biology-id"],
      },
    });
  });

  it("allows optional profile fields to be cleared", () => {
    expect(
      parseProfilePatch({ middleNames: "", gradeLevel: null, examYear: null })
    ).toEqual({
      ok: true,
      data: { middleNames: null, gradeLevel: null, examYear: null },
    });
  });

  it.each([
    [{ firstName: "   " }, "First name is required."],
    [{ phoneNumber: "abc" }, "Enter a valid phone number."],
    [
      { examYear: 2040 },
      "Exam year must be between 2025 and 2036.",
    ],
    [
      { preferredSubjects: [""] },
      "Preferred subjects must be a list of up to 12 valid subjects.",
    ],
    [
      { avatarUrl: "http://example.com/avatar.png" },
      "Avatar URL must be a secure URL or a local image path.",
    ],
  ])("rejects invalid profile values", (input, message) => {
    expect(parseProfilePatch(input as Record<string, unknown>, 2026)).toEqual({
      ok: false,
      message,
    });
  });

  it("rejects an empty patch", () => {
    expect(parseProfilePatch({})).toEqual({
      ok: false,
      message: "No profile fields were provided.",
    });
  });
});
