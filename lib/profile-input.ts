export const PROFILE_GRADE_OPTIONS = [
  "JSS3",
  "SS1",
  "SS2",
  "SS3",
  "Graduate / resitting",
] as const;

const PHONE_PATTERN = /^[0-9+\-() ]{6,32}$/;
const PROFILE_FIELDS = [
  "firstName",
  "middleNames",
  "lastNames",
  "phoneNumber",
  "gradeLevel",
  "examYear",
  "preferredSubjects",
  "avatarUrl",
] as const;

export interface ProfilePatch {
  firstName?: string;
  middleNames?: string | null;
  lastNames?: string;
  phoneNumber?: string;
  gradeLevel?: string | null;
  examYear?: number | null;
  preferredSubjects?: string[];
  avatarUrl?: string | null;
}

type ProfilePatchResult =
  | { ok: true; data: ProfilePatch }
  | { ok: false; message: string };

function hasOwn(input: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function requiredText(
  input: Record<string, unknown>,
  key: "firstName" | "lastNames" | "phoneNumber",
  label: string,
  maxLength: number
): { ok: true; value?: string } | { ok: false; message: string } {
  if (!hasOwn(input, key)) return { ok: true };
  const rawValue = input[key];
  if (typeof rawValue !== "string") {
    return { ok: false, message: `${label} must be text.` };
  }

  const value = rawValue.trim();
  if (!value) return { ok: false, message: `${label} is required.` };
  if (value.length > maxLength) {
    return {
      ok: false,
      message: `${label} must be ${maxLength} characters or fewer.`,
    };
  }
  return { ok: true, value };
}

function nullableText(
  input: Record<string, unknown>,
  key: "middleNames" | "gradeLevel" | "avatarUrl",
  label: string,
  maxLength: number
): { ok: true; value?: string | null } | { ok: false; message: string } {
  if (!hasOwn(input, key)) return { ok: true };
  const rawValue = input[key];
  if (rawValue === null || rawValue === "") {
    return { ok: true, value: null };
  }
  if (typeof rawValue !== "string") {
    return { ok: false, message: `${label} must be text or null.` };
  }

  const value = rawValue.trim();
  if (!value) return { ok: true, value: null };
  if (value.length > maxLength) {
    return {
      ok: false,
      message: `${label} must be ${maxLength} characters or fewer.`,
    };
  }
  return { ok: true, value };
}

export function parseProfilePatch(
  input: Record<string, unknown>,
  currentYear = new Date().getUTCFullYear()
): ProfilePatchResult {
  if (!PROFILE_FIELDS.some((field) => hasOwn(input, field))) {
    return { ok: false, message: "No profile fields were provided." };
  }

  const firstName = requiredText(input, "firstName", "First name", 80);
  if (!firstName.ok) return firstName;
  const lastNames = requiredText(input, "lastNames", "Surname", 120);
  if (!lastNames.ok) return lastNames;
  const phoneNumber = requiredText(
    input,
    "phoneNumber",
    "Phone number",
    32
  );
  if (!phoneNumber.ok) return phoneNumber;
  if (phoneNumber.value && !PHONE_PATTERN.test(phoneNumber.value)) {
    return { ok: false, message: "Enter a valid phone number." };
  }

  const middleNames = nullableText(
    input,
    "middleNames",
    "Middle names",
    120
  );
  if (!middleNames.ok) return middleNames;
  const gradeLevel = nullableText(
    input,
    "gradeLevel",
    "School level",
    40
  );
  if (!gradeLevel.ok) return gradeLevel;
  const avatarUrl = nullableText(input, "avatarUrl", "Avatar URL", 2048);
  if (!avatarUrl.ok) return avatarUrl;
  if (
    avatarUrl.value &&
    !avatarUrl.value.startsWith("/") &&
    !avatarUrl.value.startsWith("https://")
  ) {
    return {
      ok: false,
      message: "Avatar URL must be a secure URL or a local image path.",
    };
  }

  let examYear: number | null | undefined;
  if (hasOwn(input, "examYear")) {
    if (input.examYear === null || input.examYear === "") {
      examYear = null;
    } else if (
      typeof input.examYear !== "number" ||
      !Number.isInteger(input.examYear) ||
      input.examYear < currentYear - 1 ||
      input.examYear > currentYear + 10
    ) {
      return {
        ok: false,
        message: `Exam year must be between ${currentYear - 1} and ${currentYear + 10}.`,
      };
    } else {
      examYear = input.examYear;
    }
  }

  let preferredSubjects: string[] | undefined;
  if (hasOwn(input, "preferredSubjects")) {
    if (
      !Array.isArray(input.preferredSubjects) ||
      input.preferredSubjects.length > 12 ||
      input.preferredSubjects.some(
        (value) =>
          typeof value !== "string" ||
          value.trim().length === 0 ||
          value.trim().length > 100
      )
    ) {
      return {
        ok: false,
        message: "Preferred subjects must be a list of up to 12 valid subjects.",
      };
    }
    preferredSubjects = [...new Set(input.preferredSubjects.map((value) => value.trim()))];
  }

  return {
    ok: true,
    data: {
      ...(firstName.value !== undefined ? { firstName: firstName.value } : {}),
      ...(middleNames.value !== undefined
        ? { middleNames: middleNames.value }
        : {}),
      ...(lastNames.value !== undefined ? { lastNames: lastNames.value } : {}),
      ...(phoneNumber.value !== undefined
        ? { phoneNumber: phoneNumber.value }
        : {}),
      ...(gradeLevel.value !== undefined
        ? { gradeLevel: gradeLevel.value }
        : {}),
      ...(examYear !== undefined ? { examYear } : {}),
      ...(preferredSubjects !== undefined ? { preferredSubjects } : {}),
      ...(avatarUrl.value !== undefined ? { avatarUrl: avatarUrl.value } : {}),
    },
  };
}
