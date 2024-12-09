import { ApiResource, SparkSdkError } from '@cspark/sdk';
import { HybridClient as Client, DEFAULT_RUNNER_URL, Config, RunnerUrl } from '../src';

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
    expect(() => new Client({ baseUrl: BASE_URL, token: 'open' })).toThrow(SparkSdkError);
  });

  it('should create a client config from correct base URL and API key', () => {
    const { config } = new Client({ baseUrl: BASE_URL, tenant: TENANT, apiKey: API_KEY });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('********-key');
  });

  it('should create a client config from existing config', () => {
    const config = new Config({ baseUrl: RunnerUrl.from({ url: BASE_URL, tenant: TENANT }), token: 'some-token' });
    const client = new Client(config);
    expect(client.config.baseUrl.value).toBe(BASE_URL);
    expect(client.config.baseUrl.tenant).toBe(TENANT);
    expect(client.config.auth.token).toBe('some-token');

    expect(client.health).toBeInstanceOf(ApiResource);
    expect(client.version).toBeInstanceOf(ApiResource);
    expect(client.services).toBeInstanceOf(ApiResource);
  });

  it('can infer tenant name from base URL', () => {
    const { config } = new Client({ baseUrl: `${BASE_URL}/${TENANT}`, apiKey: 'open' });
    expect(config.baseUrl.value).toBe(BASE_URL);
    expect(config.baseUrl.tenant).toBe(TENANT);
    expect(config.auth.apiKey).toBe('open');
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
    expect(config.environment).toBeUndefined();
    expect(config.hasHeaders).toBe(false);
    expect(config.hasInterceptors).toBe(false);
    expect(config.toString()).toContain(BASE_URL);
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
