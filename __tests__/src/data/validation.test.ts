import { describe, expect, it } from '@jest/globals';
import {
  assertNonEmptyString,
  assertMaxLength,
  assertHexColor,
  assertOneOf,
  assertIsoDate,
  assertIsoDateTime,
  assertTimeOfDay,
  assertDaysOfWeek,
  assertIntegerInRange,
  assertNumberInRange,
  isValidEmail,
  assertValidEmail,
  VALID_CADENCES,
} from '@/data/validation';

describe('validation', () => {
  describe('assertNonEmptyString', () => {
    it('accepts non-empty strings', () => {
      expect(() => assertNonEmptyString('hello', 'field')).not.toThrow();
      expect(() => assertNonEmptyString('  spaces  ', 'field')).not.toThrow();
    });

    it('rejects empty strings', () => {
      expect(() => assertNonEmptyString('', 'field')).toThrow('field is required');
      expect(() => assertNonEmptyString('   ', 'field')).toThrow('field is required');
    });

    it('rejects non-string values', () => {
      expect(() => assertNonEmptyString(null, 'field')).toThrow('field is required');
      expect(() => assertNonEmptyString(undefined, 'field')).toThrow('field is required');
      expect(() => assertNonEmptyString(123, 'field')).toThrow('field is required');
    });
  });

  describe('assertMaxLength', () => {
    it('accepts strings within max length', () => {
      expect(() => assertMaxLength('hello', 10, 'field')).not.toThrow();
      expect(() => assertMaxLength('exact', 5, 'field')).not.toThrow();
      expect(() => assertMaxLength('', 5, 'field')).not.toThrow();
    });

    it('rejects strings exceeding max length', () => {
      expect(() => assertMaxLength('too long', 5, 'field')).toThrow(
        'field must be 5 characters or less',
      );
      expect(() => assertMaxLength('123456', 5, 'field')).toThrow(
        'field must be 5 characters or less',
      );
    });
  });

  describe('assertHexColor', () => {
    it('accepts valid hex colors', () => {
      expect(() => assertHexColor('#ffffff', 'color')).not.toThrow();
      expect(() => assertHexColor('#000000', 'color')).not.toThrow();
      expect(() => assertHexColor('#60a5fa', 'color')).not.toThrow();
      expect(() => assertHexColor('#60A5FA', 'color')).not.toThrow();
      expect(() => assertHexColor('#ABC123', 'color')).not.toThrow();
    });

    it('rejects invalid hex colors', () => {
      expect(() => assertHexColor('#fff', 'color')).toThrow(
        'color must be a valid hex code (e.g., #60a5fa)',
      );
      expect(() => assertHexColor('ffffff', 'color')).toThrow(
        'color must be a valid hex code (e.g., #60a5fa)',
      );
      expect(() => assertHexColor('#gggggg', 'color')).toThrow(
        'color must be a valid hex code (e.g., #60a5fa)',
      );
      expect(() => assertHexColor('#12345', 'color')).toThrow(
        'color must be a valid hex code (e.g., #60a5fa)',
      );
      expect(() => assertHexColor('#1234567', 'color')).toThrow(
        'color must be a valid hex code (e.g., #60a5fa)',
      );
    });
  });

  describe('assertOneOf', () => {
    it('accepts values in the allowed list', () => {
      expect(() => assertOneOf('daily', VALID_CADENCES, 'cadence')).not.toThrow();
      expect(() => assertOneOf('weekly', VALID_CADENCES, 'cadence')).not.toThrow();
      expect(() => assertOneOf('monthly', VALID_CADENCES, 'cadence')).not.toThrow();
    });

    it('rejects values not in the allowed list', () => {
      expect(() => assertOneOf('yearly', VALID_CADENCES, 'cadence')).toThrow(
        'cadence must be one of: daily, weekly, monthly',
      );
      expect(() => assertOneOf('invalid', VALID_CADENCES, 'cadence')).toThrow(
        'cadence must be one of: daily, weekly, monthly',
      );
    });
  });

  describe('assertIsoDate', () => {
    it('accepts valid ISO dates', () => {
      expect(() => assertIsoDate('2024-01-01', 'date')).not.toThrow();
      expect(() => assertIsoDate('2024-12-31', 'date')).not.toThrow();
      expect(() => assertIsoDate('2024-02-29', 'date')).not.toThrow(); // Leap year
    });

    it('rejects invalid ISO date formats', () => {
      expect(() => assertIsoDate('2024-1-1', 'date')).toThrow('date must be in YYYY-MM-DD format');
      expect(() => assertIsoDate('01-01-2024', 'date')).toThrow(
        'date must be in YYYY-MM-DD format',
      );
      expect(() => assertIsoDate('2024/01/01', 'date')).toThrow(
        'date must be in YYYY-MM-DD format',
      );
    });

    it('rejects invalid dates', () => {
      expect(() => assertIsoDate('2024-13-01', 'date')).toThrow('date must be a valid date');
      expect(() => assertIsoDate('2024-02-30', 'date')).toThrow('date must be a valid date');
      expect(() => assertIsoDate('2023-02-29', 'date')).toThrow('date must be a valid date'); // Not a leap year
    });

    it('rejects empty strings', () => {
      expect(() => assertIsoDate('', 'date')).toThrow('date is required');
    });
  });

  describe('assertIsoDateTime', () => {
    it('accepts valid ISO datetime strings', () => {
      expect(() => assertIsoDateTime('2024-01-01T00:00:00Z', 'datetime')).not.toThrow();
      expect(() => assertIsoDateTime('2024-12-31T23:59:59.999Z', 'datetime')).not.toThrow();
      expect(() => assertIsoDateTime('2024-06-15T12:30:45+00:00', 'datetime')).not.toThrow();
    });

    it('rejects invalid ISO datetime strings', () => {
      expect(() => assertIsoDateTime('invalid', 'datetime')).toThrow(
        'datetime must be a valid ISO 8601 timestamp',
      );
      expect(() => assertIsoDateTime('2024-01-01', 'datetime')).not.toThrow(); // Date-only is parseable
    });

    it('rejects empty strings', () => {
      expect(() => assertIsoDateTime('', 'datetime')).toThrow('datetime is required');
    });
  });

  describe('assertTimeOfDay', () => {
    it('accepts valid 24-hour time formats', () => {
      expect(() => assertTimeOfDay('00:00', 'time')).not.toThrow();
      expect(() => assertTimeOfDay('12:30', 'time')).not.toThrow();
      expect(() => assertTimeOfDay('23:59', 'time')).not.toThrow();
      expect(() => assertTimeOfDay('09:15', 'time')).not.toThrow();
    });

    it('rejects invalid time formats', () => {
      expect(() => assertTimeOfDay('24:00', 'time')).toThrow(
        'time must use HH:MM (24-hour) format',
      );
      expect(() => assertTimeOfDay('12:60', 'time')).toThrow(
        'time must use HH:MM (24-hour) format',
      );
      expect(() => assertTimeOfDay('9:15', 'time')).toThrow('time must use HH:MM (24-hour) format');
      expect(() => assertTimeOfDay('12:30:00', 'time')).toThrow(
        'time must use HH:MM (24-hour) format',
      );
      expect(() => assertTimeOfDay('12:30 PM', 'time')).toThrow(
        'time must use HH:MM (24-hour) format',
      );
    });

    it('rejects empty strings', () => {
      expect(() => assertTimeOfDay('', 'time')).toThrow('time is required');
    });
  });

  describe('assertDaysOfWeek', () => {
    it('accepts valid days of week strings', () => {
      expect(() => assertDaysOfWeek('0', 'days')).not.toThrow();
      expect(() => assertDaysOfWeek('6', 'days')).not.toThrow();
      expect(() => assertDaysOfWeek('0,1,2,3,4,5,6', 'days')).not.toThrow();
      expect(() => assertDaysOfWeek('1,3,5', 'days')).not.toThrow();
    });

    it('rejects invalid days of week strings', () => {
      expect(() => assertDaysOfWeek('7', 'days')).toThrow(
        'days must be comma-separated digits (0-6)',
      );
      expect(() => assertDaysOfWeek('-1', 'days')).toThrow(
        'days must be comma-separated digits (0-6)',
      );
      expect(() => assertDaysOfWeek('Mon,Tue', 'days')).toThrow(
        'days must be comma-separated digits (0-6)',
      );
      expect(() => assertDaysOfWeek('0, 1', 'days')).toThrow(
        'days must be comma-separated digits (0-6)',
      ); // Spaces not allowed
    });

    it('rejects empty strings', () => {
      expect(() => assertDaysOfWeek('', 'days')).toThrow('days is required');
    });
  });

  describe('assertIntegerInRange', () => {
    it('accepts integers within range', () => {
      expect(() => assertIntegerInRange(5, 0, 10, 'value')).not.toThrow();
      expect(() => assertIntegerInRange(0, 0, 10, 'value')).not.toThrow();
      expect(() => assertIntegerInRange(10, 0, 10, 'value')).not.toThrow();
      expect(() => assertIntegerInRange(-5, -10, 0, 'value')).not.toThrow();
    });

    it('rejects non-integers', () => {
      expect(() => assertIntegerInRange(5.5, 0, 10, 'value')).toThrow('value must be an integer');
      expect(() => assertIntegerInRange(NaN, 0, 10, 'value')).toThrow('value must be an integer');
    });

    it('rejects integers outside range', () => {
      expect(() => assertIntegerInRange(-1, 0, 10, 'value')).toThrow(
        'value must be between 0 and 10',
      );
      expect(() => assertIntegerInRange(11, 0, 10, 'value')).toThrow(
        'value must be between 0 and 10',
      );
    });
  });

  describe('assertNumberInRange', () => {
    it('accepts numbers within range', () => {
      expect(() => assertNumberInRange(5, 0, 10, 'value')).not.toThrow();
      expect(() => assertNumberInRange(5.5, 0, 10, 'value')).not.toThrow();
      expect(() => assertNumberInRange(0, 0, 10, 'value')).not.toThrow();
      expect(() => assertNumberInRange(10, 0, 10, 'value')).not.toThrow();
      expect(() => assertNumberInRange(-5.5, -10, 0, 'value')).not.toThrow();
    });

    it('rejects non-finite numbers', () => {
      expect(() => assertNumberInRange(NaN, 0, 10, 'value')).toThrow('value must be a number');
      expect(() => assertNumberInRange(Infinity, 0, 10, 'value')).toThrow('value must be a number');
      expect(() => assertNumberInRange(-Infinity, 0, 10, 'value')).toThrow(
        'value must be a number',
      );
    });

    it('rejects numbers outside range', () => {
      expect(() => assertNumberInRange(-0.1, 0, 10, 'value')).toThrow(
        'value must be between 0 and 10',
      );
      expect(() => assertNumberInRange(10.1, 0, 10, 'value')).toThrow(
        'value must be between 0 and 10',
      );
    });
  });

  describe('isValidEmail', () => {
    it('returns true for valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('user123@test-domain.com')).toBe(true);
      expect(isValidEmail('a@b.c')).toBe(true);
    });

    it('returns false for invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('user@example')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
    });
  });

  describe('assertValidEmail', () => {
    it('accepts valid email addresses', () => {
      expect(() => assertValidEmail('user@example.com', 'email')).not.toThrow();
      expect(() => assertValidEmail('test.user@example.com', 'email')).not.toThrow();
      expect(() => assertValidEmail('user+tag@example.co.uk', 'email')).not.toThrow();
    });

    it('rejects invalid email addresses', () => {
      expect(() => assertValidEmail('invalid', 'email')).toThrow(
        'email must be a valid email address',
      );
      expect(() => assertValidEmail('invalid@', 'email')).toThrow(
        'email must be a valid email address',
      );
      expect(() => assertValidEmail('@example.com', 'email')).toThrow(
        'email must be a valid email address',
      );
      expect(() => assertValidEmail('user@example', 'email')).toThrow(
        'email must be a valid email address',
      );
    });

    it('rejects empty strings', () => {
      expect(() => assertValidEmail('', 'email')).toThrow('email is required');
    });
  });

  describe('VALID_CADENCES', () => {
    it('contains expected cadence values', () => {
      expect(VALID_CADENCES).toEqual(['daily', 'weekly', 'monthly']);
    });
  });
});
