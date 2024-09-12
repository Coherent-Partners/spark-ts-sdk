import Spark from '../../src';
import LocalServer from './_server';

describe('Spark.folders', () => {
  const localSever = new LocalServer();
  let spark: Spark;

  beforeAll(async () => {
    await localSever.start();
    spark = new Spark({ baseUrl: localSever.baseUrl, apiKey: 'open', logger: false });
  });

  afterAll(async () => localSever.stop());

  it('should retrieve a list of folder categories', async () => {
    const res = await spark.folders.getCategories();
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.status).toBe('Success');
    expect(res.data.data).toHaveLength(1); // Spark API returns more categories.
    expect(res.data.data[0].key).toBe('Other');
  });
});
