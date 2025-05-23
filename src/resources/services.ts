import { Serializable } from '../data';
import { SparkError, RetryTimeoutError } from '../error';
import { SPARK_SDK } from '../constants';
import { HttpResponse, Multipart, getRetryTimeout } from '../http';
import Utils, { StringUtils, DateUtils } from '../utils';

import { ImpEx, ImportResult } from './impex';
import { ApiResource, ApiResponse, Uri, UriParams } from './base';
import { GetSwaggerParams, GetVersionsParams, GetSchemaParams, GetMetadataParams, CompilerType } from './types';
import { CreateParams, CompileParams, PublishParams, GetStatusParams, DownloadParams, RecompileParams } from './types';
import { ExportParams, ImportParams, MigrateParams, ExecuteParams, TransformParams, ValidateParams } from './types';
import { JsonInputs, ArrayInputs, Inputs, SearchParams } from './types';

export class Services extends ApiResource {
  get compilation(): Compilation {
    return new Compilation(this.config);
  }

  /**
   * Creates a new service by uploading a file and publishing it.
   * @param {CreateParams} params - the service creation parameters
   * @returns a summary of the upload, compilation, and publication process
   * @throws {SparkError} if the service creation fails
   *
   * @transactional
   * See {@link Services.compile} and {@link Services.publish} for individual steps.
   */
  async create(
    params: CreateParams,
  ): Promise<{ upload: ServiceCompiled; compilation: CompilationStatus; publication: ServicePublished }> {
    const { upload, compilation } = await this.compile(params);
    const { engine_file_documentid: engineId, original_file_documentid: fileId } = upload.response_data;

    return this.publish({ fileId, engineId, ...params }).then((response) => {
      return { upload, compilation, publication: response.data };
    });
  }

  /**
   * Compiles a service after uploading it.
   * @param {CreateParams} params - the service creation parameters
   * @returns a summary of the upload, compilation, and publication process
   *
   * @transactional
   * See {@link Compilation.initiate} and {@link Compilation.getStatus} for individual
   * steps.
   */
  async compile(params: CompileParams): Promise<{ upload: ServiceCompiled; compilation: CompilationStatus }> {
    const compilation = this.compilation;
    const upload = await compilation.initiate(params);
    const { nodegen_compilation_jobid: jobId } = upload.data.response_data;

    const status = await compilation.getStatus({ jobId, ...params });
    return { upload: upload.data, compilation: status.data };
  }

  /**
   * Publishes a service after uploading and compiling it.
   * @param {PublishParams} params - the publication parameters
   * @returns {Promise<HttpResponse<ServicePublished>>} the publication response
   */
  async publish(params: PublishParams): Promise<HttpResponse<ServicePublished>> {
    const { folder, service } = params;
    const [startDate, endDate] = DateUtils.parse(params.startDate, params.endDate);
    const url = this.config.baseUrl.add({ folder, service }, { endpoint: 'publish' });
    const body = {
      request_data: {
        draft_service_name: params.draftName ?? service,
        effective_start_date: startDate.toISOString(),
        effective_end_date: endDate.toISOString(),
        original_file_documentid: params.fileId,
        engine_file_documentid: params.engineId,
        version_difference: params.versioning ?? 'minor',
        should_track_user_action: `${params.trackUser ?? false}`,
      },
    };

    return this.request<ServicePublished>(url, { method: 'POST', body }).then((response) => {
      this.logger.log(`service published with version id <${response.data.response_data.version_id}>`);
      return response;
    });
  }

  /**
   * Executes a service.
   * @param {string | UriParams} uri - use the `{folder}/{service}[?{version}]`,
   * `service/{serviceId}`, `version/{versionId}` format to locate the service;
   * or use fine-grained details to locate the service. The `UriParams` object
   * can be used to specify the service location and additional parameters like
   * the version ID, service ID, proxy service URI, etc.
   * @see {@link UriParams} for more details.
   *
   * @param {ExecuteParams<Input>} [params] - the optional execution parameters (inputs, metadata, etc.)
   * The inputs can be provided the following ways:
   * - as `null` or `undefined` to use the default inputs
   * - as a JSON string
   * - as a JSON object for single execution
   * - as an array of JSON objects for synchronous batch execution
   * @returns {Promise<HttpResponse<ServiceExecuted<Output>>>} the service execution response
   *
   * Obviously, the SDK ignores what those default values are. Under the hood,
   * the SDK uses an empty object `{}` as the input data, which is an indicator for
   * Spark to use the default inputs defined in the Excel file.
   */
  async execute<Input, Output>(
    uri: string | UriParams,
    params: ExecuteParams<Input> = {},
  ): Promise<HttpResponse<ServiceExecuted<Output>>> {
    uri = Uri.validate(uri);

    const { inputs, ...meta } = params;
    const executable = new ExecuteInputs(inputs);
    const metadata = new ExecuteMeta(meta, uri, executable.isBatch);

    const url = executable.isBatch
      ? this.config.baseUrl.add({ public: uri.public }, { version: 'api/v4', endpoint: 'execute' })
      : this.config.baseUrl.add(uri, { endpoint: uri.versionId || uri.serviceId ? '' : 'execute' });

    const payload = executable.isBatch
      ? { inputs: executable.inputs, ...metadata.values }
      : { request_data: { inputs: executable.inputs }, request_meta: metadata.values };

    const [body, headers] = Serializable.compress(payload, params.encoding);

    return this.request(url, { method: 'POST', body, headers }).then((response: HttpResponse<any>) => {
      const { responseFormat: format = 'alike' } = params;
      if (format === 'original' || executable.isBatch) return response;
      return {
        ...response,
        data: {
          outputs: [response.data.response_data?.outputs],
          process_time: [response.data.response_meta?.process_time],
          warnings: [response.data.response_data?.warnings],
          errors: [response.data.response_data?.errors],
          service_chain: [response.data.response_data?.service_chain],
          service_id: response.data.response_meta?.service_id,
          version_id: response.data.response_meta?.version_id,
          version: response.data.response_meta?.version,
          call_id: response.data.response_meta?.call_id,
          compiler_version: response.data.response_meta?.compiler_version,
          correlation_id: response.data.response_meta?.correlation_id,
          request_timestamp: response.data.response_meta?.request_timestamp,
        } as ServiceExecuted<Output>,
      };
    });
  }

  /**
   * Executes a service using transforms.
   *
   * This is similar to the `execute` method, except that it enables preprocessing
   * and postprocessing of the payload. That is, when dealing with unstructured data (or data
   * does not comply with Spark request or response formats), transforms can be applied
   * before the request and/or after the response.
   * @param {string | UriParams} uri - where the service is located
   * @param {TransformParams} params - the optional execution parameters (inputs, metadata, etc.)
   * @returns @returns {Promise<HttpResponse<Output>>} the service execution response
   */
  transform<Output>(uri: string | UriParams, params: TransformParams): Promise<HttpResponse<Output>> {
    uri = Uri.validate(uri);
    params.using ??= uri.service;

    const { inputs, ...meta } = params;
    const metadata = new ExecuteMeta(meta, uri, meta.apiVersion === 'v4');

    const endpoint = StringUtils.isString(meta.using)
      ? `transforms/${meta.using}/for/folders/${uri.folder}/services/${uri.service}`
      : `transforms/${meta.using?.folder}/${meta.using?.name}/for/${uri.folder}/${uri.service}`;
    const url = this.config.baseUrl.concat({ version: 'api/v4', endpoint });
    const [body, headers] = Serializable.compress(inputs, params.encoding);

    return this.request(url, { method: 'POST', body, headers: { ...headers, ...metadata.asHeaders } });
  }

  /**
   * Validates the inputs for a service.
   * @param {string | UriParams} uri - where the service is located
   * @param {ValidateParams} params - optionally the validation parameters (inputs, metadata, etc.)
   * @returns {Promise<HttpResponse<ServiceExecuted<Output>>>} the validation response
   * @throws {SparkError} if the validation fails
   */
  validate<Output>(uri: string | UriParams, params?: ValidateParams): Promise<HttpResponse<ServiceExecuted<Output>>> {
    uri = Uri.validate(uri);
    const url = this.config.baseUrl.add(uri, { endpoint: 'validation' });

    const { inputs, ...meta } = params ?? {};
    const executable = new ExecuteInputs(inputs);
    const metadata = new ExecuteMeta(meta, uri, false);
    const body = {
      request_data: { inputs: executable.inputs },
      request_meta: {
        ...metadata.values,
        validation_type: StringUtils.isNotEmpty(meta.validationType)
          ? meta.validationType === 'dynamic'
            ? 'dynamic'
            : 'default_values'
          : undefined,
      },
    };

    return this.request<ServiceExecuted<Output>>(url, { method: 'POST', body });
  }

  /**
   * Gets the schema for a service.
   * @param {string | GetSchemaParams} uri - how to locate the service (folder and service, or by version ID)
   * @returns {Promise<HttpResponse>} the service schema
   */
  getSchema(uri: string | GetSchemaParams): Promise<HttpResponse> {
    const { folder, service, versionId } = Uri.validate(uri);
    const url = StringUtils.isNotEmpty(versionId)
      ? this.config.baseUrl.concat({ endpoint: `GetEngineDetailByVersionId/versionid/${versionId}` })
      : this.config.baseUrl.concat({ version: 'api/v1', endpoint: `product/${folder}/engines/get/${service}` });

    return this.request(url, { method: versionId ? 'POST' : 'GET' });
  }

  /**
   * Gets the metadata of a Spark service.
   * @param {string | GetMetadataParams} uri - how to locate the service
   * @returns {Promise<HttpResponse<MetadataFound>>} the service metadata.
   */
  getMetadata(uri: string | GetMetadataParams): Promise<HttpResponse<MetadataFound>> {
    const url = this.config.baseUrl.add(Uri.validate(uri), { endpoint: 'metadata' });
    return this.request(url, { method: 'GET' });
  }

  /**
   * Gets the list of versions of a Spark service.
   * @param {string | GetVersionsParams} uri - how to locate the service
   * @returns {Promise<HttpResponse<VersionInfo[]>>} the list of versions
   */
  async getVersions(uri: string | GetVersionsParams): Promise<HttpResponse<VersionInfo[]>> {
    const { folder, service } = Uri.validate(uri);
    const endpoint = `product/${folder}/engines/getversions/${service}`;
    const url = this.config.baseUrl.concat({ version: 'api/v1', endpoint });

    return this.request(url).then((response: any) => ({ ...response, data: response.data.data }));
  }

  /**
   * Gets the Swagger documentation of a Spark service.
   * @param {string | GetSwaggerParams} uri - how to locate the service
   * @returns {Promise<HttpResponse>} the Swagger documentation as binary data
   * via the `HttpResponse.buffer` property.
   */
  getSwagger(uri: string | GetSwaggerParams): Promise<HttpResponse> {
    const { folder, service, versionId = '', downloadable = false, subservice = 'All' } = Uri.validate(uri);
    const endpoint = `downloadswagger/${subservice}/${downloadable}/${versionId}`;
    const url = this.config.baseUrl.add({ folder, service }, { endpoint });

    return this.request(url);
  }

  /**
   * Searches for services with pagination and filtering options.
   * @param {SearchParams} params - including pagination, sorting and filtering
   */
  search(params: SearchParams = {}): Promise<HttpResponse<ServiceListed>> {
    const { page = 1, limit = -1, sort = 'name1_co', query = [] } = params;
    const { fields = ['id', 'foldername', 'filename', 'version', 'modifiedDate'] } = params;
    const url = this.config.baseUrl.concat({ endpoint: 'services/search' });
    const body = { request_data: { page, page_size: limit, sort, search: query, fields } };

    return this.request(url, { method: 'POST', body });
  }

  /**
   * Downloads the original (Excel) or configured file.
   * @param {string | DownloadParams} uri - how to locate the service
   * @returns {Promise<HttpResponse>} the file as binary data via the `HttpResponse.buffer` property.
   */
  download(uri: string | DownloadParams): Promise<HttpResponse> {
    const { folder, service, versionId = '', fileName: filename = '', type = 'original' } = Uri.validate(uri);
    const endpoint = `product/${folder}/engines/${service}/download/${versionId}`;
    const url = this.config.baseUrl.concat({ version: 'api/v1', endpoint });
    const params = { filename, type: type === 'configured' ? 'withmetadata' : '' };

    return this.request(url, { params });
  }

  /**
   * Recompiles a service using a specific compiler version.
   * @param {string | RecompileParams} uri - how to locate the service
   * @returns {Promise<HttpResponse<ServiceRecompiled>>} the recompilation status.
   *
   * Unlike {@link Services.compile}, this method does not upload a new service file.
   * It only recompiles the existing service with the specified parameters. You
   * may want to check the {@link Compilation.getStatus} method to monitor the
   * recompilation job before subsequent actions.
   */
  recompile(uri: string | RecompileParams): Promise<HttpResponse<ServiceRecompiled>> {
    const { folder, service, versionId, releaseNotes, ...params } = Uri.validate(uri);
    const url = this.config.baseUrl.add({ folder, service }, { endpoint: 'recompileNodgen' });
    const [startDate, endDate] = DateUtils.parse(params.startDate, params.endDate);
    const data = {
      versionId,
      releaseNotes: releaseNotes ?? `Recompiled via ${SPARK_SDK}`,
      upgradeType: params.upgrade ?? 'patch',
      neuronCompilerVersion: params.compiler ?? 'StableLatest',
      tags: StringUtils.join(params?.tags),
      versionLabel: params?.label,
      effectiveStartDate: startDate.toISOString(),
      effectiveEndDate: endDate.toISOString(),
    };

    return this.request(url, { method: 'POST', body: { request_data: data } });
  }

  /**
   * Deletes a Spark service.
   * @param {string | Pick<UriParams, 'folder' | 'service'>} uri - locate the service using folder, service only
   * @returns {Promise<HttpResponse<ServiceDeleted>>} the deletion status
   */
  delete(uri: string | Pick<UriParams, 'folder' | 'service'>): Promise<HttpResponse<ServiceDeleted>> {
    const { folder, service } = Uri.validate(uri);
    const endpoint = `product/${folder}/engines/delete/${service}`;
    const url = this.config.baseUrl.concat({ version: 'api/v1', endpoint });

    return this.request(url, { method: 'DELETE' });
  }

  /**
   * Exports a Spark service as a zip file.
   * @param {string | ExportParams} uri - service to export
   * @returns {Promise<HttpResponse[]>} a list of exported files
   * @throws {SparkError} when the export job fails
   *
   * @transactional
   */
  async export(uri: string | ExportParams): Promise<HttpResponse[]> {
    const { folder, service, version, versionId, ...params } = Uri.validate(uri);
    const serviceUri = params.serviceUri ?? Uri.encode({ folder, service, version }, false);

    return ImpEx.only(this.config).export({
      services: serviceUri ? [serviceUri] : [],
      versionIds: versionId ? [versionId] : [],
      ...params,
    });
  }

  /**
   * Imports a Spark service from a zip file.
   * @param {ImportParams} params - the import parameters
   * @returns {Promise<HttpResponse<ImportResult>>} the import results
   * @throws {SparkError} when the import job fails
   * @transactional
   */
  async import(params: ImportParams): Promise<HttpResponse<ImportResult>> {
    return ImpEx.only(params.config ?? this.config).import(params);
  }

  /**
   * Migrates a Spark service from one workspace to another.
   * @param {MigrateParams} params - the migration parameters
   * @returns the migration results
   *
   * @transactional
   * Currently in Beta, please use experimentally.
   */
  async migrate(
    params: MigrateParams,
  ): Promise<{ exports: HttpResponse[]; imports: HttpResponse<ImportResult> | null }> {
    const exported = await this.export(params);
    if (exported.length === 0) {
      this.logger.warn('no service entities to migrate');
      return { exports: exported, imports: null };
    }

    const imported = await this.import({ ...params, file: exported[0].buffer });
    return { exports: exported, imports: imported };
  }
}

class Compilation extends ApiResource {
  /**
   * Uploads a service file and initiate the compilation process.
   * @param {CompileParams} params - the compilation parameters
   * @returns {Promise<HttpResponse<ServiceCompiled>>} the upload response
   */
  async initiate(params: CompileParams): Promise<HttpResponse<ServiceCompiled>> {
    const url = this.config.baseUrl.add(params, { endpoint: 'upload' });
    const [startDate, endDate] = DateUtils.parse(params.startDate, params.endDate);
    const metadata = {
      request_data: {
        version_difference: params.versioning ?? 'minor',
        effective_start_date: startDate.toISOString(),
        effective_end_date: endDate.toISOString(),
      },
    };
    const multiparts: Multipart[] = [
      { name: 'engineUploadRequestEntity', data: metadata },
      { name: 'serviceFile', fileStream: params.file, fileName: params.fileName ?? `${params.service}.xlsx` },
    ];

    return this.request<ServiceCompiled>(url, { method: 'POST', multiparts }).then((response) => {
      this.logger.log(`service file uploaded <${response.data.response_data.original_file_documentid}>`);
      return response;
    });
  }

  /**
   * Gets the status of a compilation job.
   * @param {GetStatusParams} params - how to locate the compilation job.
   * @returns {Promise<HttpResponse<CompilationStatus>>} the compilation status.
   */
  async getStatus(params: GetStatusParams): Promise<HttpResponse<CompilationStatus>> {
    const { jobId, maxRetries = this.config.maxRetries, retryInterval = this.config.retryInterval } = params;
    const url = this.config.baseUrl.add(params, { endpoint: `getcompilationprogess/${jobId}` });

    let retries = 0;
    let response = await this.request<CompilationStatus>(url);
    do {
      const { progress } = response.data.response_data;
      this.logger.log(`waiting for compilation job to complete - ${progress || 0}%`);
      if (progress == 100) return response;

      await Utils.sleep(getRetryTimeout(retries, retryInterval));

      retries++;
      response = await this.request<CompilationStatus>(url);
    } while (response.data.response_data.progress < 100 && retries < maxRetries);

    if (response.data.response_data.status === 'Success') return response;

    const message = `compilation job status check timed out after ${retries} retries`;
    this.logger.error(message);
    throw new RetryTimeoutError({ message, retries, interval: retryInterval, cause: response });
  }
}

class ExecuteInputs<T> {
  readonly inputs!: JsonInputs | ArrayInputs<T>;
  readonly unitLength!: number;

  constructor(data: Inputs<T>) {
    if (data === undefined || data === null || (Array.isArray(data) && data.length === 0)) data = {}; // default values for empty inputs
    if (StringUtils.isString(data)) data = Serializable.deserialize(data); // supports JSON string

    if (Utils.isObject(data)) {
      this.unitLength = 1;
      this.inputs = data as JsonInputs;
    } else if (Array.isArray(data)) {
      this.unitLength = data.length;
      this.inputs = data as ArrayInputs<T>;
    } else {
      throw SparkError.sdk({
        message: 'invalid data format\nExpected input data formats are string, object or an array of objects',
        cause: data,
      });
    }
  }

  get isBatch() {
    return this.unitLength > 1;
  }
}

class ExecuteMeta {
  readonly #supportedCompilerTypes = ['neuron', 'type3', 'type2', 'type1', 'xconnector'];
  #activeSince: string | undefined;
  #sourceSystem: string | undefined;
  #correlationId: string | undefined;
  #callPurpose: string | undefined;
  #compilerType: string | undefined;
  #subservices: string | undefined;
  #debugSolve: boolean | undefined;
  #downloadable: boolean | undefined;
  #echoInputs: boolean | undefined;
  #selectedOutputs: string | undefined;
  #tablesAsArray: string | undefined;
  #outputsFilter: string | undefined;
  #inputKey: string | undefined;
  #extras: Record<string, any> | undefined;

  constructor(
    metadata: Omit<ExecuteParams, 'inputs'>,
    readonly uri: UriParams,
    readonly isBatch: boolean,
  ) {
    this.#activeSince = DateUtils.toDate(metadata.activeSince)?.toISOString();
    this.#sourceSystem = metadata.sourceSystem ?? SPARK_SDK;
    this.#correlationId = metadata.correlationId;
    this.#subservices = StringUtils.join(metadata.subservices);
    this.#debugSolve = metadata.debugSolve;
    this.#downloadable = metadata.downloadable;
    this.#echoInputs = metadata.echoInputs;
    this.#selectedOutputs = StringUtils.join(metadata.selectedOutputs);
    this.#tablesAsArray = StringUtils.join(metadata.tablesAsArray);
    this.#outputsFilter = metadata.outputsFilter;

    const type = metadata.compilerType?.toLowerCase() as CompilerType;
    this.#compilerType = this.#supportedCompilerTypes.includes(type) ? StringUtils.capitalize(type) : 'Neuron';
    this.#callPurpose = StringUtils.isNotEmpty(metadata.callPurpose)
      ? metadata.callPurpose
      : this.isBatch
        ? 'Sync Batch Execution'
        : 'Single Execution';

    this.#extras = metadata.extras ?? {};
  }

  /**
   * The sanitized metadata values for the execution request.
   *
   * The returned metadata will vary based on the execution mode (user-specified
   * or inferred). Meaning, parsing and validating the inputs will dictate the
   * structure of the metadata; hence, why the metadata is dynamic.
   */
  get values() {
    const { folder, service, version, serviceId, versionId } = this.uri;
    const serviceUri = serviceId || Uri.encode({ folder, service, version }, false) || undefined;

    const values = this.isBatch
      ? {
          service: serviceUri,
          version_id: versionId,
          version_by_timestamp: this.#activeSince,
          subservice: this.#subservices,
          output: this.#selectedOutputs,
          call_purpose: this.#callPurpose,
          source_system: this.#sourceSystem,
          correlation_id: this.#correlationId,
          unique_record_key: this.#inputKey, // async only

          // extra metadata
          ...this.#extras,
        }
      : {
          // URI locator via metadata (v3 also supports service URI in url path)
          service_id: serviceId,
          version_id: versionId,
          version: version,

          // v3 expects extra metadata
          transaction_date: this.#activeSince,
          call_purpose: this.#callPurpose,
          source_system: this.#sourceSystem,
          correlation_id: this.#correlationId,
          array_outputs: this.#tablesAsArray,
          compiler_type: this.#compilerType,
          debug_solve: this.#debugSolve,
          excel_file: this.#downloadable,
          requested_output: this.#selectedOutputs,
          requested_output_regex: this.#outputsFilter,
          response_data_inputs: this.#echoInputs,
          service_category: this.#subservices,

          // extra metadata
          ...this.#extras,
        };

    // filter out undefined values.
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  }

  get asHeaders() {
    // NOTE: this has to be a single line string: "'{\"call_purpose\":\"Single Execution\"}'"
    return { [this.isBatch ? 'x-meta' : 'x-request-meta']: `'${JSON.stringify(this.values)}'` };
  }
}

type ServiceApiResponse<TData, TMeta = Record<string, any>> = Pick<ApiResponse, 'status' | 'error'> & {
  response_data: TData;
  response_meta: TMeta;
};

type ServiceCompiled = ServiceApiResponse<{
  lines_of_code: number;
  hours_saved: number;
  nodegen_compilation_jobid: string;
  original_file_documentid: string;
  engine_file_documentid: string;
  warnings: any[] | null;
  current_statistics: any | null;
  no_of_sheets: number;
  no_of_inputs: number;
  no_of_outputs: number;
  no_of_formulas: number;
  no_of_cellswithdata: number;
}>;

type ServiceExecuted<Output = Record<string, any>> = {
  outputs: Output[];
  process_time: number[];
  warnings: Partial<{ source_path: string; message: string }>[];
  errors: Partial<{
    error_category: string;
    error_type: string;
    additional_details: string;
    source_path: string;
    message: string;
  }>[];
  service_chain?: Partial<{
    service_name: string;
    run_if: string;
    requested_report: string;
    requested_report_filename: string;
  }>[];
  service_id: string;
  version_id: string;
  version: string;
  call_id: string;
  compiler_version: string;
  correlation_id: string;
  request_timestamp: string;
};

type ServiceDeleted = {
  data: null;
  errorCode: string | null;
  message: string | null;
  status: string;
};

type ServiceListed = ServiceApiResponse<
  Array<{
    id?: string;
    folderName?: string;
    fileName?: string;
    version?: string;
    modifiedDate?: string;
  }>,
  {
    count: number;
    next: null;
    page: number;
    page_size: number;
    page_total: number;
    previous: null;
    request_timestamp: string;
    system: string;
    [key: string]: any;
  }
>;

type MetadataFound = ServiceApiResponse<ServiceExecuted>;

type CompilationStatus = ServiceApiResponse<{ status: string; last_error_message: string; progress: number }>;

type ServicePublished = ServiceApiResponse<{ version_id: string }>;

type ServiceRecompiled = ServiceApiResponse<{ versionId: string; revision: string; jobId: string }>;

type VersionInfo = {
  id: string;
  createdAt: string;
  engine: string;
  revision: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  isActive: boolean;
  releaseNote: string;
  childEngines: any[] | null;
  versionLabel: string;
  defaultEngineType: string;
  tags: null;
  product: string;
  author: string;
  originalFileName: string;
};
