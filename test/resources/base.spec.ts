import { SparkError, Uri } from '@cspark/sdk';

describe('Uri', () => {
  const BASE_URL = 'https://excel.test.coherent.global/tenant-name';

  it('should build url from partial resources', () => {
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

  it('should build url from uri params', () => {
    expect(Uri.from({ folder: 'f', service: 's' }, { base: BASE_URL, endpoint: 'execute' }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v3/folders/f/services/s/execute',
    );

    expect(Uri.from(undefined, { base: BASE_URL, version: 'api/v4', endpoint: 'execute' }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v4/execute',
    );

    expect(Uri.from({ public: true }, { base: BASE_URL, version: 'api/v4', endpoint: 'execute' }).value).toBe(
      'https://excel.test.coherent.global/tenant-name/api/v4/public/execute',
    );

    expect(
      Uri.from(
        { folder: 'high', service: 'priority', versionId: 'low-priority' },
        { base: BASE_URL, endpoint: 'execute' },
      ).value,
    ).toBe('https://excel.test.coherent.global/tenant-name/api/v3/folders/high/services/priority/execute');

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

  it('should throw an error if wrong uri params', () => {
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
});
