export type Maybe<T> = T | undefined;
export type Nullable<T> = Maybe<T> | null;

/**
 * Reads an environment variable.
 *
 * This function trims beginning and trailing whitespace and returns undefined
 * if the environment variable doesn't exist or cannot be accessed.
 */
export function readEnv(env: string): string | undefined {
  if (typeof process !== 'undefined') {
    return process.env?.[env]?.trim() ?? undefined;
  }
  return undefined;
}

/**
 * Whether the given object has no keys or is null or undefined.
 * @param obj possible JS object
 *
 * Inspired by: // https://stackoverflow.com/a/34491287
 */
export function isEmptyObject(obj: object | null | undefined): boolean {
  if (!obj) return true;
  for (const _k in obj) return false;
  return true;
}

/**
 * Whether the given object has the given key.
 * @param obj possible JS object
 * @param key to check
 *
 * Inspired by: https://eslint.org/docs/latest/rules/no-prototype-builtins
 */
export function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isObject(obj: unknown): obj is Record<string, unknown> {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Whether the given URL is absolute.
 * @param url to check
 * Inspired by: https://stackoverflow.com/a/19709846
 */
export function isNotEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export abstract class StringUtils {
  static isString(text: unknown): boolean {
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
  static isNumber(value: unknown): boolean {
    return !Number.isNaN(value) || typeof value === 'number' || value instanceof Number;
  }

  static isPositive(value: unknown): boolean {
    return NumberUtils.isNumber(value) && (value as number) > 0;
  }

  static isBetween(value: unknown, min: number, max: number): boolean {
    return NumberUtils.isNumber(value) && (value as number) >= min && (value as number) <= max;
  }
}

export function isBrowser() {
  return typeof window === 'object' && typeof document === 'object' && window.crypto;
}

/**
 * Reads a text file and returns its content.
 */
export function readFile(path: string): string {
  return eval('require')('fs').readFileSync(path, 'utf8');
}

export function tryParseJson<T>(json: string): T | undefined {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

export function formatUrl(baseUrl: string | URL, params: Record<string, string> = {}): string {
  const url = baseUrl.toString();
  const searchParams = new URLSearchParams(params).toString();
  return `${url}${searchParams ? (url.includes('?') ? '&' : '?') + searchParams : ''}`;
}

/**
 * Sanitizes a Spark-friendly service locator by removing extra slashes.
 */
export function sanitizeUri(url: string, leading = false): string {
  const sanitized = url.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return leading ? sanitized : sanitized.replace(/^\//, '');
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

export default {
  readEnv,
  isEmptyObject,
  hasOwn,
  isObject,
  isNotEmptyArray,
  sanitizeUri,
  StringUtils,
  NumberUtils,
  isBrowser,
  readFile,
  tryParseJson,
  formatUrl,
  getUuid,
};
