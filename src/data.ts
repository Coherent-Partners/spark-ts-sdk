import { gzip, ungzip, deflate, inflate } from 'pako';

import { SparkError } from './error';
import { StringUtils } from './utils';

export type JsonData = null | boolean | number | string | JsonArray | JsonValue;

export type JsonArray = readonly JsonData[];

export type JsonValue = { readonly [key: string]: JsonData | undefined };

/**
 * Serializable JSON data
 *
 * This is used to serialize (or stringify) and deserialize (jsonify) network data.
 */
export abstract class Serializable<From = any, To = string> {
  constructor(readonly value: any) {}

  get isEmpty(): boolean {
    return !this.value;
  }

  get isNull(): boolean {
    return this.value === null;
  }

  get isUndefined(): boolean {
    return this.value === undefined || typeof this.value === 'undefined';
  }

  get isBoolean(): boolean {
    return typeof this.value === 'boolean';
  }

  get isNumber(): boolean {
    return typeof this.value === 'number';
  }

  get isString(): boolean {
    return StringUtils.isString(this.value);
  }

  get isArray(): boolean {
    return Array.isArray(this.value);
  }

  get isObject(): boolean {
    return !!this.value && typeof this.value === 'object' && !this.isArray;
  }

  get asString(): Stringified {
    return new Stringified(this.value);
  }

  get asJson(): Jsonified {
    return new Jsonified(this.value);
  }

  abstract serialize(): To;

  abstract deserialize(): From;

  static serialize<T>(data: T | undefined): string {
    return StringUtils.isString(data) ? data : JSON.stringify(data);
  }

  static deserialize<R>(data: string, onError?: () => R): R {
    try {
      return JSON.parse(data);
    } catch {
      if (onError) return onError();
      throw new SparkError('failed to parse JSON data', data);
    }
  }

  static toUrlParams(data: JsonData): string {
    const content = new Jsonified(data);
    if (!content.isObject && !content.isString) {
      throw new SparkError('expecting an object or string to serialize to URL params', content.serialize());
    }

    const json = content.isString ? content.asString.deserialize() : data;
    return new URLSearchParams(Object.entries(json as object).filter(([, value]) => value != null)).toString();
  }

  static gzip(data: JsonData): GzipEncoding {
    return new GzipEncoding(data);
  }

  static deflate(data: JsonData): DeflateEncoding {
    return new DeflateEncoding(data);
  }

  static compress(payload: any, encoding?: 'gzip' | 'deflate') {
    const headers = encoding ? { 'Content-Encoding': encoding, 'Accept-Encoding': encoding } : {};
    switch (encoding) {
      case 'gzip':
        return [Serializable.gzip(payload), headers];
      case 'deflate':
        return [Serializable.deflate(payload), headers];
      default:
        return [payload, headers];
    }
  }
}

/**
 * Serialized data as a string
 */
export class Stringified extends Serializable<string, JsonData> {
  serialize(): JsonData {
    return Serializable.deserialize<JsonData>(this.value, () => null);
  }

  deserialize(): string {
    return String(this.value);
  }
}

/**
 * Deserialized data as a JSON object.
 *
 * A valid JSON object is either a string, number, boolean, null, array, or an object.
 */
export class Jsonified extends Serializable<JsonData, string> {
  serialize(): string {
    return Serializable.serialize(this.value);
  }

  deserialize(): JsonData {
    return this.value;
  }
}

export class GzipEncoding extends Serializable<any, Uint8Array> {
  serialize(): Uint8Array {
    const text = Serializable.serialize(this.value);
    return gzip(new TextEncoder().encode(text));
  }

  deserialize<T>(): T | string {
    const text = ungzip(this.value, { to: 'string' });
    return Serializable.deserialize<T | string>(text, () => text);
  }
}

export class DeflateEncoding extends Serializable<any, Uint8Array> {
  serialize(): Uint8Array {
    const text = Serializable.serialize(this.value);
    return deflate(new TextEncoder().encode(text));
  }

  deserialize<T>(): T | string {
    const text = inflate(this.value, { to: 'string' });
    return Serializable.deserialize<T | string>(text, () => text);
  }
}
