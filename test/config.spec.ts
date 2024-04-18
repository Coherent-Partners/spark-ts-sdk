import { SparkSdkError, Authorization } from '@cspark/sdk';
import { Config, BaseUrl } from '@cspark/sdk/config';
import { OAuth } from '@cspark/sdk/auth';
import * as Constants from '@cspark/sdk/constants';

describe('Config', () => {
  const BASE_URL = 'https://excel.test.coherent.global';
  const TENANT_NAME = 'tenant-name';
  const API_KEY = 'some-api-key';

  it('should throw an SDK error if base URL or authentication is missing', () => {
    expect(() => new Config()).toThrow(SparkSdkError);
    expect(() => new Config({ apiKey: 'some key' })).toThrow(SparkSdkError);
    expect(() => new Config({ baseUrl: 'https://excel.test.coherent.global/tenant-name' })).toThrow(SparkSdkError);
  });

  it('should throw an SDK error if tenant is missing', () => {
    expect(() => new Config({ baseUrl: BASE_URL, apiKey: 'some key' })).toThrow(SparkSdkError);
  });

  it('should create a client config from correct base URL and API key', () => {
    const config = new Config({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT_NAME });
    expect(config).toBeDefined();
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT_NAME);
    expect(config.auth.apiKey).toBe(API_KEY);
  });

  it('should infer tenant name from base URL', () => {
    const config = new Config({ baseUrl: `${BASE_URL}/${TENANT_NAME}`, apiKey: API_KEY });
    expect(config).toBeDefined();
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT_NAME);
    expect(config.auth.apiKey).toBe(API_KEY);
  });

  it('should build base URL from other url parts', () => {
    const config = new Config({ tenant: TENANT_NAME, env: 'test', apiKey: API_KEY });
    expect(config).toBeDefined();
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT_NAME);
    expect(config.auth.apiKey).toBe(API_KEY);
  });

  it('should be created with default values if not provided', () => {
    const config = new Config({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT_NAME });
    expect(config).toBeDefined();
    expect(config.allowBrowser).toBe(false);
    expect(config.timeout).toBe(Constants.DEFAULT_TIMEOUT_IN_MS);
    expect(config.maxRetries).toBe(Constants.DEFAULT_MAX_RETRIES);
  });
});

describe('BaseUrl', () => {
  const VALID_URL = 'https://excel.test.coherent.global/tenant';

  it('should build base URL from parts', () => {
    expect(BaseUrl.from({ url: 'https://excel.test.coherent.global/tenant' }).full).toBe(VALID_URL);
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

  it('should throw an error if base URL is not of Spark', () => {
    expect(() => BaseUrl.from({ url: 'https://coherent.global' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ url: 'https://coherent.global/tenant' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ url: 'https://excel.test.coherent.global.net/tenant' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ url: 'file://excel.test.coherent.global/tenant' })).toThrow(SparkSdkError);
    expect(() => BaseUrl.from({ url: 'https://excel.spark.global/tenant' })).toThrow(SparkSdkError);
  });
});

describe('Authorization', () => {
  const TOKEN = 'some-access-token';
  const API_KEY = 'some-api-key';
  const OAUTH = { clientId: 'some-id', clientSecret: 'some-secret' };

  it('should create an open authorization', () => {
    expect(Authorization.from({ apiKey: 'open' }).isOpen).toBe(true);
    expect(Authorization.from({ token: 'open' }).isOpen).toBe(true);
  });

  it('should create an authorization with API key', () => {
    const auth = Authorization.from({ apiKey: API_KEY });
    expect(auth).toBeDefined();
    expect(auth.apiKey).toBe(API_KEY);
    expect(auth.isEmpty).toBe(false);
    expect(auth.isOpen).toBe(false);
    expect(auth.type).toBe('apiKey');
    expect(auth.asHeader).toEqual({ 'x-synthetic-key': API_KEY });
    expect(auth.oauth).toBeUndefined();
    expect(auth.token).toBeUndefined();
  });

  it('should create an authorization with bearer token', () => {
    const auth = Authorization.from({ token: 'Bearer ' + TOKEN });
    expect(auth).toBeDefined();
    expect(auth.token).toBe(TOKEN);
    expect(auth.isEmpty).toBe(false);
    expect(auth.isOpen).toBe(false);
    expect(auth.type).toBe('token');
    expect(auth.asHeader).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect(auth.apiKey).toBeUndefined();
    expect(auth.oauth).toBeUndefined();

    expect(Authorization.from({ token: TOKEN }).asHeader).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it('should create an authorization with JSON OAuth', () => {
    const auth = Authorization.from({ oauth: OAUTH });
    expect(auth).toBeDefined();
    expect(auth.oauth).toBeInstanceOf(OAuth);
    expect(auth.oauth?.clientId).toBe(OAUTH.clientId);
    expect(auth.oauth?.clientSecret).toBe(OAUTH.clientSecret);
    expect(auth.isEmpty).toBe(false);
    expect(auth.isOpen).toBe(false);
    expect(auth.type).toBe('oauth');
    expect(auth.apiKey).toBeUndefined();
    expect(auth.token).toBeUndefined();
  });

  it('should create an authorization with file OAuth', () => {
    const auth = Authorization.from({ oauth: './test/sample-ccg.txt' });
    expect(auth).toBeDefined();
    expect(auth.oauth).toBeInstanceOf(OAuth);
    expect(auth.oauth?.clientId).toBe(OAUTH.clientId);
    expect(auth.oauth?.clientSecret).toBe(OAUTH.clientSecret);
    expect(auth.isEmpty).toBe(false);
    expect(auth.isOpen).toBe(false);
    expect(auth.type).toBe('oauth');
    expect(auth.apiKey).toBeUndefined();
    expect(auth.token).toBeUndefined();
  });

  it('should throw an SDK error if no authentication method is provided', () => {
    expect(() => Authorization.from({})).toThrow(SparkSdkError);
  });
});
