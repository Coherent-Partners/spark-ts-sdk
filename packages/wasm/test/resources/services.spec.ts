import { ApiResource } from '@cspark/sdk';
import Hybrid from '../../src';
import * as API from '../../src/resources';
import LocalServer from './_server';

describe('Client.services', () => {
  const localSever = new LocalServer();
  const apiRequest = jest.spyOn(ApiResource.prototype as any, 'request');
  let services: API.Services;

  beforeAll(async () => {
    await localSever.start();
    services = new Hybrid({ baseUrl: localSever.baseUrl, token: 'open', logger: false }).services;
  });

  afterAll(async () => localSever.stop());

  it('can execute a service with default inputs', async () => {
    const res = await services.execute('f/s', { responseFormat: 'original' });

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

  it('can execute a service with single inputs', async () => {
    const res = await services.execute(
      { folder: 'f', service: 's', public: true },
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

  it('can execute a service with multiple inputs', async () => {
    const res = await services.execute('service/service_uuid', { inputs: [{ my_input: 13 }, { my_input: 14 }] });

    expect(apiRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        body: {
          service: 'service_uuid',
          inputs: [{ my_input: 13 }, { my_input: 14 }],
          call_purpose: 'Sync Batch Execution',
          source_system: 'Spark JS SDK',
        },
      }),
    );

    const data = res.data as any;
    expect(res.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.outputs).toEqual([{ my_output: 42 }, { my_output: 43 }]);
    expect(data.process_time).toEqual([4, 2]);
    expect(data.service_id).toBe('service_uuid');
  });
});
