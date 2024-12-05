import { Buffer } from 'buffer';
import Spark, { ApiResource } from '../../src';
import * as API from '../../src/resources';
import { Streamer } from '../../src/streaming';
import LocalServer from './_server';

describe('Spark.services', () => {
  const localSever = new LocalServer();
  const apiRequest = jest.spyOn(ApiResource.prototype as any, 'request');
  let services: API.Services;

  beforeAll(async () => {
    await localSever.start();
    services = new Spark({ baseUrl: localSever.baseUrl, apiKey: 'open', logger: false }).services;
  });

  afterAll(async () => localSever.stop());

  it('can execute a service with default inputs', async () => {
    const res = await services.execute('my-folder/my-service', { responseFormat: 'original' });

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
      { folder: 'my-folder', service: 'my-service', public: true },
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

  it('can execute a service with metadata', async () => {
    const res = await services.execute(
      { versionId: 'version_uuid', public: true },
      {
        inputs: { single_input: 13 },
        subservices: ['sub1', 'sub2'],
        callPurpose: 'Test',
        compilerType: 'Xconnector',
        activeSince: '2021-01-01',
        echoInputs: true,
        downloadable: true,
        selectedOutputs: ['my_output'],
        correlationId: 'corr_uuid',
        sourceSystem: 'Script',
      },
    );

    expect(apiRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        headers: {},
        body: {
          request_data: { inputs: { single_input: 13 } },
          request_meta: {
            call_purpose: 'Test',
            compiler_type: 'Xconnector',
            correlation_id: 'corr_uuid',
            excel_file: true,
            requested_output: 'my_output',
            response_data_inputs: true,
            service_category: 'sub1,sub2',
            source_system: 'Script',
            transaction_date: '2021-01-01T00:00:00.000Z',
            version_id: 'version_uuid',
          },
        },
      }),
    );

    const data = res.data as any;
    expect(res.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.outputs).toEqual([{ single_output: 42 }]);
    expect(data.version_id).toBe('version_uuid');
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

  it('can download the original or configured excel file', async () => {
    const res = await services.download({ folder: 'my-folder', service: 'my-service', type: 'configured' });

    expect(apiRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: { filename: '', type: 'withmetadata' } }),
    );

    const expected = Buffer.from('fake excel file');
    expect(res.status).toBe(200);
    expect(res.data).toBeNull();
    expect(res.headers['content-length']).toBe(expected.length.toString());

    const buffer = await Streamer.toBuffer(res.buffer);
    expect(buffer.toString()).toBe(expected.toString());
  });
});
