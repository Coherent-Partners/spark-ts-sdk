import Spark, { ApiResource, SparkSdkError, createChunks } from '../../src';
import * as API from '../../src/resources';
import LocalServer from './_server';

const RAW_DATA = `
{
  "chunks": [
    {
      "id": "0001",
      "size": 2,
      "data": {
        "inputs": [
          ["sale_id", "price", "quantity"],
          [1, 20, 65],
          [2, 74, 73]
        ],
        "parameters": {"tax": 0.1}
      }
    },
    {
      "size": 1,
      "data": {
        "inputs": [
          ["sale_id", "price", "quantity"],
          [3, 20, 65]
        ],
        "summary": {
          "ignore_error": false,
          "aggregation": [{"output_name": "total", "operator": "SUM"}
          ]
        }
      }
    }
  ]
}
`;

describe('Spark.Batches', () => {
  it('should throw an error if raw string parsing fails', () => {
    expect(() => API.Batches.toChunks('invalid-json')).toThrow(SparkSdkError);
  });

  it('can parse raw string into object', () => {
    const chunks = API.Batches.toChunks(RAW_DATA);
    expect(chunks.length).toBe(2);

    expect(chunks[0].id).toBe('0001');
    expect(chunks[0].size).toBe(2);
    expect(chunks[0].data.inputs).toEqual([
      ['sale_id', 'price', 'quantity'],
      [1, 20, 65],
      [2, 74, 73],
    ]);
    expect(chunks[0].data.parameters).toEqual({ tax: 0.1 });
    expect(chunks[0].data.summary).toBeUndefined();

    expect(chunks[1].id).toBeDefined();
    expect(chunks[1].size).toBe(1);
    expect(chunks[1].data.inputs).toEqual([
      ['sale_id', 'price', 'quantity'],
      [3, 20, 65],
    ]);
    expect(chunks[1].data.parameters).toEqual({});
    expect(chunks[1].data.summary).toEqual({
      ignore_error: false,
      aggregation: [{ output_name: 'total', operator: 'SUM' }],
    });
  });

  it('can parse raw array into batch chunks', () => {
    const chunks = API.Batches.toChunks(
      '[{"id": "0042", "data": {"inputs": [["sale_id", "price", "quantity"], [41, 42, 43]]}}]',
    ); // key 'chunks' is optional

    expect(chunks.length).toBe(1);
    expect(chunks[0].id).toBe('0042');
    expect(chunks[0].data.inputs).toEqual([
      ['sale_id', 'price', 'quantity'],
      [41, 42, 43],
    ]);
    expect(chunks[0].data.parameters).toEqual({});
    expect(chunks[0].data.summary).toBeUndefined();
  });

  it('can distribute input dataset evenly into batch chunks', () => {
    const inputs = [
      [1, 20, 65],
      [2, 74, 73],
      [3, 20, 65],
      [4, 34, 73],
      [5, 62, 62],
    ];
    const chunks = createChunks(inputs, 3);

    expect(chunks.length).toBe(2);
    expect(chunks[0].size).toBe(3);
    expect(chunks[1].size).toBe(2);

    expect(chunks[0].data.inputs).toEqual([
      [1, 20, 65],
      [2, 74, 73],
      [3, 20, 65],
    ]);
    expect(chunks[1].data.inputs).toEqual([
      [4, 34, 73],
      [5, 62, 62],
    ]);
    expect(chunks[0].data.parameters).toEqual({});
    expect(chunks[1].data.parameters).toEqual({});
    expect(chunks[0].data.summary).toBeUndefined();
    expect(chunks[1].data.summary).toBeUndefined();
  });
});

describe('Spark.batches', () => {
  const localSever = new LocalServer();
  const apiRequest = jest.spyOn(ApiResource.prototype as any, 'request');
  let batches: API.Batches;

  beforeAll(async () => {
    await localSever.start();
    batches = new Spark({ baseUrl: localSever.baseUrl, apiKey: 'open', logger: false }).batches;
  });

  afterAll(async () => localSever.stop());

  it('can execute a batch pipeline from start to finish', async () => {
    const batch = await batches.create('f/s', { minRunners: 100, runnersPerVM: 4, accuracy: 0.9 });

    expect(apiRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        body: {
          service: 'f/s',
          call_purpose: 'Async Batch Execution',
          source_system: 'Spark JS SDK',
          initial_workers: 100,
          runner_thread_count: 4,
          acceptable_error_percentage: 10,
        },
      }),
    );
    expect(batch.status).toBe(200);
    expect(batch.data.object).toBe('batch');
    expect(batch.data.id).toBe('batch_uuid');

    const pipeline = batches.of(batch.data.id);
    expect(pipeline.isDipsosed).toBe(false);
    expect(pipeline.state).toBe('open');
    expect(pipeline.stats).toEqual({ records: 0, chunks: 0 });
    expect(async () => await pipeline.push({})).rejects.toThrow(SparkSdkError);

    const submission = await pipeline.push({ raw: RAW_DATA });
    expect(pipeline.stats).toEqual({ records: 3, chunks: 2 });
    expect(submission.status).toBe(200);
    expect(submission.data.record_submitted).toBe(3);

    // what if we push the same chunk again?
    expect(async () => await pipeline.push({ raw: RAW_DATA }, { ifChunkIdDuplicated: 'throw' })).rejects.toThrow(
      SparkSdkError, // because chunk id already exists
    );

    const results = await pipeline.pull(2);
    expect(results.status).toBe(200);
    expect(results.data.data.length).toBe(2);
    expect(results.data.data.reduce((sum, r) => sum + r.outputs.length, 0)).toBe(3); // 2+1=3 outputs

    await pipeline.close();
    expect(apiRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'PATCH', body: { batch_status: 'closed' } }),
    );

    expect(pipeline.isDipsosed).toBe(true);
    expect(async () => await pipeline.cancel()).rejects.toThrow(SparkSdkError); // pipeline already closed
  });
});
