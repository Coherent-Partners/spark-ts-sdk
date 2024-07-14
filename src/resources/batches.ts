import { type Config } from '../config';
import { HttpResponse } from '../http';
import { SPARK_SDK, BATCH_CHUNK_SIZE } from '../constants';
import { SparkError } from '../error';
import Utils, { DateUtils, StringUtils, getUuid } from '../utils';

import { ApiResource, Uri, UriOptions } from './base';

export class Batches extends ApiResource {
  readonly baseUri!: UriOptions;
  constructor(config: Config) {
    super(config);
    this.baseUri = { base: this.config.baseUrl.full, version: 'api/v4' };
  }

  /**
   * Describes the batch pipelines available across the tenant.
   * @returns {Promise<HttpResponse<BatchDescribed>>} the batch pipeline details
   */
  describe(): Promise<HttpResponse<BatchDescribed>> {
    return this.request(Uri.from(undefined, { ...this.baseUri, endpoint: `batch/status` }));
  }

  /**
   * Creates a batch pipeline for asynchronous execution.
   * @param {string} uri - where the service is located
   * @returns {Promise<HttpResponse<BatchCreated>>} the batch pipeline details
   */
  create(uri: string, options?: PipelineOptions): Promise<HttpResponse<BatchCreated>>;
  /**
   * Creates a batch pipeline for asynchronous execution.
   * @param {CreateParams} params - where the service is located and additional metadata
   * @returns {Promise<HttpResponse<BatchCreated>>} the batch pipeline details
   */
  create(params: CreateParams, options?: PipelineOptions): Promise<HttpResponse<BatchCreated>>;
  create(uri: string | CreateParams, options?: PipelineOptions): Promise<HttpResponse<BatchCreated>> {
    const { folder, service, version, serviceId, ...params } = Uri.validate(uri);
    const serviceUri = serviceId ?? params?.serviceUri ?? Uri.encode({ folder, service, version }, false);
    const url = Uri.from(undefined, { ...this.baseUri, endpoint: 'batch' });

    const body = {
      service: serviceUri,
      version_id: params.versionId,
      version_by_timestamp: DateUtils.isDate(params?.activeSince) ? params.activeSince.toISOString() : undefined,
      subservice: StringUtils.join(params.subservices),
      output: StringUtils.join(params.selectedOutputs),
      call_purpose: params.callPurpose ?? 'Async Batch Execution',
      source_system: params.sourceSystem ?? SPARK_SDK,
      correlation_id: params.correlationId,
      unique_record_key: params.inputKey,
      // Experimental parameters (likely to change/be deprecated in future releases)
      initial_workers: options?.minRunners,
      max_workers: options?.maxRunners,
      chunks_per_request: options?.chunksPerVM,
      runner_thread_count: options?.runnersPerVM,
      max_input_size: options?.maxInputSize,
      max_output_size: options?.maxOutputSize,
      acceptable_error_percentage: Math.ceil((1 - Math.min(options?.accuracy ?? 1, 1.0)) * 100), // ensure 0.0 to 1.0
    };

    return this.request<BatchCreated>(url, { method: 'POST', body });
  }

  /**
   * Handles a batch pipeline.
   * @param {string} batchId - the batch pipeline identifier
   */
  of(batchId: string): Pipeline {
    return new Pipeline(batchId, this.config);
  }
}

/**
 * A batch pipeline for asynchronous execution.
 *
 * This is an experimental feature and may change in future releases.
 * @see https://docs.coherent.global/spark-apis/batch-apis
 */
class Pipeline extends ApiResource {
  #state: PipelineState = 'open';
  #chunks: Map<string, number> = new Map();

  readonly id!: string;
  readonly baseUri!: UriOptions;

  constructor(batchId: string, config: Config) {
    super(config);
    this.id = batchId?.trim();
    this.baseUri = { base: this.config.baseUrl.full, version: 'api/v4' };

    if (StringUtils.isEmpty(this.id)) {
      const error = SparkError.sdk('batch pipeline id is required to proceed');
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Gets the state of the batch pipeline.
   * @returns {'open' | 'closed' | 'cancelled'} the batch pipeline state
   */
  get state(): PipelineState {
    return this.#state;
  }

  /**
   * Gets a summary of data submission of the batch pipeline.
   * @returns the total number of records and chunks processed.
   */
  get stats(): { records: number; chunks: number } {
    return {
      chunks: this.#chunks.size,
      records: Array.from(this.#chunks.values()).reduce((sum, size) => sum + size, 0),
    };
  }

  /**
   * Gets batch information.
   * @returns {Promise<HttpResponse<BatchInfo>>} the batch info.
   *
   * IMPORTANT: This method is experimental and may change in future releases.
   */
  getInfo(): Promise<HttpResponse<BatchInfo>> {
    return this.request(Uri.from(undefined, { ...this.baseUri, endpoint: `batch/${this.id}` }));
  }

  /**
   * Gets the status of a batch pipeline.
   * @returns {Promise<HttpResponse<BatchStatus>>} the batch status
   */
  getStatus(): Promise<HttpResponse<BatchStatus>> {
    return this.request(Uri.from(undefined, { ...this.baseUri, endpoint: `batch/${this.id}/status` }));
  }

  /**
   * Pushes data to a batch pipeline.
   * @param {PushDataParams<Inputs>} params - the data to push to the batch pipeline.
   * @param {PushDataOptions} options - the options to consider when multiple chunks are provided.
   * @returns a record submission summary.
   * @throws {SparkError} if the data params are invalid.
   *
   * There are three convenient ways to push data to a batch pipeline:
   * 1. array of `params.chunks`, each with a unique id and data.
   * 2. object with `params.data`, including inputs, parameters, and summary.
   * 3. array of `params.inputs` to be processed.
   *
   * When working with an array of `params.chunks`, you can specify how to handle
   * duplicated ids:
   * - 'ignore': warns you about any duplication before proceeding.
   * - 'replace' (default): replaces the duplicated id with a new one generated by the SDK.
   * - 'throw': throws an error indicating which chunk is duplicated (as part of the `SparkError.cause`).
   */
  async push<Inputs>(params: PushDataParams<Inputs>, options?: PushDataOptions) {
    this.#assertState(['closed', 'cancelled']);

    const url = Uri.from(undefined, { ...this.baseUri, endpoint: `batch/${this.id}/chunks` });
    const body = this.#buildPushBody(params, options);
    return this.request<RecordSubmitted, Chunks<Inputs>>(url, { method: 'POST', body }).then((response) => {
      this.logger.log(`pushed ${response.data.record_submitted} records to batch pipeline <${this.id}>`);
      return response;
    });
  }

  /**
   * Pulls the results from a batch pipeline.
   * @param {number} max - the maximum number of chunks to pull (default: 100)
   * @returns {Promise<HttpResponse<BatchResult<Outputs>>} the batch results
   */
  async pull<Outputs>(max: number = 100): Promise<HttpResponse<BatchResult<Outputs>>> {
    this.#assertState(['cancelled']);

    const endpoint = `batch/${this.id}/chunkresults?max_chunks=${max}`;
    return this.request<BatchResult<Outputs>>(Uri.from(undefined, { ...this.baseUri, endpoint })).then((response) => {
      this.logger.log(`${response.data.status.records_available} available records from batch pipeline <${this.id}>`);
      return response;
    });
  }

  /**
   * Closes a batch pipeline.
   *
   * If you no longer have any more data to add to the batch, you can close the batch.
   * After closing a batch, batch will still process the data and user will be able
   * to download the remaining output from get chunk results API.
   * @returns {Promise<HttpResponse<BatchDisposed>>} the batch status
   */
  async close(): Promise<HttpResponse<BatchDisposed>> {
    this.#assertState(['closed', 'cancelled']);

    const url = Uri.from(undefined, { ...this.baseUri, endpoint: `batch/${this.id}` });
    return this.request<BatchDisposed>(url, { method: 'PATCH', body: { batch_status: 'closed' } }).then((response) => {
      this.#state = 'closed';
      this.logger.log(`batch pipeline <${this.id}> has been closed`);
      return response;
    });
  }

  /**
   * Cancels a batch pipeline.
   *
   * When batch is not working as expected or you have made a mistake and you can
   * cancel the batch to immediately stop further processing. You won't be able
   * to download anymore data after canceling a batch.
   * @returns {Promise<HttpResponse<BatchDisposed>>} the batch status
   */
  async cancel(): Promise<HttpResponse<BatchDisposed>> {
    this.#assertState(['cancelled', 'closed']);

    const url = Uri.from(undefined, { ...this.baseUri, endpoint: `batch/${this.id}` });
    return this.request<BatchDisposed>(url, { method: 'PATCH', body: { batch_status: 'cancelled' } }).then(
      (response) => {
        this.#state = 'cancelled';
        this.logger.log(`batch pipeline <${this.id}> has been cancelled`);
        return response;
      },
    );
  }

  #assertState(states: PipelineState[], throwable = true): boolean {
    if (states.includes(this.#state)) {
      const error = SparkError.sdk(`batch pipeline <${this.id}> is already ${this.#state}`);
      this.logger.error(error.message);
      if (throwable) throw error;
      return true;
    }
    return false;
  }

  #buildPushBody<Inputs>(
    params: PushDataParams<Inputs>,
    { ifChunkIdDuplicated: ifDuplicated = 'replace', chunkSize = BATCH_CHUNK_SIZE }: PushDataOptions = {},
  ): Chunks<Inputs> {
    try {
      const { chunks, data, inputs } = params ?? {};

      if (Utils.isNotEmptyArray(chunks)) return { chunks: this.#assessChunks(chunks, ifDuplicated) };
      if (Utils.isNotEmptyArray(data?.inputs))
        return { chunks: this.#assessChunks([{ id: getUuid(), data }], ifDuplicated) };
      if (Utils.isNotEmptyArray(inputs)) {
        return { chunks: this.#assessChunks(createChunks(inputs, chunkSize), ifDuplicated) };
      }

      throw SparkError.sdk({
        cause: params,
        message: ''.concat(
          `wrong data params were provided for this pipeline <${this.id}>.\n`,
          'Provide object including either chunks, data, or inputs to proceed.',
        ),
      });
    } catch (error) {
      if (error instanceof SparkError) this.logger.error(error.message);
      throw error;
    }
  }

  #assessChunks<T>(chunks: BatchChunk<T>[], ifIdDuplicated: IfChunkIdDuplicated) {
    for (const chunk of chunks) {
      const id = StringUtils.isEmpty(chunk.id) ? getUuid() : chunk.id.trim();

      if (this.#chunks.has(id)) {
        if (ifIdDuplicated === 'ignore') {
          this.logger.warn(
            ''.concat(
              `chunk id <${id}> appears to be duplicated for this pipeline <${this.id}> `,
              'and may cause unexpected behavior. You should consider using a different id.',
            ),
          );
          continue;
        }

        if (ifIdDuplicated === 'throw') {
          throw SparkError.sdk({
            message: `chunk id <${id}> is duplicated for batch pipeline <${this.id}>`,
            cause: chunk,
          });
        }

        if (ifIdDuplicated === 'replace') {
          chunk.id = Utils.getUuid();
          this.logger.log(
            ''.concat(
              `chunk id <${id}> is duplicated for this pipeline <${this.id}> `,
              `and has been replaced with <${chunk.id}>`,
            ),
          );
        }
      }

      this.#chunks.set(chunk.id, (chunk.size ??= chunk.data?.inputs?.length ?? 0));
    }
    return chunks;
  }
}

interface MetadataParams {
  serviceUri?: string;
  versionId?: string;
  activeSince?: number | string | Date;
  subservices?: string | string[];
  selectedOutputs?: string | string[];
  callPurpose?: string;
  sourceSystem?: string;
  correlationId?: string;
}

interface CreateParams extends MetadataParams {
  folder?: string;
  service?: string;
  version?: string;
  serviceId?: string;
  inputKey?: string;
}

// Experimental parameters (likely to change/be deprecated in future releases)
interface PipelineOptions {
  /**
   * The number of concurrent runners used to initialize a batch job in a VM before
   * ramping up (defaults to 10).
   */
  minRunners?: number;
  /**
   * The maximum number of concurrent runners allowed in a VM (defaults to 100).
   *
   * This is a safety net to prevent a batch from consuming all resources in a tenant.
   * If and when this limit is reached, the next batch request will have to wait until
   * resources are available so that it can be processed.
   */
  maxRunners?: number;
  /**
   * The number of chunks to be processed by all VMs (defaults to 2).
   *
   * Every VM will pull this number of chunks at a time until all chunks are processed.
   * Whichever VM finishes its chunks first will pull more chunks to process if any leftovers.
   * This is a way to balance the load across all VMs and make the batch job more efficient.
   */
  chunksPerVM?: number;
  /**
   * The number of runners per VM (defaults to 2).
   *
   * These runners will be used to process the chunks pulled by the VM. Ideally,
   * when this number matches the number of `chunksPerVM`, the batch job will be
   * processed faster as each runner will process a separate chunk.
   */
  runnersPerVM?: number;
  /**
   * The size (in MB) of the maximum input buffer a batch pipeline can support.
   */
  maxInputSize?: number;
  /**
   * The size (in MB) of the maximum output buffer a batch pipeline can support.
   */
  maxOutputSize?: number;
  /**
   * The percentage of acceptable error rate (defaults to 1.0 aka 100%).
   *
   * By nature, batch jobs are intended to process large amounts of data and it
   * is possible that some records may fail to process as expected or throw errors.
   * Keep in mind that there's no self-correction mechanism in place.
   *
   * With this parameter, you may choose a value between 0.0 and 1.0 to indicate
   * how accurate you want the batch job to be. For instance, if you set this to
   * 0.95, 5% of error rate is acceptable and the batch job will complete successfully.
   */
  accuracy?: number;
}

type BatchDescribed = {
  in_progress_batches: any[];
  recent_batches: {
    object: string;
    id: string;
    data: {
      pipeline_status: string;
      summary: {
        records_submitted: number;
        records_failed: number;
        records_completed: number;
        compute_time_ms: number;
        batch_time_ms: number;
      };
      response_timestamp: string;
      batch_status: string;
      created_by: string;
      created_timestamp: string;
      updated_timestamp: string;
      service_uri: string;
    };
  }[];
  tenant: {
    configuration: {
      input_buffer_allocated_bytes: number;
      output_buffer_allocated_bytes: number;
      max_workers: number;
    };
    status: {
      input_buffer_used_bytes: number;
      input_buffer_remaining_bytes: number;
      output_buffer_used_bytes: number;
      output_buffer_remaining_bytes: number;
      workers_in_use: number;
    };
  };
  environment: { update: number };
};

type BatchCreated = {
  object: string;
  id: string;
  data: {
    service_id: string;
    version_id: string;
    compiler_version: string;
    correlation_id: string | null;
    source_system: string | null;
    unique_record_key: string | null;
    response_timestamp: string;
    batch_status: string;
    created_by: string;
    created_timestamp: string;
    updated_timestamp: string;
    service_uri: string;
  };
};

type RecordSubmitted = {
  request_timestamp: string;
  batch_status: string;
  pipeline_status: string;
  input_buffer_used_bytes: number;
  input_buffer_remaining_bytes: number;
  output_buffer_used_bytes: number;
  output_buffer_remaining_bytes: number;
  records_available: number;
  compute_time_ms: number;
  records_completed: number;
  record_submitted: number;
};

type BatchStatus = {
  batch_status: string;
  pipeline_status: string;
  input_buffer_used_bytes: number;
  input_buffer_remaining_bytes: number;
  output_buffer_used_bytes: number;
  output_buffer_remaining_bytes: number;
  compute_time_ms: number;
  records_available: number;
  records_completed: number;
  record_submitted: number;
  request_timestamp: string;
};

type BatchInfo = {
  object: string;
  id: string;
  data: {
    service_id: string;
    version_id: string;
    compiler_version: string;
    correlation_id: string | null;
    source_system: string | null;
    unique_record_key: string | null;
    summary: {
      chunks_submitted: number;
      chunks_retried: number;
      chunks_completed: number;
      chunks_failed: number;
      records_retried: number;
      input_size_bytes: number;
      output_size_bytes: number;
      avg_compute_time_ms: number;
      records_submitted: number;
      records_failed: number;
      records_completed: number;
      compute_time_ms: number;
      batch_time_ms: number;
    };
    configuration: {
      initial_workers: number;
      chunks_per_request: number;
      runner_thread_count: number;
      acceptable_error_percentage: number;
      input_buffer_allocated_bytes: number;
      output_buffer_allocated_bytes: number;
      max_workers: number;
    };
    response_timestamp: string;
    batch_status: string;
    created_by: string;
    created_timestamp: string;
    updated_timestamp: string;
    service_uri: string;
  };
};

type BatchResult<Outputs = any> = {
  data: {
    id: string;
    summary_output: any[];
    outputs: Outputs[];
    warnings: any[];
    errors: any[];
    process_time: number[];
  }[];
  status: {
    request_timestamp: string;
    response_timestamp: string;
    batch_status: string;
    pipeline_status: string;
    input_buffer_used_bytes: number;
    input_buffer_remaining_bytes: number;
    output_buffer_used_bytes: number;
    output_buffer_remaining_bytes: number;
    records_available: number;
    compute_time_ms: number;
    records_completed: number;
    record_submitted: number;
    chunks_completed: number;
    chunks_submitted: number;
    chunks_available: number;
    workers_in_use: number;
  };
};

type BatchDisposed = {
  object: string;
  id: string;
  meta: {
    service_id: string;
    version_id: string;
    compiler_version: string;
    correlation_id: string | null;
    source_system: string | null;
    unique_record_key: string | null;
    response_timestamp: string;
    batch_status: string;
    created_by: string;
    created_timestamp: string;
    updated_timestamp: string;
    service_uri: string;
  };
};

interface PushDataOptions {
  ifChunkIdDuplicated?: IfChunkIdDuplicated;
  chunkSize?: number;
}

interface PushDataParams<Inputs = any> {
  chunks?: BatchChunk<Inputs>[];
  data?: ChunkData<Inputs>;
  inputs?: Inputs[];
}

interface ChunkData<Inputs> {
  inputs: Inputs[];
  parameters: Record<string, any>;
  summary?: Record<string, any>;
}

type BatchChunk<Input> = { id: string; data: ChunkData<Input>; size?: number };
type PipelineState = 'open' | 'closed' | 'cancelled';
type IfChunkIdDuplicated = 'ignore' | 'replace' | 'throw';
type Chunks<T> = { chunks: BatchChunk<T>[] };

/**
 * Creates an array of batch chunks from a dataset.
 *
 * @template T - The type of elements in the dataset.
 * @param {T[]} dataset - The dataset to create chunks from.
 * @param {number} [chunkSize=200] - The size of each chunk.
 * @returns {BatchChunk<T>[]} An array of batch chunks.
 */
export function createChunks<T = any>(dataset: T[], chunkSize: number = BATCH_CHUNK_SIZE): BatchChunk<T>[] {
  const total = dataset.length;
  const batchSize = Math.ceil(total / chunkSize);
  const chunks: BatchChunk<T>[] = [];

  for (let i = 0; i < batchSize; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, total);
    const chunk = dataset.slice(start, end);
    chunks.push({ id: getUuid(), data: { inputs: chunk, parameters: {} } });
  }

  return chunks;
}
