import { type Config } from '../config';
import { HttpResponse } from '../http';
import { Serializable } from '../data';
import { SPARK_SDK } from '../constants';
import { SparkError } from '../error';
import Utils, { DateUtils, StringUtils, getUuid } from '../utils';

import { ApiResource, Uri, UriOptions, UriParams } from './base';

export class Batch extends ApiResource {
  /**
   * Executes multiple records synchronously.
   * @param {string} uri - how to locate the service
   * @param {ExecuteParams<Inputs>} params - the execution parameters (inputs, metadata, etc.)
   * @returns {Promise<HttpResponse<ServiceExecuted<Outputs>>} the executed service outputs
   * @throws {SparkError} if the service execution fails or no inputs are provided.
   */
  execute<Inputs, Outputs>(uri: string, params: ExecuteParams<Inputs>): Promise<HttpResponse<ServiceExecuted<Outputs>>>;
  /**
   * Executes multiple records synchronously.
   * @param {UriParams} uri - use fine-grained details to locate the service
   * @param {ExecuteParams<Inputs>} params - the execution parameters (inputs, metadata, etc.)
   * @returns {Promise<HttpResponse<ServiceExecuted<Outputs>>} the executed service outputs
   * @throws {SparkError} if the service execution fails or no inputs are provided.
   */
  execute<Inputs, Outputs>(
    uri: Omit<UriParams, 'proxy'>,
    params: ExecuteParams<Inputs>,
  ): Promise<HttpResponse<ServiceExecuted<Outputs>>>;
  execute<Inputs, Outputs>(
    uri: string | Omit<UriParams, 'proxy'>,
    params: ExecuteParams<Inputs>,
  ): Promise<HttpResponse<ServiceExecuted<Outputs>>> {
    const { folder, service, version, serviceId, versionId, ...rest } = Uri.toParams(uri);
    const serviceUri = serviceId ?? params?.data?.serviceUri ?? Uri.encode({ folder, service, version }, false);
    const url = Uri.from(rest, { base: this.config.baseUrl.full, version: 'api/v4', endpoint: 'execute' });
    const body = this.#buildExecuteBody({ serviceUri, versionId }, params);

    if (body.inputs.length === 0) {
      const error = SparkError.sdk({ message: 'no inputs provided for service execution', cause: body });
      this.logger.error(error.message);
      throw error;
    }

    return this.request<ServiceExecuted<Outputs>, ExecuteBody<Inputs>>(url, { method: 'POST', body });
  }

  /**
   * Creates a batch pipeline for asynchronous execution.
   * @param {string} uri - where the service is located
   * @returns {Promise<HttpResponse<BatchCreated>>} the batch pipeline details
   */
  create(uri: string): Promise<HttpResponse<BatchCreated>>;
  /**
   * Creates a batch pipeline for asynchronous execution.
   * @param {CreateParams} params - where the service is located and additional metadata
   * @returns {Promise<HttpResponse<BatchCreated>>} the batch pipeline details
   */
  create(params: CreateParams): Promise<HttpResponse<BatchCreated>>;
  create(uri: string | CreateParams): Promise<HttpResponse<BatchCreated>> {
    const { folder, service, version, serviceId, ...params } = Uri.toParams(uri);
    const serviceUri = serviceId ?? params?.serviceUri ?? Uri.encode({ folder, service, version }, false);
    const url = Uri.from(undefined, { base: this.config.baseUrl.full, version: 'api/v4', endpoint: 'batch' });
    this.#validateUri({ serviceUri, versionId: params.versionId });

    const body = {
      service: serviceUri,
      version_id: params.versionId,
      version_by_timestamp: DateUtils.isDate(params?.activeSince) ? params.activeSince.toISOString() : undefined,
      subservice: Array.isArray(params.subservices) ? params.subservices.join(',') : params.subservices,
      output: params.output,
      call_purpose: params.callPurpose ?? 'Async Batch Execution',
      source_system: params.sourceSystem ?? SPARK_SDK,
      correlation_id: params.correlationId,
      unique_record_key: params.inputKey,
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

  #buildExecuteBody<T>(uri: { serviceUri: string; versionId?: string }, params: ExecuteParams<T>): ExecuteBody<T> {
    this.#validateUri(uri);
    const { data, raw } = params;
    const metadata = {
      service: uri.serviceUri,
      version_id: data?.versionId ?? uri.versionId,
      version_by_timestamp: DateUtils.isDate(data?.activeSince) ? data.activeSince.toISOString() : undefined,
      subservice: Array.isArray(data?.subservices) ? data.subservices.join(',') : data?.subservices,
      output: data?.output,
      call_purpose: data?.callPurpose ?? 'Sync Batch Execution',
      source_system: data?.sourceSystem ?? SPARK_SDK,
      correlation_id: data?.correlationId,
    };

    const inputs = data?.inputs || params.inputs;
    if ((!Array.isArray(inputs) || inputs?.length === 0) && StringUtils.isNotEmpty(raw)) {
      const parsed = Serializable.deserialize(raw as string, () => {
        this.logger.warn('failed to parse the raw input as JSON', raw);
        return { inputs: [], ...metadata };
      });

      return Utils.isObject(parsed) ? { ...metadata, ...parsed } : { inputs: [], ...metadata };
    } else {
      return { inputs: inputs ?? [], ...metadata };
    }
  }

  #validateUri(uri: { serviceUri: string; versionId?: string }): void {
    if (StringUtils.isEmpty(uri.serviceUri) && StringUtils.isEmpty(uri.versionId)) {
      const error = SparkError.sdk({ message: 'service uri locator is required', cause: uri });
      this.logger.error(error.message);
      throw error;
    }
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
   * Gets the status of a batch pipeline.
   * @returns {Promise<HttpResponse<BatchStatus>>} the batch status
   */
  getStatus(): Promise<HttpResponse<BatchStatus>> {
    return this.request(Uri.from(undefined, { ...this.baseUri, endpoint: `batch/${this.id}` }));
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
   * Closing a batch means you don't want to add any more data or chunks to batch
   * and you want to close the batch. After closing a batch, batch will still process
   * the data and user will be able to download the remaining output from get chunk
   * results API.
   * @returns {Promise<HttpResponse<BatchDisposed>>} the batch status
   */
  async close(): Promise<HttpResponse<BatchDisposed>> {
    this.#assertState(['closed', 'cancelled']);

    const url = Uri.from(undefined, { ...this.baseUri, endpoint: `batch/${this.id}` });
    return this.request<BatchDisposed>(url, { method: 'PATCH', body: { batch_status: 'closed' } }).then((response) => {
      this.#state = 'closed';
      return response;
    });
  }

  /**
   * Cancels a batch pipeline.
   *
   * Cancelling a batch is helpful when batch is not working as expected or you
   * have made a mistake and you want to immediately stop the batch processing.
   * You won't be able to download anymore data after cancelling a batch.
   * @returns {Promise<HttpResponse<BatchDisposed>>} the batch status
   */
  async cancel(): Promise<HttpResponse<BatchDisposed>> {
    this.#assertState(['cancelled', 'closed']);

    const url = Uri.from(undefined, { ...this.baseUri, endpoint: `batch/${this.id}` });
    return this.request<BatchDisposed>(url, { method: 'PATCH', body: { batch_status: 'cancelled' } }).then(
      (response) => {
        this.#state = 'cancelled';
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
    { ifChunkIdDuplicated: ifDuplicated = 'replace' }: PushDataOptions = {},
  ): Chunks<Inputs> {
    try {
      const { chunks, data, inputs } = params ?? {};

      if (Utils.isNotEmptyArray(chunks)) return { chunks: this.#assessChunks(chunks, ifDuplicated) };
      if (Utils.isNotEmptyArray(data?.inputs))
        return { chunks: this.#assessChunks([{ id: getUuid(), data }], ifDuplicated) };
      if (Utils.isNotEmptyArray(inputs))
        return { chunks: this.#assessChunks([{ id: getUuid(), data: { parameters: {}, inputs } }], ifDuplicated) };

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

      this.#chunks.set(chunk.id, (chunk.data.size = chunk.data?.inputs?.length ?? 0));
    }
    return chunks;
  }
}

interface MetadataParams {
  serviceUri?: string;
  versionId?: string;
  activeSince?: number | string | Date;
  subservices?: string | string[];
  output?: string;
  callPurpose?: string;
  sourceSystem?: string;
  correlationId?: string;
}

interface ExecuteParams<Inputs = any> {
  readonly data?: ExecuteData<Inputs>;
  readonly inputs?: Inputs[];
  readonly raw?: string;
}

interface ExecuteData<Inputs = any> extends MetadataParams {
  inputs: Inputs[];
}

type ExecuteBody<Inputs = any> = {
  inputs: Inputs[];
  service: string;
  version_id?: string;
  version_by_timestamp?: string;
  subservice?: string;
  output?: string;
  call_purpose?: string;
  source_system?: string;
  correlation_id?: string;
};

type ServiceExecuted<Outputs = any> = {
  outputs: Outputs[];
  warnings: Partial<{ source_path: string; message: string }>[][];
  errors: Partial<{
    error_category: string;
    error_type: string;
    additional_details: string;
    source_path: string;
    message: string;
  }>[][];
  process_time: number[];
  service_id: string;
  version_id: string;
  version: string;
  call_id: string;
  compiler_version: string;
  correlation_id: string;
  request_timestamp: string;
};

interface CreateParams extends MetadataParams {
  folder?: string;
  service?: string;
  version?: string;
  serviceId?: string;
  inputKey?: string;
}

type BatchCreated = {
  object: string;
  id: string;
  batch_status: string;
  data: {
    unique_record_key: string | null;
    service_id: string;
    version_id: string;
    version: string;
    call_id: string | null;
    compiler_version: string;
    request_timestamp: string;
    correlation_id: string | null;
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
  records_available: number;
  compute_time_ms: number;
  records_completed: number;
  record_submitted: number;
  request_timestamp: string;
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
  };
};

type BatchDisposed = {
  object: string;
  id: string;
  status: string;
  meta: {
    service_id: string;
    version_id: string;
    version: string;
    process_time: number;
    call_id: string;
    compiler_type: string;
    compiler_version: string;
    correlation_id: string | null;
    request_timestamp: string;
  };
};

interface PushDataOptions {
  ifChunkIdDuplicated?: IfChunkIdDuplicated;
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
  size?: number;
}

type BatchChunk<Inputs> = { id: string; data: ChunkData<Inputs> };
type PipelineState = 'open' | 'closed' | 'cancelled';
type IfChunkIdDuplicated = 'ignore' | 'replace' | 'throw';
type Chunks<T> = { chunks: BatchChunk<T>[] };
