import { HttpResponse } from '../http';
import { Serializable } from '../data';
import { SparkError } from '../error';
import Utils, { StringUtils } from '../utils';

import { ApiResource, Uri, UriParams } from './base';
import { BatchService } from './batch';
import { ImpEx } from './impex';
import { History } from './history';

export class Service extends ApiResource {
  get batch() {
    return new BatchService(this.config);
  }

  get log() {
    return new History(this.config);
  }

  execute(uri: string | Omit<UriParams, 'version'>, params: ExecBodyParams = {}): Promise<HttpResponse> {
    const url = Uri.from(Uri.toParams(uri), { base: this.config.baseUrl.full, endpoint: 'execute' });
    const body = parseBodyParams(params, { callPurpose: 'Spark JS SDK', compilerType: 'Neuron' });

    return this.request(url.value, { method: 'POST', body });
  }

  getSchema(uri: string | Pick<UriParams, 'folder' | 'service'>): Promise<HttpResponse> {
    const { folder, service } = Uri.toParams(uri);
    const endpoint = `product/${folder}/engines/get/${service}`;
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint });

    return this.request(url.value);
  }

  getMetadata(uri: string | Omit<UriParams, 'version'>): Promise<HttpResponse> {
    const url = Uri.from(Uri.toParams(uri), { base: this.config.baseUrl.full, endpoint: 'metadata' });

    return this.request(url.value);
  }

  getVersions(uri: string | Pick<UriParams, 'folder' | 'service'>): Promise<HttpResponse> {
    const { folder, service } = Uri.toParams(uri);
    const endpoint = `product/${folder}/engines/getversions/${service}`;
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint });

    return this.request(url.value);
  }

  getSwagger(uri: string | SwaggerUriParams): Promise<HttpResponse> {
    const { folder, service, versionId = '', downloadable = false, category = 'All' } = Uri.toParams(uri);
    const endpoint = `downloadswagger/${category}/${downloadable}/${versionId}`;
    const url = Uri.from({ folder, service }, { base: this.config.baseUrl.full, endpoint });

    return this.request(url.value);
  }

  validate(uri: string | Omit<UriParams, 'version'>, params: ExecBodyParams = {}): Promise<HttpResponse> {
    const url = Uri.from(Uri.toParams(uri), { base: this.config.baseUrl.full, endpoint: 'validation' });
    const body = parseBodyParams(params, {});

    return this.request(url.value, { method: 'POST', body });
  }

  download(uri: string | DownloadUriParams): Promise<HttpResponse> {
    const { folder, service, version = '', filename = '', type = 'original' } = Uri.toParams(uri);
    const endpoint = `product/${folder}/engines/${service}/download/${version}`;
    const url = Uri.from({}, { base: this.config.baseUrl.value, version: 'api/v1', endpoint });
    const params = { filename, type: type === 'configured' ? 'withmetadata' : '' };

    return this.request(url.value, { params });
  }

  recompile(uri: string | RecompileUriParams): Promise<HttpResponse> {
    const { folder, service, versionId, releaseNotes, ...params } = Uri.toParams(uri);
    const url = Uri.from({ folder, service }, { base: this.config.baseUrl.full, endpoint: 'recompileNodgen' });
    const now = new Date();
    const until = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
    const data = {
      versionId,
      releaseNotes: releaseNotes ?? 'Recompiled via Spark JS SDK',
      upgradeType: params.upgrade ?? 'patch',
      neuronCompilerVersion: params.compiler ?? 'StableLatest',
      tags: Array.isArray(params.tags) ? params.tags.join(',') : params?.tags,
      versionLabel: params?.label,
      effectiveStartDate: params?.startDate ?? now.toISOString(),
      effectiveEndDate: params?.endDate ?? until.toISOString(),
    };

    return this.request(url.value, { method: 'POST', body: { request_data: data } });
  }

  async export(uri: string | ExportUriParams) {
    const impex = new ImpEx(this.config);
    const { folder, service, version, versionId, retries = this.config.maxRetries + 2, ...params } = Uri.toParams(uri);
    const serviceUri = Uri.encode({ folder, service, version }, false);

    const response = await impex.export.initiate({
      services: serviceUri ? [serviceUri] : [],
      versionIds: versionId ? [versionId] : [],
      ...params,
    });
    const jobId = response.data?.id;
    if (!jobId) throw new SparkError('failed to produce an export job', response);
    console.log(`[INFO]: export job created <${jobId}>`);

    const status = await impex.export.getStatus(jobId, { maxRetries: retries });
    if (status.data?.outputs?.files?.length === 0) {
      throw new SparkError('export job failed to produce any files', status);
    }

    const downloads = [];
    for (const file of status.data.outputs.files) {
      if (!file.file) continue;
      try {
        downloads.push(await this.request(file.file)); // confirm MD5 hash?
      } catch (cause) {
        console.warn(`[WARNING]: failed to download file <${file.file}>`, cause);
      }
    }
    return downloads;
  }
}

interface ExportUriParams extends Pick<UriParams, 'folder' | 'service' | 'version' | 'versionId'> {
  filters?: { file?: 'migrate' | 'onpremises'; version?: 'latest' | 'all' };
  source?: string;
  correlationId?: string;
  retries?: number;
}

interface RecompileUriParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {
  upgrade?: 'major' | 'minor' | 'patch';
  tags?: string | string[];
  compiler?: string;
  releaseNotes?: string;
  label?: string;
  startDate?: string;
  endDate?: string;
}

interface DownloadUriParams extends Pick<UriParams, 'folder' | 'service' | 'version'> {
  filename?: string;
  type?: 'original' | 'configured';
}

interface SwaggerUriParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {
  category?: string;
  downloadable?: boolean;
}

interface ExecData {
  // Input definitions for calculation
  inputs?: Record<string, any> | null;

  // Parameters to identify the correct service and version to use:
  serviceUri?: string;
  serviceId?: string;
  version?: string;
  versionId?: string;
  transactionDate?: string;

  // These fields, if provided as part of the API request, are visible in the API Call History.
  sourceSystem?: string;
  correlationId?: string;
  callPurpose?: string;

  // Parameters to control the response outputs
  arrayOutputs?: undefined | string | string[];
  compilerType?: 'Neuron' | 'Type3' | 'Type2' | 'Type1' | 'Xconnector';
  debugSolve?: boolean;
  excelFile?: boolean;
  requestedOutput?: undefined | string | string[];
  requestedOutputRegex?: string;
  responseDataInputs?: boolean;
  serviceCategory?: string;
  validationType?: 'default_values' | 'dynamic';
}

interface ExecBodyParams {
  readonly data?: ExecData;
  readonly inputs?: Record<string, any>;
  readonly raw?: string;
}

type ExecBody = {
  request_data: {
    inputs: Record<string, any> | null;
  };
  request_meta: {
    service_uri?: string;
    service_id?: string;
    version?: string;
    version_id?: string;
    transaction_date?: string;
    source_system?: string;
    correlation_id?: string;
    call_purpose?: string;
    array_outputs?: string;
    compiler_type?: string;
    debug_solve?: boolean;
    excel_file?: boolean;
    requested_output?: string;
    requested_output_regex?: string;
    response_data_inputs?: boolean;
    service_category?: string;
    validation_type?: 'default_values' | 'dynamic';
  };
};

function parseBodyParams(
  { data = {}, inputs: initialInputs, raw }: ExecBodyParams,
  defaultValues: Record<string, string>,
): ExecBody {
  const metadata = {
    service_uri: data?.serviceUri,
    service_id: data?.serviceId,
    version: data?.version,
    version_id: data?.versionId,
    transaction_date: data?.transactionDate,
    source_system: data?.sourceSystem,
    correlation_id: data?.correlationId,
    call_purpose: data?.callPurpose ?? defaultValues.callPurpose,
    array_outputs: Array.isArray(data?.arrayOutputs) ? data.arrayOutputs.join(',') : data?.arrayOutputs,
    compiler_type: data?.compilerType ?? defaultValues.compilterType,
    debug_solve: data?.debugSolve,
    excel_file: data?.excelFile,
    requested_output: Array.isArray(data?.requestedOutput) ? data.requestedOutput.join(',') : data?.requestedOutput,
    requested_output_regex: data?.requestedOutputRegex,
    response_data_inputs: data?.responseDataInputs,
    service_category: data?.serviceCategory,
    validation_type: data?.validationType,
  };

  const inputs = data?.inputs || initialInputs;
  if (!Utils.isObject(inputs) && StringUtils.isNotEmpty(raw)) {
    const parsed = Serializable.deserialize(raw as string, () => {
      console.warn('[WARNING]: failed to parse the raw input as JSON; exec will use default inputs instead.');
      return { request_data: { inputs: {} }, request_meta: metadata };
    });

    parsed.request_meta = Utils.isObject(parsed?.request_meta)
      ? { ...defaultValues, ...parsed.request_meta }
      : metadata;
    return parsed;
  } else {
    return { request_data: { inputs: inputs ?? {} }, request_meta: metadata };
  }
}
