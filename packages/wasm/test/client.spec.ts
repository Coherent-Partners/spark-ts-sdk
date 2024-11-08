import { SparkSdkError } from '@cspark/sdk';

import { HybridClient as Client, DEFAULT_RUNNER_URL } from '../src';

describe('Client', () => {
  const BASE_URL = 'http://localhost:8080';
  const TENANT = 'tenant-name';
  const API_KEY = 'some-api-key';

  it('should throw an SDK error if base URL or authentication is missing', () => {
    expect(() => new Client({})).toThrow(SparkSdkError);
    expect(() => new Client({ apiKey: API_KEY })).toThrow(SparkSdkError);
    expect(() => new Client({ baseUrl: `${BASE_URL}/${TENANT}` })).toThrow(SparkSdkError);
  });

  it('should throw an SDK error if tenant is missing', () => {
    expect(() => new Client({ baseUrl: BASE_URL, apiKey: API_KEY })).toThrow(SparkSdkError);
  });

  it('should create a client config from correct base URL and API key', () => {
    const { config } = new Client({ baseUrl: BASE_URL, apiKey: API_KEY, tenant: TENANT });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('can infer tenant name from base URL', () => {
    const { config } = new Client({ baseUrl: `${BASE_URL}/${TENANT}`, apiKey: API_KEY });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('can build base URL from tenant name only', () => {
    const { config } = new Client({ tenant: TENANT, apiKey: API_KEY });
    expect(config.baseUrl.value).toBe(DEFAULT_RUNNER_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.baseUrl.full).toBe(`${DEFAULT_RUNNER_URL}/${TENANT}`);
  });

  it('can be created with default values if not provided', () => {
    const { config } = new Client({ baseUrl: BASE_URL, tenant: TENANT, apiKey: API_KEY });
    expect(config.allowBrowser).toBe(false);
    expect(config.timeout).toBe(60000);
    expect(config.maxRetries).toBe(2);
  });

  it('can create a copy with new values', () => {
    const { config } = new Client({ baseUrl: BASE_URL, tenant: TENANT, apiKey: API_KEY });
    const copy = config.copyWith({ apiKey: 'new-key', tenant: 'new-tenant' });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');

    expect(copy.baseUrl.value).toBe(BASE_URL);
    expect(copy.auth.apiKey).toBe('***-key');
    expect(copy.baseUrl.tenant).toBe('new-tenant');
    expect(copy.baseUrl.full).toBe(`${BASE_URL}/new-tenant`);
  });
});
