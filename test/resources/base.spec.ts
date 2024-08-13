import Utils from '@cspark/sdk/utils';
import Spark, { SparkError, SparkApiError, AbortError, Uri, ApiResource } from '@cspark/sdk';
import LocalServer, { TestApiResource } from './_server';

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
    expect(() => Uri.from(undefined, { base: BASE_URL })).not.toThrow(SparkError);
    expect(() => Uri.partial('', { base: BASE_URL })).not.toThrow(SparkError);

    // Forcing a wrong base url to test failure to build a URL. During runtime, the base url
    // will be valid at this point.
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
