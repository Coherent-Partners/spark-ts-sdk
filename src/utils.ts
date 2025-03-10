export type Maybe<T> = T | undefined;
export type Nullable<T> = Maybe<T> | null;

const LoadedModules: Record<string, any> = {};

// FIXME: loading available modules at startup; use shims instead.
(async (...names: string[]) => {
  if (isBrowser()) return;
  for (const name of names) {
    try {
      if (typeof module === 'object' && typeof module.exports === 'object') {
        LoadedModules[name] = require(name);
      } else {
        LoadedModules[name] = await import(name);
      }
    } catch {
      // Avoid throwing errors when loading optional modules. Users will be notified
      // when attempting to use a feature that requires the missing module.
    }
  }
})('fs', 'stream', 'crypto', 'form-data', 'buffer', 'abort-controller', 'jwt-decode');

export function isBrowser() {
  return typeof window === 'object' && typeof document === 'object' && typeof navigator !== 'undefined';
}

/**
 * This should fix the issue with the AbortController polyfill in @cspark/sdk@0.2.1[deprecated]
 * for Node 14.15>= and <14.17 environments.
 */
export function getAbortController(): AbortController | undefined {
  // AbortController was added in node v14.17.0 globally.
  if (typeof AbortController !== 'undefined') return new AbortController();

  // However, because Node 14.15+ is supported, we allow devs to load it from an
  // external module such as a peer dependency to avoid breaking changes.
  const abortController = loadModule('abort-controller')?.AbortController;
  return abortController ? new abortController() : undefined;
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

export function getPlatformInfo(): string {
  const browser = getBrowserInfo();
  if (browser) return browser;

  if (typeof process === 'undefined') return 'Unknown/0.0.0';
  if (process.versions?.deno) return `Deno/${process.versions.deno} - Node/${process.versions.node}`;
  if (process.versions?.bun) return `Bun/${process.versions.bun} - Node/${process.versions.node}`;
  return `Node/${process.versions.node}`;
}

export function loadModule<T = any>(name: string): T | undefined {
  if (!LoadedModules[name]) return undefined;
  return LoadedModules[name] as T;
}

/**
 * Reads an environment variable - ideally in Node environment, otherwise provide
 * the how-to.
 */
export function readEnv(env: string | (() => string | undefined)): string | undefined {
  let value: string | undefined;
  if (typeof env === 'function') value = env()?.trim();
  if (typeof env === 'string' && typeof process !== 'undefined') value = process.env?.[env]?.trim();
  return value ?? undefined;
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

export function getByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder();
    return encoder.encode(str).length;
  } else {
    return Buffer.byteLength(str, 'utf8');
  }
}

/**
 * Sanitizes a Spark-friendly service locator by removing extra slashes.
 */
export function sanitizeUri(url: string, leading = false): string {
  const sanitized = url.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return leading ? sanitized : sanitized.replace(/^\//, '');
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

  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  static join(value: string | string[] | undefined, separator: string = ','): undefined | string {
    return Array.isArray(value) ? value.join(separator) : value;
  }

  static toCamelCase(text: string): string {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  static mask(value: string, start = 0, end = 4, char = '*'): string {
    if (StringUtils.isEmpty(value) || start < 0 || end < 0) return value;
    return value.slice(0, start) + char.repeat(value.length - start - end) + value.slice(-end);
  }
}

export abstract class NumberUtils {
  static isNumber(value: unknown): value is number {
    return (typeof value === 'number' || value instanceof Number) && !Number.isNaN(value);
  }

  static isPositive(value: unknown): boolean {
    return NumberUtils.isNumber(value) && value > 0;
  }

  static isBetween(value: unknown, min: number, max: number): boolean {
    return NumberUtils.isNumber(value) && value >= min && value <= max;
  }

  static isArrayIndex(value: unknown, length: number = 0): boolean {
    if (!NumberUtils.isNumber(value)) return false;

    value = +value.toFixed(0); // Ensure it's an integer.
    if (length > 0) return NumberUtils.isBetween(value, 0, length - 1);
    return (value as number) >= 0;
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

  static toDate(value: unknown): Maybe<Date> {
    return DateUtils.isDate(value) ? new Date(value) : undefined;
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
  isObject,
  isNotEmptyArray,
  sanitizeUri,
  isBrowser,
  getAbortController,
  getBrowserInfo,
  getByteLength,
  readFile,
  formatUrl,
  getUuid,
  sleep,
};
