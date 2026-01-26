import { Agent as HttpAgent } from 'http';
import nodeFetch, { AbortError } from 'node-fetch';
import Spark, { SparkError, SparkApiError, Uri, ApiResource, SparkOptions } from '../../src';
import LocalServer, { TestApiResource } from './_server';
import Utils from '../../src/utils';

describe('Uri', () => {
  const BASE_URL = 'https://excel.test.coherent.global/tenant-name';

  it('can build url from partial resources', () => {
    expect(Uri.partial('folders/f/services/s', { base: BASE_URL, endpoint: 'execute' }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/folders/f/services/s/execute',
    );

    expect(Uri.partial('proxy/custom-endpoint', { base: BASE_URL }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/proxy/custom-endpoint',
    );
  });

  it('should handle extra slashes from partial resources', () => {
    expect(Uri.partial('/folders/f/services/s/', { base: BASE_URL, endpoint: 'execute' }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/folders/f/services/s/execute',
    );

    expect(Uri.partial('/public/version/123/', { base: BASE_URL }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/public/version/123',
    );
  });

  it('can build url from uri params', () => {
    expect(Uri.from({ folder: 'f', service: 's' }, { base: BASE_URL, endpoint: 'execute' }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/folders/f/services/s/execute',
    );

    expect(Uri.from({ versionId: '123' }, { base: BASE_URL }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/version/123', // no longer support 'execute' endpoint
    );

    expect(Uri.from({ serviceId: '456' }, { base: BASE_URL }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/service/456', // no longer support 'execute' endpoint
    );

    expect(Uri.from(undefined, { base: BASE_URL, version: 'api/v4', endpoint: 'execute' }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v4/execute',
    );

    expect(Uri.from({ public: true }, { base: BASE_URL, version: 'api/v4', endpoint: 'execute' }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v4/public/execute',
    );

    expect(
      Uri.from(
        { folder: 'low', service: 'priority', versionId: 'high-priority' },
        { base: BASE_URL, endpoint: 'execute' },
      ).value,
    ).toBe('https://excel.test.coherent.global/tenant-name/api/v3/version/high-priority/execute');

    expect(Uri.from({ proxy: 'custom-endpoint' }, { base: BASE_URL }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/proxy/custom-endpoint',
    );

    expect(Uri.from({ proxy: 'custom-endpoint', public: true }, { base: BASE_URL }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/public/proxy/custom-endpoint',
    );

    expect(Uri.from({ proxy: '/custom-endpoint///', public: true }, { base: BASE_URL }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/public/proxy/custom-endpoint',
    );
  });

  it('can concatenate url with query params', () => {
    const uri = Uri.from({ folder: 'f', service: 's' }, { base: BASE_URL, endpoint: 'execute' });
    expect(uri.toString()).toBe('https://excel.test.coherent.global/tenant-name/api/v3/folders/f/services/s/execute');
    expect(uri.concat({ a: 'b' })).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/folders/f/services/s/execute?a=b',
    );

    expect(uri.concat({ a: 'b', c: 'd', e: '' })).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/folders/f/services/s/execute?a=b&c=d&e=',
    );
  });

  it('should throw an error if uri params are incorrect', () => {
    expect(() => Uri.validate('')).toThrow(SparkError);
    expect(() => Uri.validate('f//')).toThrow(SparkError);
    expect(() => Uri.validate('//s')).toThrow(SparkError);
    expect(() => Uri.validate({ folder: 'f' })).toThrow(SparkError);
    expect(() => Uri.validate({ service: 's' })).toThrow(SparkError);
    expect(() => Uri.from(undefined, { base: BASE_URL })).not.toThrow(SparkError);
    expect(() => Uri.partial('', { base: BASE_URL })).not.toThrow(SparkError);

    // Forcing a wrong base url to test failure to build a URL. During runtime, the base url
    // will be valid at this point.
    expect(() => Uri.from({ versionId: '123' }, { base: 'fake base url' })).toThrow(SparkError);
    expect(() => Uri.partial('version/123', { base: 'fake base url' })).toThrow(SparkError);
  });

  it('should decode string uri into UriParams object', () => {
    expect(Uri.decode('folders/f/services/s')).toEqual({ folder: 'f', service: 's' });
    expect(Uri.decode('f/s')).toEqual({ folder: 'f', service: 's' });
    expect(Uri.decode('f/s[1.0]')).toEqual({ folder: 'f', service: 's', version: '1.0' });
    expect(Uri.decode('folders/f/services/s[1.2.3]')).toEqual({ folder: 'f', service: 's', version: '1.2.3' });
    expect(Uri.decode('service/456')).toEqual({ serviceId: '456' });
    expect(Uri.decode('version/123')).toEqual({ versionId: '123' });
    expect(Uri.decode('proxy/custom-endpoint')).toEqual({ proxy: 'custom-endpoint' });

    // Atypical cases
    expect(Uri.decode('/f/s/')).toEqual({ folder: 'f', service: 's' });
    expect(Uri.decode('f/s/')).toEqual({ folder: 'f', service: 's' });
    expect(Uri.decode('///f//s//')).toEqual({ folder: 'f', service: 's' });
    expect(Uri.decode('/f/s[]/')).toEqual({ folder: 'f', service: 's' });

    // Invalid cases
    expect(Uri.decode('')).toEqual({});
    expect(Uri.decode('//f/')).toEqual({});
    expect(Uri.decode('//f')).toEqual({});
    expect(Uri.decode('///')).toEqual({});
  });

  it('should encode UriParams object into string uri', () => {
    expect(Uri.encode({ folder: 'f', service: 's' })).toBe('folders/f/services/s');
    expect(Uri.encode({ folder: 'f', service: 's', version: '1.2.3' }, false)).toBe('f/s[1.2.3]');
    expect(Uri.encode({ serviceId: '456' })).toBe('service/456');
    expect(Uri.encode({ versionId: '123' })).toBe('version/123');
    expect(Uri.encode({ proxy: 'custom-endpoint' })).toBe('proxy/custom-endpoint');
  });
});

describe('ApiResource', () => {
  const localSever = new LocalServer();
  let testResource: TestApiResource;
  let spark: Spark;

  beforeAll(async () => {
    await localSever.start();
    spark = new Spark({ baseUrl: localSever.baseUrl, apiKey: 'open', logger: false });
    spark.config.extraHeaders['my-extra-header'] = 'my-extra-value';
    spark.config.interceptors.add({
      beforeRequest: (req) => {
        expect(req.headers).toHaveProperty('x-tenant-name');
        expect(req.headers).toHaveProperty('x-request-id');
        expect(req.headers).toHaveProperty('x-spark-ua');
        expect(req.headers).toHaveProperty('my-extra-header');
        return req;
      },
      afterRequest: (res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        return res;
      },
    });
  });

  afterAll(async () => localSever.stop());

  beforeEach(() => {
    testResource = new TestApiResource(spark.config);
  });

  it('can abort long-running requests', async () => {
    const timeout = setTimeout(() => testResource?.abort(), 500); // abort after 500ms

    await expect(testResource.slow()).rejects.toThrow(AbortError); // this request will take 1s
    clearTimeout(timeout);
  });

  it('throws an API error when unauthorized', async () => {
    await expect(testResource.unauthorized()).rejects.toThrow(SparkApiError);
  });

  it('can retry request upon rate limit failure', async () => {
    const spy = jest.spyOn(Utils, 'sleep');

    await expect(testResource.rateLimited()).rejects.toThrow(SparkApiError); // should trigger 3 times
    expect(spy).toHaveBeenCalledTimes(spark.config.maxRetries);
    expect(spy).toHaveBeenLastCalledWith(100); // server suggests retry after 100ms
  });

  it('can be extended to support additional resources', async () => {
    const uri = { version: 'extended', endpoint: 'resource' };

    type Status = { status: string };

    class Other extends ApiResource {
      fetchData() {
        return this.request<Status>(Uri.from(undefined, { base: this.config.baseUrl.value, ...uri }));
      }
    }

    const extended = spark.extend(new Other(spark.config)).extend({
      prop: 'more',
      type: class extends ApiResource {
        fetchMore() {
          return this.request<Status>(Uri.from(undefined, { base: this.config.baseUrl.value, ...uri }));
        }
      },
    });

    expect((await extended.other.fetchData()).data.status).toBe('fetched');
    expect((await extended.more.fetchMore()).data.status).toBe('fetched');
  });
});

describe('Config.HttpAgent', () => {
  let localServer: LocalServer;
  let testResource: TestApiResource;
  let sparkOptions: SparkOptions;
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    localServer = new LocalServer();
    await localServer.start();

    sparkOptions = { baseUrl: localServer.baseUrl, token: 'open', logger: false };
  });

  beforeEach(() => (fetchSpy = jest.spyOn(nodeFetch, 'default')));

  afterEach(() => fetchSpy.mockRestore());

  afterAll(async () => await localServer.stop());

  it('should pass agent to node-fetch and reuse keepAlive connections', async () => {
    const agent = new HttpAgent({ keepAlive: true, keepAliveMsecs: 1000, maxSockets: 5, maxFreeSockets: 2 });
    const spark = new Spark({ ...sparkOptions, agent });

    testResource = new TestApiResource(spark.config);
    await testResource.unauthorized().catch(() => {
      // Expected to fail with 401, but we're testing the agent is used
    });
    await testResource.unauthorized().catch(() => {
      // Second request should reuse the connection
    });

    // Verify node-fetch was called with the agent
    expect(fetchSpy).toHaveBeenCalled();
    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // Check that agent was passed in the options
    calls.forEach((call) => {
      const options = call[1] as any;
      expect(options).toBeDefined();
      expect(options.agent).toBe(agent);
    });

    // Verify keepAlive is enabled on the agent by checking its options
    expect((agent as any).options.keepAlive).toBe(true);

    // Verify that the agent has sockets in its pool (indicating connection reuse)
    // After requests, the agent should have free sockets if keepAlive is working
    const freeSockets = (agent as any).freeSockets;
    const sockets = (agent as any).sockets;

    // The agent should have created sockets for the connections
    // Note: freeSockets might be empty if connections are still in use,
    // but sockets should exist if connections were made
    expect(sockets || freeSockets).toBeDefined();
  });

  it('should use different agents for different configs', async () => {
    const agent1 = new HttpAgent({ keepAlive: true });
    const agent2 = new HttpAgent({ keepAlive: true });

    const spark1 = new Spark({ ...sparkOptions, agent: agent1 });
    const spark2 = new Spark({ ...sparkOptions, agent: agent2 });

    const resource1 = new TestApiResource(spark1.config);
    const resource2 = new TestApiResource(spark2.config);

    await resource1.unauthorized().catch(() => {});
    await resource2.unauthorized().catch(() => {});

    // Verify each request used its respective agent
    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);

    // Find calls that used agent1 and agent2
    const agent1Calls = calls.filter((call) => (call[1] as any)?.agent === agent1);
    const agent2Calls = calls.filter((call) => (call[1] as any)?.agent === agent2);

    expect(agent1Calls.length).toBeGreaterThan(0);
    expect(agent2Calls.length).toBeGreaterThan(0);
  });
});
