import Spark, { ApiResource } from '@cspark/sdk';
import LocalServer, { TestBaseUrl } from './_server';

describe('Spark.service', () => {
  const localSever = new LocalServer();
  const apiRequest = jest.spyOn(ApiResource.prototype as any, 'request');
  let spark: Spark;

  type Inputs = { my_input: number };
  type Outputs = { my_output: number };

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

  it('should execute a service with default inputs', async () => {
    const res = await spark.service.execute<Outputs>('my-folder/my-service');

    expect(apiRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        body: {
          request_data: { inputs: {} }, // default inputs
          request_meta: { call_purpose: 'Single Execution', compiler_type: 'Neuron', source_system: 'Spark JS SDK' },
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.status).toBe('Success');
    expect(res.data.response_data.outputs).toBeDefined();
    expect(res.data.response_data.outputs.my_output).toBe(42);
  });

  it('should execute a service with inputs', async () => {
    const res = await spark.service.execute<Inputs, Outputs>(
      {
        folder: 'my-folder',
        service: 'my-service',
        public: true,
      },
      { inputs: { my_input: 13 } },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        body: {
          request_data: { inputs: { my_input: 13 } }, // user-defined inputs
          request_meta: { call_purpose: 'Single Execution', compiler_type: 'Neuron', source_system: 'Spark JS SDK' },
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.status).toBe('Success');
    expect(res.data.response_data.outputs).toBeDefined();
    expect(res.data.response_data.outputs.my_output).toBe(44);
  });
});
