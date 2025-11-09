const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS_OF_WEEK_REGEX = /^(?:[0-6](?:,[0-6])*)$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const VALID_CADENCES = ['daily', 'weekly', 'monthly'] as const;

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertNonEmptyString(value: unknown, field: string) {
  ensure(typeof value === 'string' && value.trim().length > 0, `${field} is required`);
}

export function assertMaxLength(value: string, max: number, field: string) {
  ensure(value.length <= max, `${field} must be ${max} characters or less`);
}

export function assertHexColor(value: string, field: string) {
  ensure(HEX_COLOR_REGEX.test(value), `${field} must be a valid hex code (e.g., #60a5fa)`);
}

export function assertOneOf(value: string, allowed: readonly string[], field: string) {
  ensure(allowed.includes(value), `${field} must be one of: ${allowed.join(', ')}`);
}

export function assertIsoDate(value: string, field: string) {
  assertNonEmptyString(value, field);
  ensure(ISO_DATE_REGEX.test(value), `${field} must be in YYYY-MM-DD format`);
  const parsed = new Date(value);
  ensure(
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value,
    `${field} must be a valid date`,
  );
}

export function assertIsoDateTime(value: string, field: string) {
  assertNonEmptyString(value, field);
  const parsed = new Date(value);
  ensure(!Number.isNaN(parsed.getTime()), `${field} must be a valid ISO 8601 timestamp`);
}

export function assertTimeOfDay(value: string, field: string) {
  assertNonEmptyString(value, field);
  ensure(TIME_24H_REGEX.test(value), `${field} must use HH:MM (24-hour) format`);
}

export function assertDaysOfWeek(value: string, field: string) {
  assertNonEmptyString(value, field);
  ensure(DAYS_OF_WEEK_REGEX.test(value), `${field} must be comma-separated digits (0-6)`);
}

export function assertIntegerInRange(value: number, min: number, max: number, field: string) {
  ensure(Number.isInteger(value), `${field} must be an integer`);
  ensure(value >= min && value <= max, `${field} must be between ${min} and ${max}`);
}

export function assertNumberInRange(value: number, min: number, max: number, field: string) {
  ensure(Number.isFinite(value), `${field} must be a number`);
  ensure(value >= min && value <= max, `${field} must be between ${min} and ${max}`);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function assertValidEmail(value: string, field: string) {
  assertNonEmptyString(value, field);
  ensure(EMAIL_REGEX.test(value), `${field} must be a valid email address`);
}
