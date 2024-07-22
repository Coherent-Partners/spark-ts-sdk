import { SparkSdkError } from '@cspark/sdk';
import { Config, JwtConfig, BaseUrl } from '@cspark/sdk/config';
import * as Constants from '@cspark/sdk/constants';

describe('Config', () => {
  const BASE_URL = 'https://excel.test.coherent.global';
  const TENANT = 'tenant-name';
  const API_KEY = 'some-api-key';

  it('should throw an SDK error if base URL or authentication is missing', () => {
    expect(() => new Config()).toThrow(SparkSdkError);
    expect(() => new Config({ apiKey: 'some key' })).toThrow(SparkSdkError);
    expect(() => new Config({ baseUrl: `${BASE_URL}/${TENANT}` })).toThrow(SparkSdkError);
  });

  it('should throw an SDK error if tenant is missing', () => {
    expect(() => new Config({ baseUrl: BASE_URL, apiKey: API_KEY })).toThrow(SparkSdkError);
    expect(() => new Config({ env: 'test', apiKey: API_KEY })).toThrow(SparkSdkError);
  });

  it('should create a client config from correct base URL and API key', () => {
    const config = new Config({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT });
    expect(config).toBeDefined();
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('can infer tenant name from base URL', () => {
    const config = new Config({ baseUrl: `${BASE_URL}/${TENANT}`, apiKey: API_KEY });
    expect(config).toBeDefined();
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('can build base URL from other url parts', () => {
    const config = new Config({ tenant: TENANT, env: 'test', apiKey: API_KEY });
    expect(config).toBeDefined();
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('can be created with default values if not provided', () => {
    const config = new Config({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT });
    expect(config).toBeDefined();
    expect(config.allowBrowser).toBe(false);
    expect(config.timeout).toBe(Constants.DEFAULT_TIMEOUT_IN_MS);
    expect(config.maxRetries).toBe(Constants.DEFAULT_MAX_RETRIES);
  });

  it('can create a copy with new values', () => {
    const config = new Config({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT });
    const newConfig = config.copyWith({ apiKey: 'new-key', tenant: 'new-tenant' });
    expect(newConfig).toBeDefined();
    expect(newConfig.baseUrl.value).toBe(BASE_URL);
    expect(newConfig.auth.apiKey).toBe('***-key');
    expect(newConfig.baseUrl.tenant).toBe('new-tenant');
  });
});

describe('JwtConfig', () => {
  const TOKEN = ''.concat(
    'eyJhbGciOiJIUzI1NiJ9.', // this uses HS256 algorithm for testing but Coherent uses RS256 algorithm.
    'eyJpc3MiOiJodHRwczovL2tleWNsb2FrLm15LWVudi5jb2hlcmVudC5nbG9iYWwvYXV0aC9yZWFsbXMvbXktdGVuYW50IiwicmVhbG0iOiJteS10ZW5hbnQifQ.',
    '9G0zF-XAN9EpDLu11tmqkRwNFU52ecoGz4vTq0NEJBw',
  );

  it('can decode a JWT token to some client options', () => {
    const decoded = JwtConfig.decode(TOKEN);
    expect(decoded).toBeDefined();
    expect(decoded.token).toBe(TOKEN);
    expect(decoded.baseUrl).toBe('https://excel.my-env.coherent.global');
    expect(decoded.tenant).toBe('my-tenant');
  });

  it('can build a client config from a JWT token', () => {
    const config = JwtConfig.from({ token: TOKEN });
    expect(config).toBeDefined();
    expect(config.baseUrl.value).toBe('https://excel.my-env.coherent.global');
    expect(config.baseUrl.tenant).toBe('my-tenant');
    expect(config.auth.token).toBe(TOKEN);
  });

  it('should throw an error if JWT token is invalid', () => {
    expect(() => JwtConfig.decode('invalid-token')).toThrow(SparkSdkError);
  });
});

describe('BaseUrl', () => {
  const VALID_URL = 'https://excel.test.coherent.global/tenant';

  it('can build base URL from parts', () => {
    expect(BaseUrl.from({ url: 'https://spark.test.coherent.global/tenant' }).full).toBe(VALID_URL);
    expect(BaseUrl.from({ url: 'https://excel.test.coherent.global/tenant' }).full).toBe(VALID_URL);
    expect(BaseUrl.from({ url: 'https://spark.test.coherent.global', tenant: 'tenant' }).full).toBe(VALID_URL);
    expect(BaseUrl.from({ url: 'https://excel.test.coherent.global', tenant: 'tenant' }).full).toBe(VALID_URL);
    expect(BaseUrl.from({ env: 'test', tenant: 'tenant' }).full).toBe(VALID_URL);
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
