import { type Readable } from 'stream';

import Utils, { StringUtils } from '../utils';
import { type Config } from '../config';
import { Logger } from '../logger';
import { SPARK_SDK } from '../constants';
import { SparkError, RetryTimeoutError } from '../error';
import { HttpResponse, Multipart, getRetryTimeout } from '../http';
import { ApiResource, Uri, UriParams } from './base';
import { UpgradeType, ExportFilters, IfEntityPresent, ConfigParams } from './types';

export class ImpEx {
  private constructor(readonly config: Config) {}

  static only(config: Config): ImpEx {
    return new ImpEx(config);
  }

  static migration(configs: { exports: Config; imports: Config }): Migration {
    return new Migration(configs);
  }

  get exports(): Export {
    return new Export(this.config);
  }

  get imports(): Import {
    return new Import(this.config);
  }

  /**
   * Exports Spark entities such as versions, services, or folders.
   *
   * @param {ExportParams} params - what to export
   * @returns {Promise<HttpResponse[]>} a list of exported files
   * @throws {SparkError} when the export job fails
   *
   * @transactional
   * This method will initiate an export job, poll its status until it completes,
   * and download the exported files. If you need more control over these steps,
   * consider using the `exports` resource directly.
   */
  async export(params: ExportParams): Promise<HttpResponse[]> {
    const { maxRetries = this.config.maxRetries, retryInterval = this.config.retryInterval } = params ?? {};
    const exporter = this.exports;
    const response = await exporter.initiate(params);

    const status = await exporter.getStatus(response.data.id, { maxRetries, retryInterval });
    if (status.data?.outputs?.files?.length === 0) {
      const error = new SparkError('export job failed to produce any files', status);
      exporter.logger.error(error.message);
      throw error;
    }

    return exporter.download(status.data);
  }

  /**
   * Imports Spark entities into the platform.
   *
   * @param {ImportParams} params - what to import
   * @returns {Promise<HttpResponse<ImportResult>>} - the import job results
   * @throws {SparkError} when the import job fails
   *
   * @transactional
   * This method will initiate an import job, poll its status until it completes,
   * and return the import results. If you need more control over these steps,
   * consider using the `imports` resource directly.
   */
  async import(params: ImportParams): Promise<HttpResponse<ImportResult>> {
    const { maxRetries = this.config.maxRetries, retryInterval = this.config.retryInterval } = params ?? {};
    const importer = this.imports;
    const response = await importer.initiate(params);

    const status = await importer.getStatus(response.data.id, { maxRetries, retryInterval });
    if (status.data?.errors) {
      const error = new SparkError('import job failed with errors', status);
      importer.logger.error(error.message);
      throw error;
    } else if (status.data?.outputs?.services?.length === 0 || status.data?.outputs?.service_versions?.length === 0) {
      importer.logger.warn('import job completed without any services');
    } else {
      importer.logger.log(`${status.data.outputs.services.length} service(s) imported`);
    }

    return status;
  }
}

export class Migration {
  constructor(protected readonly configs: { readonly exports: Config; readonly imports: Config }) {}

  get exports(): Export {
    return new Export(this.configs.exports);
  }

  get imports(): Import {
    return new Import(this.configs.imports);
  }

  /**
   * Migrates Spark entities from one platform to another (experimental feature).
   *
   * @param {MigrateParams} params - which entities to migrate and where
   * @throws {SparkError} when the migration fails
   *
   * @transactional
   * @see {@link ImpEx.export} and {@link ImpEx.import} for more control over the
   * migration process
   */
  async migrate(params: MigrateParams): Promise<{ exports: HttpResponse; imports: HttpResponse<ImportResult> }[]> {
    const importables = await ImpEx.only(this.configs.exports).export(params);
    const importer = ImpEx.only(this.configs.imports);

    const migration = [];
    for (const importable of importables) {
      const imported = await importer.import({ ...params, file: importable.buffer, destination: params.destination });
      migration.push({ exports: importable, imports: imported });
    }
    return migration;
  }
}

class Export extends ApiResource {
  readonly #version: string = 'api/v4';
  declare readonly logger: Logger;

  constructor(config: Config) {
    super(config);
    this.logger = Logger.of(config.logger);
  }

  /**
   * Initiates an export job to export Spark entities such as versions, services, or folders.
   *
   * @param {ExportParams} params - what to export
   * @returns {Promise<HttpResponse<ExportInit>>} the export job details
   */
  async initiate(params: ExportParams = {}): Promise<HttpResponse<ExportInit>> {
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: 'export' });
    const metadata = {
      file_filter: params?.filters?.file ?? 'migrate',
      version_filter: params?.filters?.version ?? 'latest',
      source_system: params?.sourceSystem ?? SPARK_SDK,
      correlation_id: params?.correlationId,
    };

    const inputs: ExportBody['inputs'] = {};
    if (Utils.isNotEmptyArray(params?.folders)) inputs.folders = params!.folders;
    if (Utils.isNotEmptyArray(params?.services)) inputs.services = params!.services;
    if (Utils.isNotEmptyArray(params?.versionIds)) inputs.version_ids = params!.versionIds;
    if (Utils.isEmptyObject(inputs)) {
      const error = new SparkError('at least one of folders, services, or versionIds must be provided');
      this.logger.error(error.message);
      throw error;
    }

    return this.request<ExportInit>(url, { method: 'POST', body: { inputs, ...metadata } }).then((response) => {
      this.logger.log(`export job created <${response.data.id}>`);
      return response;
    });
  }

  /**
   * Checks the status of an export job.
   *
   * @param {string} jobId - the export job ID
   * @param {StatusParams} params - optional parameters
   * @returns {Promise<HttpResponse<ExportResult>>} the export job results when completed
   */
  async getStatus(jobId: string, params: StatusParams = {}): Promise<HttpResponse<ExportResult>> {
    const { maxRetries = this.config.maxRetries, retryInterval = this.config.retryInterval } = params;
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: `export/${jobId}/status` });

    let retries = 0;
    while (retries < maxRetries) {
      const response = await this.request<ExportResult>(params.url ?? url);
      if (response.data?.status === 'closed' || response.data?.status === 'completed') {
        this.logger.log(`export job <${jobId}> completed`);
        return response;
      }

      retries++;
      this.logger.log(`waiting for export job to complete (attempt ${retries} of ${maxRetries})`);
      await Utils.sleep(getRetryTimeout(retries, retryInterval));
    }

    const message = `export job status timed out after ${retries} retries`;
    this.logger.error(message);
    throw new RetryTimeoutError({ message, retries, interval: retryInterval });
  }

  /**
   * Cancels an export job that is in progress.
   * @param {string} jobId - the export job UUID
   * @returns {Promise<HttpResponse<ExportResult>>} the status of the export job
   */
  async cancel(jobId: string): Promise<HttpResponse<ExportResult>> {
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: `export/${jobId}` });
    return this.request<ExportResult>(url, { method: 'PATCH', body: { export_status: 'cancelled' } }).then(
      (response) => {
        this.logger.log(`export job <${response.data.id}> has been cancelled`);
        return response;
      },
    );
  }

  /**
   * Downloads the exported files from an export job.
   *
   * @param {string | ExportResult} exported - the export job ID or results
   * @returns {Promise<HttpResponse[]>} a list of exported files
   */
  async download(exported: string | ExportResult): Promise<HttpResponse[]> {
    const downloads: HttpResponse[] = [];

    if (StringUtils.isString(exported)) {
      downloads.push(await this.request(exported));
      return downloads;
    }

    for (const file of exported.outputs.files) {
      if (!file.file) continue;
      try {
        downloads.push(await this.request(file.file));
      } catch (cause) {
        this.logger.warn(`failed to download file <${file.file}>`, cause);
      }
    }
    this.logger.log(`downloaded ${downloads.length} file(s) from export job <${exported.id}>`);
    return downloads;
  }
}

class Import extends ApiResource {
  readonly #version: string = 'api/v4';
  declare readonly logger: Logger;

  constructor(config: Config) {
    super(config);
    this.logger = Logger.of(config.logger);
  }

  /**
   * Initiates an import job to import Spark entities into the platform.
   * @param {ImportParams} params - what to import
   * @returns {Promise<HttpResponse<ImportInit>>} the import job details
   */
  async initiate(params: ImportParams): Promise<HttpResponse<ImportInit>> {
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: 'import' });
    const metadata = {
      inputs: { services_modify: buildServiceMappings(params.destination) },
      services_existing: params.ifPresent ?? 'add_version',
      source_system: params.sourceSystem ?? SPARK_SDK,
      correlation_id: params.correlationId,
    };
    const multiparts: Multipart[] = [
      { name: 'importRequestEntity', data: metadata },
      { name: 'file', fileStream: params.file, fileName: 'package.zip', contentType: 'application/zip' },
    ];

    return this.request<ImportInit>(url, { method: 'POST', multiparts }).then((response) => {
      this.logger.log(`import job created <${response.data.id}>`);
      return response;
    });
  }

  /**
   * Checks the status of an import job.
   * @param {string} jobId - the import job ID
   * @param {StatusParams} params - optional parameters
   * @returns {Promise<HttpResponse<ImportResult>>} the import job results when completed
   */
  async getStatus(jobId: string, params: StatusParams = {}): Promise<HttpResponse<ImportResult>> {
    const { maxRetries = this.config.maxRetries, retryInterval = this.config.retryInterval } = params;
    const url = this.config.baseUrl.concat({ version: this.#version, endpoint: `import/${jobId}/status` });

    let retries = 0;
    while (retries < maxRetries) {
      const response = await this.request<ImportResult>(params.url ?? url);
      if (response.data?.status === 'closed' || response.data?.status === 'completed') {
        this.logger.log(`import job <${jobId}> completed`);
        return response;
      }

      retries++;
      this.logger.log(`waiting for import job to complete (attempt ${retries} of ${maxRetries})`);
      await Utils.sleep(getRetryTimeout(retries, retryInterval));
    }

    const message = `import job status timed out after ${retries} retries`;
    this.logger.error(message);
    throw new RetryTimeoutError({ message, retries, interval: retryInterval });
  }
}

export class Files extends ApiResource {
  /**
   * Download a Spark file from a protected URL.
   * @param {string} url - Spark URL.
   * @returns {Promise<HttpResponse>} a binary file stream available
   * for reading via `HttpResponse.buffer`.
   */
  download(url: string): Promise<HttpResponse> {
    return this.request(url);
  }
}

export class Wasm extends ApiResource {
  /**
   * Downloads a service's WebAssembly module.
   *
   * @param {string | UriParams} uri - where the service is located
   * @returns {Promise<HttpResponse>} a buffer of the WASM module as a zip file
   */
  download(uri: string | Omit<UriParams, 'proxy' | 'version'>): Promise<HttpResponse> {
    const { folder, service, public: isPublic, serviceId, versionId } = Uri.validate(uri);
    const serviceUri = Uri.encode({ folder, service, serviceId, versionId });
    const endpoint = `getnodegenzipbyId/${serviceUri}`;
    const url = Uri.partial(`nodegen${isPublic ? '/public' : ''}`, { base: this.config.baseUrl.full, endpoint });

    return this.request(url);
  }
}

function buildServiceMappings(
  serviceUri: ImportDestination,
  upgradeType: UpgradeType = 'minor',
): ImportBody['inputs']['services_modify'] {
  if (StringUtils.isString(serviceUri)) {
    const source = serviceUri as string;
    return [{ service_uri_source: source, service_uri_destination: source, update_version_type: upgradeType }];
  }

  if (Array.isArray(serviceUri)) {
    const serviceUris = [];
    for (const uri of serviceUri) {
      if (!uri) continue;
      serviceUris.push(...buildServiceMappings(uri, upgradeType));
    }
    return serviceUris;
  }

  if (serviceUri && (serviceUri as ServiceMapping)?.source) {
    const { source, target = source, upgrade = upgradeType } = serviceUri as ServiceMapping;
    return [{ service_uri_source: source, service_uri_destination: target, update_version_type: upgrade }];
  }

  throw SparkError.sdk({ message: 'invalid import service uri', cause: serviceUri });
}

export type ImportDestination = string | string[] | ServiceMapping | ServiceMapping[];

interface ServiceMapping {
  source: string;
  target?: string;
  upgrade?: UpgradeType;
}

interface StatusParams extends ConfigParams {
  url?: string;
}

interface ExportParams extends ConfigParams {
  folders?: string[];
  services?: string[];
  versionIds?: string[];
  filters?: ExportFilters;
  sourceSystem?: string;
  correlationId?: string;
}

type ExportBody = {
  inputs: {
    folders?: string[];
    services?: string[];
    version_ids?: string[];
  };
  source_system?: string;
  correlation_id?: string;
};

type ExportInit = {
  id: string;
  object: string;
  status_url: string;
};

export type ExportResult = {
  id: string;
  object: string;
  status: string;
  status_url: string;
  response_timestamp: string;
  process_time: number;
  source_system: string;
  correlation_id: string;
  errors: any;
  outputs: {
    files: { file: string; file_hash: string }[];
    services: {
      service_uri_source: string;
      folder_source: string;
      service_source: string;
      service_id_source: string;
    }[];
    service_versions: {
      service_uri_source: string;
      folder_source: string;
      service_source: string;
      version_source: string;
      service_id_source: string;
      version_id_source: string;
    }[];
  };
};

interface ImportParams extends ConfigParams {
  file: Readable;
  destination: ImportDestination;
  ifPresent?: IfEntityPresent;
  sourceSystem?: string;
  correlationId?: string;
}

type ImportBody = {
  inputs: {
    services_modify: {
      service_uri_source: string;
      service_uri_destination: string;
      update_version_type: UpgradeType;
    }[];
  };
  services_existing: 'abort' | 'replace' | 'add_version';
  source_system?: string;
  correlation_id?: string;
};

type ImportInit = {
  id: string;
  object: string;
  status_url: string;
};

export type ImportResult = {
  id: string;
  object: string;
  status: string;
  status_url: string;
  response_timestamp: string;
  process_time: number;
  source_system: string;
  correlation_id: string;
  errors: any;
  outputs: {
    services: {
      service_uri_source: string;
      folder_source: string;
      service_source: string;
      service_id_source: string;
      service_uri_destination: string;
      folder_destination: string;
      service_destination: string;
      service_id_destination: string;
      status: string;
    }[];
    service_versions: {
      service_uri_source: string;
      folder_source: string;
      service_source: string;
      version_source: string;
      service_id_source: string;
      version_id_source: string;
      folder_destination: string;
      service_destination: string;
      version_destination: string;
      service_uri_destination: string;
      service_id_destination: string;
      version_id_destination: string;
      status: string;
    }[];
  };
};

interface MigrateParams extends ConfigParams {
  folders?: string[];
  services?: string[];
  versionIds?: string[];
  filters?: ExportFilters;
  ifPresent?: IfEntityPresent;
  destination: ImportDestination;
  sourceSystem?: string;
  correlationId?: string;
}
