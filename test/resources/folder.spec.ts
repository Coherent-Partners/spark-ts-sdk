import Spark from '@cspark/sdk';
import LocalServer, { TestBaseUrl } from './_server';

describe('Spark.folder', () => {
  const localSever = new LocalServer();
  let spark: Spark;

  beforeAll(async () => {
    await localSever.start();
    spark = new Spark({
      baseUrl: new TestBaseUrl(`http://${localSever.hostname}:${localSever.port}`, 'my-tenant'),
      apiKey: 'open',
      logger: false,
    });
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

  afterAll(async () => {
    return localSever.stop();
  });

  it('should retrieve a list of folder categories', async () => {
    const res = await spark.folder.getCategories();
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.status).toBe('Success');
    expect(res.data.data).toHaveLength(1); // Spark API returns more
    expect(res.data.data[0].key).toBe('Other');
  });
});
