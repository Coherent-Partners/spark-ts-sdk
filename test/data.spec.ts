import { SparkError } from '../src/error';
import { Serializable, JsonData, Stringified, Jsonified, GzipEncoding, DeflateEncoding } from '../src/data';

describe('Serializable', () => {
  const ARRAY: JsonData = [null, false, 1, 'string'];
  const OBJECT: JsonData = { null: null, bool: true, num: 1, str: 'string', array: ARRAY };

  it('can serialize primitive values', () => {
    expect(Serializable.serialize(undefined)).toBeUndefined();
    expect(Serializable.serialize(null)).toBe('null');
    expect(Serializable.serialize(true)).toBe('true');
    expect(Serializable.serialize(0)).toBe('0');
    expect(Serializable.serialize('string')).toBe('string');
    expect(Serializable.serialize(ARRAY)).toBe('[null,false,1,"string"]');
    expect(Serializable.serialize(OBJECT)).toBe(
      '{"null":null,"bool":true,"num":1,"str":"string","array":[null,false,1,"string"]}',
    );
  });

  it('can deserialize serialized values', () => {
    expect(Serializable.deserialize('null')).toBeNull();
    expect(Serializable.deserialize('true')).toBe(true);
    expect(Serializable.deserialize('0')).toBe(0);
    expect(Serializable.deserialize('[null,false,1,"string"]')).toEqual(ARRAY);
    expect(
      Serializable.deserialize('{"null":null,"bool":true,"num":1,"str":"string","array":[null,false,1,"string"]}'),
    ).toEqual(OBJECT);
  });

  it('should throw an error when deserializing wrong string values', () => {
    expect(() => Serializable.deserialize('string')).toThrow(SparkError);
  });

  it('can serialize URL params', () => {
    expect(Serializable.toUrlParams({ a: 1, b: 'string' })).toBe('a=1&b=string');
    expect(Serializable.toUrlParams({ a: 1, b: 'string', c: null, d: undefined })).toBe('a=1&b=string');
  });

  it('should throw an error when serializing non-object or non-string data to URL params', () => {
    expect(() => Serializable.toUrlParams(1 as any)).toThrow(SparkError);
  });

  it('can jsonify a string', () => {
    expect(new Stringified('null').serialize()).toEqual(null);
    expect(new Stringified('true').serialize()).toEqual(true);
    expect(new Stringified('0').serialize()).toEqual(0);
    expect(new Stringified('string').serialize()).toEqual(null);
    expect(new Stringified('{"a":1}').serialize()).toEqual({ a: 1 });
  });

  it('should be able to assess the data type of serializable data', () => {
    const stringified = new Stringified('{"a":1}');
    expect(stringified.isEmpty).toBe(false);
    expect(stringified.isUndefined).toBe(false);
    expect(stringified.isNull).toBe(false);
    expect(stringified.isBoolean).toBe(false);
    expect(stringified.isNumber).toBe(false);
    expect(stringified.isString).toBe(true);
    expect(stringified.isArray).toBe(false);
    expect(stringified.isObject).toBe(false);
    expect(stringified.deserialize()).toEqual('{"a":1}');
    expect(stringified.serialize()).toEqual({ a: 1 });
    expect(stringified.asJson).toBeInstanceOf(Jsonified);
  });

  it('should be able to assess the data type of non-serializable data', () => {
    const jsonified = new Jsonified([null, false, 1, 'string']);
    expect(jsonified.isUndefined).toBe(false);
    expect(jsonified.isNull).toBe(false);
    expect(jsonified.isBoolean).toBe(false);
    expect(jsonified.isNumber).toBe(false);
    expect(jsonified.isString).toBe(false);
    expect(jsonified.isArray).toBe(true);
    expect(jsonified.isObject).toBe(false);
    expect(jsonified.serialize()).toBe('[null,false,1,"string"]');
    expect(jsonified.deserialize()).toEqual([null, false, 1, 'string']);
    expect(jsonified.asString).toBeInstanceOf(Stringified);
  });

  it('should be able to handle nullable data', () => {
    const emptyStr = new Stringified('');
    expect(emptyStr.isUndefined).toBe(false);
    expect(emptyStr.isNull).toBe(false);
    expect(emptyStr.deserialize()).toBe('');
    expect(emptyStr.serialize()).toBeNull();

    const nullable = new Jsonified(null);
    expect(nullable.isUndefined).toBe(false);
    expect(nullable.isNull).toBe(true);
    expect(nullable.serialize()).toBe('null');
    expect(nullable.deserialize()).toBeNull();
  });

  it('can serialize data using gzip compression algorithm', () => {
    const [payload, headers] = Serializable.compress(OBJECT, 'gzip');
    expect(payload).toBeInstanceOf(GzipEncoding);
    expect(headers).toEqual({ 'Content-Encoding': 'gzip', 'Accept-Encoding': 'gzip' });
    expect(Serializable.gzip(payload.serialize()).deserialize()).toEqual(OBJECT);
  });

  it('can serialize data using deflate compression algorithm', () => {
    const [payload, headers] = Serializable.compress(OBJECT, 'deflate');
    expect(payload).toBeInstanceOf(DeflateEncoding);
    expect(headers).toEqual({ 'Content-Encoding': 'deflate', 'Accept-Encoding': 'deflate' });
    expect(Serializable.deflate(payload.serialize()).deserialize()).toEqual(OBJECT);
  });
});
