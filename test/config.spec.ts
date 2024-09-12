import { JwtConfig, BaseUrl, SparkSdkError } from '../src';
import { Config } from '../src/config';
import { Version } from '../src/version';
import * as Constants from '../src/constants';

describe('Config', () => {
  const BASE_URL = 'https://excel.test.coherent.global';
  const TENANT = 'tenant-name';
  const API_KEY = 'some-api-key';

  it('should throw an SDK error if base URL or authentication is missing', () => {
    expect(() => new Config()).toThrow(SparkSdkError);
    expect(() => new Config({ apiKey: API_KEY })).toThrow(SparkSdkError);
    expect(() => new Config({ baseUrl: `${BASE_URL}/${TENANT}` })).toThrow(SparkSdkError);
  });

  it('should throw an SDK error if tenant is missing', () => {
    expect(() => new Config({ baseUrl: BASE_URL, apiKey: API_KEY })).toThrow(SparkSdkError);
    expect(() => new Config({ env: 'test', apiKey: API_KEY })).toThrow(SparkSdkError);
  });

  it('should create a client config from correct base URL and API key', () => {
    const config = new Config({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('can infer tenant name from base URL', () => {
    const config = new Config({ baseUrl: `${BASE_URL}/${TENANT}`, apiKey: API_KEY });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('can build base URL from other url parts', () => {
    const config = new Config({ tenant: TENANT, env: 'test', apiKey: API_KEY });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('can be created with default values if not provided', () => {
    const config = new Config({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT });
    expect(config.allowBrowser).toBe(false);
    expect(config.timeout).toBe(Constants.DEFAULT_TIMEOUT_IN_MS);
    expect(config.maxRetries).toBe(Constants.DEFAULT_MAX_RETRIES);
  });

  it('can create a copy with new values', () => {
    const config = new Config({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT });
    const copy = config.copyWith({ apiKey: 'new-key', tenant: 'new-tenant', env: 'prod' });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');

    expect(copy).toBeInstanceOf(Config);
    expect(copy.baseUrl.value).toBe('https://excel.prod.coherent.global');
    expect(copy.auth.apiKey).toBe('***-key');
    expect(copy.baseUrl.tenant).toBe('new-tenant');
  });
});

describe('JwtConfig', () => {
  const version = new Version(process?.version?.replace('v', ''));

  // should run this suite if node v16+, otherwise would fail.
  // jwt-decode depends on atob which is not available in node v14 and below.
  // It should've considered using Buffer.from instead of atob.
  if (16 > +version.major) return;

  const TOKEN = ''.concat(
    'eyJhbGciOiJIUzI1NiJ9.', // this uses HS256 algorithm for testing but Coherent uses RS256 algorithm.
    'eyJpc3MiOiJodHRwczovL2tleWNsb2FrLm15LWVudi5jb2hlcmVudC5nbG9iYWwvYXV0aC9yZWFsbXMvbXktdGVuYW50IiwicmVhbG0iOiJteS10ZW5hbnQifQ.',
    '9G0zF-XAN9EpDLu11tmqkRwNFU52ecoGz4vTq0NEJBw',
  );

  it('can decode a JWT token to some client options', () => {
    const decoded = JwtConfig.decode(TOKEN);
    expect(decoded.token).toBe(TOKEN);
    expect(decoded.baseUrl).toBe('https://excel.my-env.coherent.global');
    expect(decoded.tenant).toBe('my-tenant');
  });

  it('can build a client config from a JWT token', () => {
    const config = JwtConfig.from({ token: TOKEN });
    expect(config.baseUrl.value).toBe('https://excel.my-env.coherent.global');
    expect(config.baseUrl.tenant).toBe('my-tenant');
    expect(config.auth.token).toBe(TOKEN);
  });

  it('should throw an error if JWT token is invalid', () => {
    expect(() => JwtConfig.decode('invalid-token')).toThrow(SparkSdkError);
  });
});

describe('BaseUrl', () => {
  const VALID_URL = 'https://excel.my.env.coherent.global/tenant';

  it('can build base URL from parts', () => {
    expect(BaseUrl.from({ url: 'https://spark.my.env.coherent.global/tenant' }).full).toBe(VALID_URL);
    expect(BaseUrl.from({ url: 'https://excel.my.env.coherent.global/tenant' }).full).toBe(VALID_URL);
    expect(BaseUrl.from({ url: 'https://spark.my.env.coherent.global', tenant: 'tenant' }).full).toBe(VALID_URL);
    expect(BaseUrl.from({ url: 'https://excel.my.env.coherent.global', tenant: 'tenant' }).full).toBe(VALID_URL);
    expect(BaseUrl.from({ env: 'my.env', tenant: 'tenant' }).full).toBe(VALID_URL);
  });

  it('can copy base URL with new values', () => {
    const baseUrl = BaseUrl.from({ url: VALID_URL });
    expect(baseUrl.copyWith({ env: 'new-env' }).full).toBe('https://excel.new-env.coherent.global/tenant');
    expect(baseUrl.copyWith({ tenant: 'new-tenant' }).full).toBe('https://excel.my.env.coherent.global/new-tenant');
    expect(baseUrl.copyWith({ env: 'new-env', tenant: 'new-tenant' }).full).toBe(
      'https://excel.new-env.coherent.global/new-tenant',
    );
    expect(baseUrl.copyWith({ url: 'https://excel.new-env.coherent.global' }).full).toBe(
      'https://excel.new-env.coherent.global/tenant',
    );
    expect(baseUrl.copyWith({ url: 'https://excel.new-env.coherent.global', tenant: 'new-tenant' }).full).toBe(
      'https://excel.new-env.coherent.global/new-tenant',
    );
  });

  it('should throw an error when params are incorrect', () => {
    expect(() => BaseUrl.from()).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({})).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ tenant: 'tenant' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ env: 'test' })).toThrow(SparkSdkError);
  });

  it('should throw an error if tenant name is missing', () => {
    expect(() => BaseUrl.from({ url: 'https://excel.test.coherent.global' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ env: 'test' })).toThrow(SparkSdkError);
  });

  it('should throw an error if base URL is not of Coherent', () => {
    expect(() => BaseUrl.from({ url: 'https://coherent.global' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ url: 'https://coherent.global/tenant' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ url: 'https://excel.test.coherent.global.net/tenant' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ url: 'file://excel.test.coherent.global/tenant' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ url: 'https://excel.spark.global/tenant' })).toThrow(SparkSdkError);
  });
});
