import { type Readable } from 'stream';

import Utils, { StringUtils } from '../utils';
import { Config } from '../config';
import { Logger } from '../logger';
import { SparkError } from '../error';
import { SPARK_SDK } from '../constants';
import { HttpResponse, Multipart, getRetryTimeout } from '../http';
import { ApiResource, Uri, UriParams } from './base';
import { UpgradeType, ExportFilters, IfEntityPresent } from './types';

export class ImpEx {
  private constructor(readonly config: Config) {}

  static only(config: Config): ImpEx {
    return new ImpEx(config);
  }

  static migration(configs: { exports: Config; imports: Config }): Migration {
    return new Migration(configs);
  }

  get exports() {
    return new Export(this.config);
  }

  get imports() {
    return new Import(this.config);
  }

  /**
   * Export Spark entities such as versions, services, or folders.
   * @param {ExportParams} params - what to export
   * @returns {Promise<HttpResponse[]>} - a list of exported files
   * @throws {SparkError} when the export job fails
   *
   * @transactional
   * This method will initiate an export job, poll its status until it completes,
   * and download the exported files. If you need more control over these steps,
   * consider using the `exports` resource directly.
   */
  async export(params: ExportParams): Promise<HttpResponse[]> {
    const exporter = this.exports;
    const { maxRetries = this.config.maxRetries, retryInterval } = params ?? {};
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
   * Import Spark entities into the platform.
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
    const importer = this.imports;
    const { maxRetries = this.config.maxRetries, retryInterval } = params ?? {};
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

  get exports() {
    return new Export(this.configs.exports);
  }

  get imports() {
    return new Import(this.configs.imports);
  }

  /**
   * Migrate Spark entities from one platform to another (experimental feature).
   * @param {MigrateParams} params - which entities to migrate and where
   * @throws {SparkError} when the migration fails
   */
  async migrate(params: MigrateParams) {
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
  declare readonly logger: Logger;

  constructor(config: Config) {
    super(config);
    this.logger = Logger.of(config.logger);
  }

  /**
   * Initiate an export job to export Spark entities such as versions, services, or folders.
   * @param {ExportParams} params - what to export
   * @returns {Promise<HttpResponse<ExportInit>>} - the export job details
   */
  async initiate(params: ExportParams = {}): Promise<HttpResponse<ExportInit>> {
    const url = Uri.from(undefined, { base: this.config.baseUrl.full, version: 'api/v4', endpoint: 'export' });
    const metadata = {
      file_filter: params?.filters?.file ?? 'migrate',
      version_filter: params?.filters?.version ?? 'all',
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

    return this.request<ExportInit>(url.value, { method: 'POST', body: { inputs, ...metadata } }).then((response) => {
      this.logger.log(`export job created <${response.data.id}>`);
      return response;
    });
  }

  /**
   * Check the status of an export job.
   * @param {string} jobId - the export job ID
   * @param {StatusParams} params - optional parameters
   * @returns {Promise<HttpResponse<ExportResult>>} - the export job results when completed
   */
  async getStatus(jobId: string, params: StatusParams = {}): Promise<HttpResponse<ExportResult>> {
    const { url: statusUrl, maxRetries = this.config.maxRetries, retryInterval = 2 } = params;
    const url = Uri.from(undefined, {
      base: this.config.baseUrl.full,
      version: 'api/v4',
      endpoint: `export/${jobId}/status`,
    });

    let retries = 0;
    while (retries < maxRetries) {
      const response = await this.request<ExportResult>(statusUrl ?? url.value);
      if (response.data?.status === 'closed' || response.data?.status === 'completed') {
        this.logger.log(`export job <${jobId}> completed`);
        return response;
      }

      retries++;
      this.logger.log(`waiting for export job to complete (attempt ${retries} of ${maxRetries})`);
      const timeout = getRetryTimeout(retries, retryInterval);
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }

    const error = SparkError.sdk({ message: `export job status timed out after ${retries} retries` });
    this.logger.error(error.message);
    throw error;
  }

  /**
   * Download the exported files from an export job.
   * @param {string | ExportResult} exported - the export job ID or results
   * @returns {Promise<HttpResponse[]>} - a list of exported files
   */
  async download(exported: string): Promise<HttpResponse[]>;
  async download(exported: ExportResult): Promise<HttpResponse[]>;
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
  declare readonly logger: Logger;

  constructor(config: Config) {
    super(config);
    this.logger = Logger.of(config.logger);
  }

  /**
   * Initiate an import job to import Spark entities into the platform.
   * @param {ImportParams} params - what to import
   * @returns {Promise<HttpResponse<ImportInit>>} - the import job details
   */
  async initiate(params: ImportParams): Promise<HttpResponse<ImportInit>> {
    const url = Uri.from(undefined, { base: this.config.baseUrl.full, version: 'api/v4', endpoint: 'import' });
    const metadata = {
      inputs: { services_modify: buildServiceMappings(params.destination) },
      services_existing: params.ifPresent ?? 'abort',
      source_system: params.sourceSystem ?? SPARK_SDK,
      correlation_id: params.correlationId,
    };
    const multiparts: Multipart[] = [
      { name: 'importRequestEntity', data: metadata },
      { name: 'file', fileStream: params.file, fileName: 'package.zip', contentType: 'application/zip' },
    ];

    return this.request<ImportInit>(url.value, { method: 'POST', multiparts }).then((response) => {
      this.logger.log(`import job created <${response.data.id}>`);
      return response;
    });
  }

  /**
   * Check the status of an import job.
   * @param {string} jobId - the import job ID
   * @param {StatusParams} params - optional parameters
   * @returns {Promise<HttpResponse<ImportResult>>} - the import job results when completed
   */
  async getStatus(jobId: string, params: StatusParams = {}): Promise<HttpResponse<ImportResult>> {
    const { url: statusUrl, maxRetries = this.config.maxRetries, retryInterval = 2 } = params;
    const url = Uri.from(undefined, {
      base: this.config.baseUrl.full,
      version: 'api/v4',
      endpoint: `import/${jobId}/status`,
    });

    let retries = 0;
    while (retries < maxRetries) {
      const response = await this.request<ImportResult>(statusUrl ?? url.value);
      if (response.data?.status === 'closed' || response.data?.status === 'completed') {
        this.logger.log(`import job <${jobId}> completed`);
        return response;
      }

      retries++;
      this.logger.log(`waiting for import job to complete (attempt ${retries} of ${maxRetries})`);
      const timeout = getRetryTimeout(retries, retryInterval);
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }

    const error = SparkError.sdk({ message: `import job status timed out after ${retries} retries` });
    this.logger.error(error.message);
    throw error;
  }
}

export class Wasm extends ApiResource {
  /**
   * Download a service's WebAssembly module.
   * @param {string | UriParams} uri - how to locate the service
   * @returns {Promise<HttpResponse>} - a buffer of the WASM module as a zip file
   *
   * NOTE: As of now, only `serviceUri` made out of versionId downloads a wasm
   * successfully. This issue is being tracked in the platform and will be fixed soon.
   */
  download(uri: string): Promise<HttpResponse>;
  download(params: Omit<UriParams, 'proxy' | 'version'>): Promise<HttpResponse>;
  download(uri: string | Omit<UriParams, 'proxy' | 'version'>): Promise<HttpResponse> {
    const { folder, service, public: isPublic, serviceId, versionId } = Uri.toParams(uri);
    const serviceUri = Uri.encode({ folder, service, serviceId, versionId });
    const endpoint = `getnodegenzipbyId/${serviceUri}`;
    const url = Uri.partial(`nodegen${isPublic ? '/public' : ''}`, { base: this.config.baseUrl.full, endpoint });

    return this.request(url.value);
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

interface StatusParams {
  url?: string;
  maxRetries?: number;
  retryInterval?: number;
}

interface ExportParams {
  folders?: string[];
  services?: string[];
  versionIds?: string[];
  filters?: ExportFilters;
  sourceSystem?: string;
  correlationId?: string;
  maxRetries?: number;
  retryInterval?: number;
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

interface ExportInit {
  id: string;
  object: string;
  status_url: string;
}

export interface ExportResult {
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
}

interface ImportParams {
  file: Readable;
  destination: ImportDestination;
  ifPresent?: IfEntityPresent;
  sourceSystem?: string;
  correlationId?: string;
  maxRetries?: number;
  retryInterval?: number;
}

type ImportBody = {
  inputs: {
    services_modify: {
      service_uri_source: string;
      service_uri_destination: string;
      update_version_type: UpgradeType;
    }[];
  };
  services_existing: 'update' | 'replace' | 'abort';
  source_system?: string;
  correlation_id?: string;
};

interface ImportInit {
  id: string;
  object: string;
  status_url: string;
}

export interface ImportResult {
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
}

interface MigrateParams {
  folders?: string[];
  services?: string[];
  versionIds?: string[];
  filters?: ExportFilters;
  ifPresent?: IfEntityPresent;
  destination: ImportDestination;
  sourceSystem?: string;
  correlationId?: string;
  maxRetries?: number;
  retryInterval?: number;
}
