export type Maybe<T> = T | undefined;
export type Nullable<T> = Maybe<T> | null;

const LoadedModules: Record<string, any> = {};

async function bootstrapModules(names: string[]) {
  if (isBrowser()) return;
  if (typeof module === 'object' && typeof module.exports === 'object') {
    names.forEach((name) => (LoadedModules[name] = require(name)));
  } else {
    names.forEach((name) => import(name).then((module) => (LoadedModules[name] = module)));
  }
}

bootstrapModules(['fs', 'stream', 'crypto', 'form-data', 'buffer']); // FIXME: use shims instead.

export function isBrowser() {
  return typeof window === 'object' && typeof document === 'object' && typeof navigator !== 'undefined';
}

/**
 * Returns the browser name and version when running in browser environments.
 * Inspired by: https://github.com/JS-DevTools/host-environment/blob/b1ab79ecde37db5d6e163c050e54fe7d287d7c92/src/isomorphic.browser.ts
 */
export function getBrowserInfo(): string | undefined {
  if (typeof navigator === 'undefined' || !navigator) return undefined;

  // NOTE: The order matters here!
  const browserPatterns = [
    { key: 'Edge' as const, pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'IE' as const, pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'IE' as const, pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'Chrome' as const, pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'Firefox' as const, pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'Safari' as const, pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ },
  ];

  // Find the FIRST matching browser
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const [, major = 0, minor = 0, patch = 0] = match;
      return `${key}/${major}.${minor}.${patch}`;
    }
  }
  return undefined;
}

export function loadModule<T = any>(path: string): T | undefined {
  if (!LoadedModules[path]) {
    bootstrapModules([path]);
    return undefined;
  }
  return LoadedModules[path] as T;
}

/**
 * Reads an environment variable (in Node environment only).
 */
export function readEnv(env: string): string | undefined {
  if (typeof process !== 'undefined') {
    return process.env?.[env]?.trim() ?? undefined;
  }
  return undefined;
}

/**
 * Generates a random UUIDv4.
 * Inspired by: https://stackoverflow.com/a/2117523
 */
export function getUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Whether the given object has no keys.
 * Inspired by: https://stackoverflow.com/a/34491287
 */
export function isEmptyObject(obj: object | null | undefined): boolean {
  if (!obj) return true;
  for (const _k in obj) return false;
  return true;
}

/**
 * Whether the given object has the given key.
 * Inspired by: https://eslint.org/docs/latest/rules/no-prototype-builtins
 */
export function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isObject(obj: unknown): obj is Record<string, unknown> {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}

export function isNotEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

export function readFile(path: string): string {
  return loadModule('fs').readFileSync(path, 'utf8');
}

export function formatUrl(baseUrl: string | URL, params: Record<string, string> = {}): string {
  const url = baseUrl.toString();
  const searchParams = new URLSearchParams(params).toString();
  return `${url}${searchParams ? (url.includes('?') ? '&' : '?') + searchParams : ''}`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitizes a Spark-friendly service locator by removing extra slashes.
 */
export function sanitizeUri(url: string, leading = false): string {
  const sanitized = url.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return leading ? sanitized : sanitized.replace(/^\//, '');
}

export function mask(value: string, start = 0, end = 4, char = '*'): string {
  if (StringUtils.isEmpty(value) || start < 0 || end < 0) return value;
  return value.slice(0, start) + char.repeat(value.length - start - end) + value.slice(-end);
}

export abstract class StringUtils {
  static isString(text: unknown): text is string {
    return typeof text === 'string' || text instanceof String;
  }

  static isEmpty(text: unknown): boolean {
    return !text || (StringUtils.isString(text) && (text as string).trim().length === 0);
  }

  static isNotEmpty(text: unknown): boolean {
    return !StringUtils.isEmpty(text);
  }
}

export abstract class NumberUtils {
  static isNumber(value: unknown): value is number {
    return !Number.isNaN(value) || typeof value === 'number' || value instanceof Number;
  }

  static isPositive(value: unknown): boolean {
    return NumberUtils.isNumber(value) && (value as number) > 0;
  }

  static isBetween(value: unknown, min: number, max: number): boolean {
    return NumberUtils.isNumber(value) && (value as number) >= min && (value as number) <= max;
  }
}

export abstract class DateUtils {
  static isDate(value: unknown): value is Date {
    if (value instanceof Date) return true;
    if (typeof value === 'string' || typeof value === 'number') {
      return !Number.isNaN(Date.parse(value.toString()));
    }
    return false;
  }

  static parse(
    start: Maybe<number | string | Date>,
    end?: Maybe<number | string | Date>,
    { years = 10, months = 0, days = 0 }: { days?: number; months?: number; years?: number } = {},
  ): [Date, Date] {
    const startDate = new Date(start ?? Date.now());
    const endDate =
      end && DateUtils.isAfter(end, startDate)
        ? new Date(end)
        : new Date(startDate.getFullYear() + years, startDate.getMonth() + months, startDate.getDate() + days);
    return [startDate, endDate];
  }

  static isBefore(date: string | number | Date, when: Date): boolean {
    return new Date(date).getTime() < when.getTime();
  }

  static isAfter(date: string | number | Date, when: Date): boolean {
    return new Date(date).getTime() > when.getTime();
  }
}

export default {
  readEnv,
  isEmptyObject,
  hasOwn,
  isObject,
  isNotEmptyArray,
  sanitizeUri,
  isBrowser,
  getBrowserInfo,
  readFile,
  formatUrl,
  getUuid,
  sleep,
  mask,
};
