export interface ProfileDraftValidationInput {
  displayName: string;
  website: string;
  linkedInUrl: string;
  birthday: string;
  yearsOfTradeExperience: string;
}

export function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseBirthday(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day);
    const valid =
      parsed.getFullYear() === year &&
      parsed.getMonth() === month &&
      parsed.getDate() === day;
    return valid ? parsed : undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function isValidProfileUrl(value: string): boolean {
  if (!value.trim()) return true;
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}([/?#].*)?$/i.test(value.trim());
}

export function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function validateProfileDraft(
  input: ProfileDraftValidationInput,
  now = new Date(),
): string | null {
  if (!input.displayName.trim()) {
    return "Display name is required.";
  }
  if (!isValidProfileUrl(input.website)) {
    return "Enter a valid website URL.";
  }
  if (!isValidProfileUrl(input.linkedInUrl)) {
    return "Enter a valid LinkedIn URL.";
  }

  const birthday = input.birthday.trim();
  const birthdayDate = parseBirthday(birthday);
  if (birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || !birthdayDate)) {
    return "Birthday must be a valid date.";
  }
  if (birthdayDate && birthdayDate > now) {
    return "Birthday cannot be in the future.";
  }

  const tradeYears = input.yearsOfTradeExperience.trim();
  if (tradeYears) {
    const parsed = Number(tradeYears);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 80) {
      return "Years of experience must be a whole number between 0 and 80.";
    }
  }

  return null;
}
