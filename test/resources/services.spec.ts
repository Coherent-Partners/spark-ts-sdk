import Spark, { ApiResource } from '@cspark/sdk';
import LocalServer from './_server';

describe('Spark.services', () => {
  const localSever = new LocalServer();
  const apiRequest = jest.spyOn(ApiResource.prototype as any, 'request');
  let spark: Spark;

  beforeAll(async () => {
    await localSever.start();
    spark = new Spark({ baseUrl: localSever.baseUrl, apiKey: 'open', logger: false });
  });

  afterAll(async () => localSever.stop());

  it('should execute a service with default inputs', async () => {
    const res = await spark.services.execute('my-folder/my-service', { responseFormat: 'original' });

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

    const data = res.data as any;
    expect(res.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.status).toBe('Success');
    expect(data.response_data.outputs).toBeDefined();
    expect(data.response_data.outputs.my_output).toBe(42);
  });

  it('should execute a service with inputs', async () => {
    const res = await spark.services.execute(
      {
        folder: 'my-folder',
        service: 'my-service',
        public: true,
      },
      { inputs: { my_input: 13 }, responseFormat: 'original' },
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

    const data = res.data as any;
    expect(res.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.status).toBe('Success');
    expect(data.response_data.outputs).toBeDefined();
    expect(data.response_data.outputs.my_output).toBe(44);
  });
});
