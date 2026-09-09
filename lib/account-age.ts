export const MINIMUM_ACCOUNT_AGE = 13;
export const INDEPENDENT_ACCOUNT_AGE = 18;
export const CHILD_PRIVACY_NOTICE_VERSION = "2026-09-09";
export const TERMS_VERSION = "2026-09-09";

export type AgeBand = "TOO_YOUNG" | "MINOR" | "ADULT";

export type ParsedBirthDate =
  | { ok: true; date: Date; age: number; ageBand: AgeBand }
  | { ok: false; message: string };

export function parseBirthDate(
  value: unknown,
  now = new Date()
): ParsedBirthDate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, message: "Enter a valid date of birth." };
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, message: "Enter a valid date of birth." };
  }

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  if (date > today) {
    return { ok: false, message: "Date of birth cannot be in the future." };
  }

  const age = ageOnDate(date, today);
  if (age > 120) {
    return { ok: false, message: "Enter a valid date of birth." };
  }

  return {
    ok: true,
    date,
    age,
    ageBand:
      age < MINIMUM_ACCOUNT_AGE
        ? "TOO_YOUNG"
        : age < INDEPENDENT_ACCOUNT_AGE
          ? "MINOR"
          : "ADULT",
  };
}

export function ageOnDate(dateOfBirth: Date, onDate = new Date()) {
  let age = onDate.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday =
    onDate.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (onDate.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      onDate.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function latestAllowedBirthDate(now = new Date()) {
  return formatDateInput(
    new Date(
      Date.UTC(
        now.getUTCFullYear() - MINIMUM_ACCOUNT_AGE,
        now.getUTCMonth(),
        now.getUTCDate()
      )
    )
  );
}

function formatDateInput(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
