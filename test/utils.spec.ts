import { StringUtils, DateUtils, NumberUtils } from '../src/utils';

describe('StringUtils', () => {
  describe('isString', () => {
    test('should return true for string values', () => {
      expect(StringUtils.isString('hello')).toBe(true);
      expect(StringUtils.isString('')).toBe(true);
      expect(StringUtils.isString('123')).toBe(true);
      expect(StringUtils.isString(new String('hello'))).toBe(true);
      expect(StringUtils.isString(new String(''))).toBe(true);
    });

    test('should return false for non-string values', () => {
      expect(StringUtils.isString(123)).toBe(false);
      expect(StringUtils.isString(null)).toBe(false);
      expect(StringUtils.isString(undefined)).toBe(false);
      expect(StringUtils.isString([])).toBe(false);
      expect(StringUtils.isString({})).toBe(false);
      expect(StringUtils.isString(true)).toBe(false);
      expect(StringUtils.isString(new Date())).toBe(false);
    });
  });

  describe('isEmpty', () => {
    test('should return true for empty or whitespace strings', () => {
      expect(StringUtils.isEmpty('')).toBe(true);
      expect(StringUtils.isEmpty('   ')).toBe(true);
      expect(StringUtils.isEmpty('\t')).toBe(true);
      expect(StringUtils.isEmpty('\n')).toBe(true);
      expect(StringUtils.isEmpty('  \t\n  ')).toBe(true);
    });

    test('should return true for falsy values', () => {
      expect(StringUtils.isEmpty(null)).toBe(true);
      expect(StringUtils.isEmpty(undefined)).toBe(true);
      expect(StringUtils.isEmpty(0)).toBe(true);
      expect(StringUtils.isEmpty(false)).toBe(true);
    });

    test('should return false for non-empty strings', () => {
      expect(StringUtils.isEmpty('hello')).toBe(false);
      expect(StringUtils.isEmpty('  text  ')).toBe(false);
      expect(StringUtils.isEmpty('0')).toBe(false);
      expect(StringUtils.isEmpty('false')).toBe(false);
    });

    test('should return false for non-string truthy values', () => {
      expect(StringUtils.isEmpty(123)).toBe(false);
      expect(StringUtils.isEmpty([])).toBe(false);
      expect(StringUtils.isEmpty({})).toBe(false);
      expect(StringUtils.isEmpty(new Date())).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    test('should return false for empty or whitespace strings', () => {
      expect(StringUtils.isNotEmpty('')).toBe(false);
      expect(StringUtils.isNotEmpty('   ')).toBe(false);
      expect(StringUtils.isNotEmpty('\t')).toBe(false);
      expect(StringUtils.isNotEmpty('\n')).toBe(false);
      expect(StringUtils.isNotEmpty('  \t\n  ')).toBe(false);
    });

    test('should return false for falsy values', () => {
      expect(StringUtils.isNotEmpty(null)).toBe(false);
      expect(StringUtils.isNotEmpty(undefined)).toBe(false);
      expect(StringUtils.isNotEmpty(0)).toBe(false);
      expect(StringUtils.isNotEmpty(false)).toBe(false);
    });

    test('should return true for non-empty strings', () => {
      expect(StringUtils.isNotEmpty('hello')).toBe(true);
      expect(StringUtils.isNotEmpty('  text  ')).toBe(true);
    });
  });

  describe('capitalize', () => {
    test('should capitalize the first letter of a string', () => {
      expect(StringUtils.capitalize('hello')).toBe('Hello');
      expect(StringUtils.capitalize('world')).toBe('World');
      expect(StringUtils.capitalize('javascript')).toBe('Javascript');
      expect(StringUtils.capitalize('a')).toBe('A');
      expect(StringUtils.capitalize('z')).toBe('Z');
    });

    test('should handle already capitalized strings', () => {
      expect(StringUtils.capitalize('Hello')).toBe('Hello');
      expect(StringUtils.capitalize('WORLD')).toBe('WORLD');
    });

    test('should handle edge cases', () => {
      expect(StringUtils.capitalize('')).toBe('');
      expect(StringUtils.capitalize('123abc')).toBe('123abc');
      expect(StringUtils.capitalize('!hello')).toBe('!hello');
      expect(StringUtils.capitalize(' hello')).toBe(' hello');
    });
  });

  describe('join', () => {
    test('should join arrays with default comma separator', () => {
      expect(StringUtils.join(['a', 'b', 'c'])).toBe('a,b,c');
      expect(StringUtils.join(['hello', 'world'])).toBe('hello,world');
    });

    test('should join arrays with custom separator', () => {
      expect(StringUtils.join(['a', 'b', 'c'], ' | ')).toBe('a | b | c');
      expect(StringUtils.join(['hello', 'world'], '-')).toBe('hello-world');
      expect(StringUtils.join(['1', '2', '3'], '')).toBe('123');
    });

    test('should handle empty arrays', () => {
      expect(StringUtils.join([])).toBe('');
      expect(StringUtils.join([], ' | ')).toBe('');
    });

    test('should handle single element arrays', () => {
      expect(StringUtils.join(['single'])).toBe('single');
      expect(StringUtils.join(['single'], ' | ')).toBe('single');
    });

    test('should handle undefined values', () => {
      expect(StringUtils.join(undefined)).toBe(undefined);
      expect(StringUtils.join(undefined, ' | ')).toBe(undefined);
    });
  });
});

describe('NumberUtils', () => {
  describe('isNumber', () => {
    test('should return true for number values', () => {
      expect(NumberUtils.isNumber(123)).toBe(true);
      expect(NumberUtils.isNumber(0)).toBe(true);
      expect(NumberUtils.isNumber(-123)).toBe(true);
      expect(NumberUtils.isNumber(3.14)).toBe(true);
      expect(NumberUtils.isNumber(-3.14)).toBe(true);
      expect(NumberUtils.isNumber(Infinity)).toBe(true);
      expect(NumberUtils.isNumber(-Infinity)).toBe(true);
      expect(NumberUtils.isNumber(Number.MAX_VALUE)).toBe(true);
      expect(NumberUtils.isNumber(Number.MIN_VALUE)).toBe(true);
      expect(NumberUtils.isNumber(new Number(123))).toBe(true);
      expect(NumberUtils.isNumber(new Number(0))).toBe(true);
    });

    test('should return false for NaN', () => {
      expect(NumberUtils.isNumber(NaN)).toBe(false);
      expect(NumberUtils.isNumber(Number.NaN)).toBe(false);
    });

    test('should return false for non-number values', () => {
      expect(NumberUtils.isNumber('123')).toBe(false);
      expect(NumberUtils.isNumber('0')).toBe(false);
      expect(NumberUtils.isNumber(null)).toBe(false);
      expect(NumberUtils.isNumber(undefined)).toBe(false);
      expect(NumberUtils.isNumber([])).toBe(false);
      expect(NumberUtils.isNumber({})).toBe(false);
      expect(NumberUtils.isNumber(true)).toBe(false);
      expect(NumberUtils.isNumber(false)).toBe(false);
      expect(NumberUtils.isNumber(new Date())).toBe(false);
    });
  });

  describe('isPositive', () => {
    test('should return true for positive numbers', () => {
      expect(NumberUtils.isPositive(1)).toBe(true);
      expect(NumberUtils.isPositive(123)).toBe(true);
      expect(NumberUtils.isPositive(0.1)).toBe(true);
      expect(NumberUtils.isPositive(3.14)).toBe(true);
      expect(NumberUtils.isPositive(Number.MAX_VALUE)).toBe(true);
      expect(NumberUtils.isPositive(Number.MIN_VALUE)).toBe(true);
      expect(NumberUtils.isPositive(Infinity)).toBe(true);
    });

    test('should return false for zero', () => {
      expect(NumberUtils.isPositive(0)).toBe(false);
      expect(NumberUtils.isPositive(-0)).toBe(false);
    });

    test('should return false for negative numbers', () => {
      expect(NumberUtils.isPositive(-1)).toBe(false);
      expect(NumberUtils.isPositive(-123)).toBe(false);
      expect(NumberUtils.isPositive(-0.1)).toBe(false);
      expect(NumberUtils.isPositive(-3.14)).toBe(false);
      expect(NumberUtils.isPositive(-Infinity)).toBe(false);
    });

    test('should return false for non-number values', () => {
      expect(NumberUtils.isPositive('123')).toBe(false);
      expect(NumberUtils.isPositive(null)).toBe(false);
      expect(NumberUtils.isPositive(undefined)).toBe(false);
      expect(NumberUtils.isPositive([])).toBe(false);
      expect(NumberUtils.isPositive({})).toBe(false);
      expect(NumberUtils.isPositive(true)).toBe(false);
      expect(NumberUtils.isPositive(NaN)).toBe(false);
    });
  });

  describe('isBetween', () => {
    test('should return true for values within range (inclusive)', () => {
      expect(NumberUtils.isBetween(5, 0, 10)).toBe(true);
      expect(NumberUtils.isBetween(0, 0, 10)).toBe(true); // Min boundary
      expect(NumberUtils.isBetween(10, 0, 10)).toBe(true); // Max boundary
      expect(NumberUtils.isBetween(3.5, 0, 10)).toBe(true);
      expect(NumberUtils.isBetween(-5, -10, 0)).toBe(true);
      expect(NumberUtils.isBetween(-10, -10, 0)).toBe(true); // Min boundary
      expect(NumberUtils.isBetween(0, -10, 0)).toBe(true); // Max boundary
      expect(NumberUtils.isBetween(0, -5, 5)).toBe(true);
    });

    test('should return false for values outside range', () => {
      expect(NumberUtils.isBetween(-1, 0, 10)).toBe(false);
      expect(NumberUtils.isBetween(11, 0, 10)).toBe(false);
      expect(NumberUtils.isBetween(100, 0, 10)).toBe(false);
      expect(NumberUtils.isBetween(-100, 0, 10)).toBe(false);
      expect(NumberUtils.isBetween(1, -10, 0)).toBe(false);
      expect(NumberUtils.isBetween(-11, -10, 0)).toBe(false);
    });

    test('should handle equal min and max', () => {
      expect(NumberUtils.isBetween(5, 5, 5)).toBe(true);
      expect(NumberUtils.isBetween(4, 5, 5)).toBe(false);
      expect(NumberUtils.isBetween(6, 5, 5)).toBe(false);
    });

    test('should return false for non-number values', () => {
      expect(NumberUtils.isBetween('5', 0, 10)).toBe(false);
      expect(NumberUtils.isBetween(null, 0, 10)).toBe(false);
      expect(NumberUtils.isBetween(undefined, 0, 10)).toBe(false);
      expect(NumberUtils.isBetween([], 0, 10)).toBe(false);
      expect(NumberUtils.isBetween({}, 0, 10)).toBe(false);
      expect(NumberUtils.isBetween(true, 0, 10)).toBe(false);
      expect(NumberUtils.isBetween(NaN, 0, 10)).toBe(false);
    });
  });

  describe('isArrayIndex', () => {
    test('should return true for valid array indices without length', () => {
      expect(NumberUtils.isArrayIndex(0)).toBe(true);
      expect(NumberUtils.isArrayIndex(1)).toBe(true);
      expect(NumberUtils.isArrayIndex(5)).toBe(true);
      expect(NumberUtils.isArrayIndex(100)).toBe(true);
    });

    test('should return false for negative values without length', () => {
      expect(NumberUtils.isArrayIndex(-1)).toBe(false);
      expect(NumberUtils.isArrayIndex(-5)).toBe(false);
      expect(NumberUtils.isArrayIndex(-100)).toBe(false);
    });

    test('should return true for valid indices within array length', () => {
      expect(NumberUtils.isArrayIndex(0, 5)).toBe(true); // First index
      expect(NumberUtils.isArrayIndex(4, 5)).toBe(true); // Last index
      expect(NumberUtils.isArrayIndex(2, 5)).toBe(true); // Middle index
      expect(NumberUtils.isArrayIndex(0, 1)).toBe(true); // Single element
    });

    test('should return false for indices outside array length', () => {
      expect(NumberUtils.isArrayIndex(5, 5)).toBe(false); // Equal to length
      expect(NumberUtils.isArrayIndex(6, 5)).toBe(false); // Greater than length
      expect(NumberUtils.isArrayIndex(-1, 5)).toBe(false); // Negative
      expect(NumberUtils.isArrayIndex(100, 5)).toBe(false);
    });

    test('should handle edge case with length 0', () => {
      // When length is 0, it's treated as "no length check" (falls through to >= 0 check)
      expect(NumberUtils.isArrayIndex(0, 0)).toBe(true);
      expect(NumberUtils.isArrayIndex(1, 0)).toBe(true);
      expect(NumberUtils.isArrayIndex(-1, 0)).toBe(false);
    });

    test('should round floating point values to integers', () => {
      expect(NumberUtils.isArrayIndex(0.1, 5)).toBe(true); // Rounds to 0
      expect(NumberUtils.isArrayIndex(0.9, 5)).toBe(true); // Rounds to 1
      expect(NumberUtils.isArrayIndex(2.5, 5)).toBe(true); // Rounds to 2 or 3
      expect(NumberUtils.isArrayIndex(4.4, 5)).toBe(true); // Rounds to 4
      expect(NumberUtils.isArrayIndex(4.9, 5)).toBe(false); // Rounds to 5 (out of bounds)
    });

    test('should return false for non-number values', () => {
      expect(NumberUtils.isArrayIndex('0')).toBe(false);
      expect(NumberUtils.isArrayIndex('5', 10)).toBe(false);
      expect(NumberUtils.isArrayIndex(null)).toBe(false);
      expect(NumberUtils.isArrayIndex(undefined)).toBe(false);
      expect(NumberUtils.isArrayIndex([])).toBe(false);
      expect(NumberUtils.isArrayIndex({})).toBe(false);
      expect(NumberUtils.isArrayIndex(true)).toBe(false);
      expect(NumberUtils.isArrayIndex(NaN)).toBe(false);
    });

    test('should handle Infinity', () => {
      expect(NumberUtils.isArrayIndex(Infinity)).toBe(true); // Without length, positive is OK
      expect(NumberUtils.isArrayIndex(Infinity, 10)).toBe(false); // With length, out of bounds
      expect(NumberUtils.isArrayIndex(-Infinity)).toBe(false);
      expect(NumberUtils.isArrayIndex(-Infinity, 10)).toBe(false);
    });
  });
});

describe('DateUtils', () => {
  describe('isDate', () => {
    test('should return true for Date objects', () => {
      expect(DateUtils.isDate(new Date())).toBe(true);
      expect(DateUtils.isDate(new Date('2022-01-01'))).toBe(true);
      expect(DateUtils.isDate(new Date(2022, 0, 1))).toBe(true);
    });

    test('should return true for valid date strings', () => {
      expect(DateUtils.isDate('2022-01-01')).toBe(true);
      expect(DateUtils.isDate('01/01/2022')).toBe(true);
      expect(DateUtils.isDate('Jan 1, 2022')).toBe(true);
      expect(DateUtils.isDate('2022-12-25T10:30:00Z')).toBe(true);
    });

    test('should return true for valid date numbers', () => {
      expect(DateUtils.isDate(0)).toBe(true);
      expect(DateUtils.isDate(Date.now())).toBe(true);
    });

    test('should return false for invalid date strings', () => {
      expect(DateUtils.isDate('invalid-date')).toBe(false);
      expect(DateUtils.isDate('2023-13-01')).toBe(false); // Invalid month
      expect(DateUtils.isDate('')).toBe(false);
    });

    test('should return false for non-date values', () => {
      expect(DateUtils.isDate(null)).toBe(false);
      expect(DateUtils.isDate(undefined)).toBe(false);
      expect(DateUtils.isDate({})).toBe(false);
      expect(DateUtils.isDate([])).toBe(false);
      expect(DateUtils.isDate(true)).toBe(false);
      expect(DateUtils.isDate(NaN)).toBe(false);
    });
  });

  describe('toDate', () => {
    test('should convert Date objects to Date', () => {
      const date = new Date('2023-01-01');
      expect(DateUtils.toDate(date)).toEqual(date);
    });

    test('should convert date strings to Date', () => {
      expect(DateUtils.toDate('2022-01-01')).toEqual(new Date('2022-01-01'));
      expect(DateUtils.toDate('Jan 1, 2022')).toEqual(new Date('Jan 1, 2022'));
    });

    test('should convert timestamps to Date', () => {
      const timestamp = 1672531200000; // Jan 1, 2023
      expect(DateUtils.toDate(timestamp)).toEqual(new Date(timestamp));
      expect(DateUtils.toDate(new Date(timestamp))).toEqual(new Date(timestamp));
    });

    test('should return undefined for invalid values', () => {
      expect(DateUtils.toDate('invalid-date')).toBe(undefined);
      expect(DateUtils.toDate(null)).toBe(undefined);
      expect(DateUtils.toDate(undefined)).toBe(undefined);
      expect(DateUtils.toDate({})).toBe(undefined);
      expect(DateUtils.toDate([])).toBe(undefined);
    });
  });

  describe('parse', () => {
    test('should parse start and end dates when both are provided', () => {
      const start = '2023-01-01';
      const end = '2023-12-31';
      const [startDate, endDate] = DateUtils.parse(start, end);

      expect(startDate).toEqual(new Date(start));
      expect(endDate).toEqual(new Date(end));
    });

    test('should use current date as start when start is undefined', () => {
      const now = Date.now();
      const [startDate, endDate] = DateUtils.parse(undefined);

      expect(startDate.getTime()).toBeGreaterThanOrEqual(now);
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    test('should calculate end date using default years offset when end is not provided', () => {
      const start = new Date('2023-01-01');
      const [startDate, endDate] = DateUtils.parse(start);

      expect(startDate).toEqual(start);
      expect(endDate.getFullYear()).toBe(start.getFullYear() + 10); // default 10 years
    });

    test('should calculate end date using custom offset options', () => {
      const start = new Date('2023-01-01');
      const [startDate, endDate] = DateUtils.parse(start, undefined, { years: 5, months: 6, days: 15 });

      expect(startDate).toEqual(start);
      expect(endDate.getFullYear()).toBe(2028); // 2023 + 5
      expect(endDate.getMonth()).toBe(6); // January (0) + 6 = July (6)
      expect(endDate.getDate()).toBe(16); // 1 + 15
    });

    test('should use start date as base for end date calculation when end is before start', () => {
      const start = new Date('2023-06-15');
      const end = new Date('2023-01-01'); // Before start
      const [startDate, endDate] = DateUtils.parse(start, end);

      expect(startDate).toEqual(start);
      expect(endDate.getFullYear()).toBe(start.getFullYear() + 10); // Calculated from start
    });

    test('should handle string and number inputs', () => {
      const start = '2023-01-01';
      const end = 1703980800000; // Dec 31, 2023 timestamp
      const [startDate, endDate] = DateUtils.parse(start, end);

      expect(startDate).toEqual(new Date(start));
      expect(endDate).toEqual(new Date(end));
    });
  });

  describe('isAfter', () => {
    test('should return true when date is after the comparison date', () => {
      const when = new Date('2023-01-01');
      expect(DateUtils.isAfter('2023-01-02', when)).toBe(true);
      expect(DateUtils.isAfter(new Date('2023-01-02'), when)).toBe(true);
      expect(DateUtils.isAfter(new Date('2023-01-01').getTime() + 1000, when)).toBe(true);
    });

    test('should return false when date is before the comparison date', () => {
      const when = new Date('2023-01-01');
      expect(DateUtils.isAfter('2022-12-31', when)).toBe(false);
      expect(DateUtils.isAfter(new Date('2022-12-31'), when)).toBe(false);
      expect(DateUtils.isAfter(new Date('2023-01-01').getTime() - 1000, when)).toBe(false);
    });

    test('should return false when dates are equal', () => {
      const when = new Date('2023-01-01');
      expect(DateUtils.isAfter('2023-01-01', when)).toBe(false);
      expect(DateUtils.isAfter(new Date('2023-01-01'), when)).toBe(false);
      expect(DateUtils.isAfter(when.getTime(), when)).toBe(false);
    });

    test('should handle different date formats', () => {
      const when = new Date('2023-01-01T12:00:00Z');
      expect(DateUtils.isAfter('Jan 1, 2023 1:00 PM', when)).toBe(true);
      // Note: Date parsing can vary by timezone and locale, so let's use a clearer example
      expect(DateUtils.isAfter('2023-01-01T10:00:00Z', when)).toBe(false);
    });
  });
});
