import { SparkSdkError } from '@cspark/sdk';
import { Config, BaseUrl } from '@cspark/sdk/config';
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
