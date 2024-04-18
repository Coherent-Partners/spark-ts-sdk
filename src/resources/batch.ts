import { HttpResponse } from '../http';
import { Serializable } from '../data';
import { SPARK_SDK } from '../constants';
import { SparkError } from '../error';
import Utils, { DateUtils, StringUtils } from '../utils';

import { ApiResource, Uri, UriParams } from './base';

export class BatchService extends ApiResource {
  /**
   * Execute multiple records synchronously.
   * @param {string | UriParams} uri - how to locate the service
   * @param {ExecuteParams<Inputs>} params - the execution parameters (inputs, metadata, etc.)
   * @returns {Promise<HttpResponse<ServiceExecuted<Outputs>>} - the executed service outputs
   * @throws {SparkError} - if the service execution fails
   */
  execute<Inputs, Outputs>(uri: string, params: ExecuteParams<Inputs>): Promise<HttpResponse<ServiceExecuted<Outputs>>>;
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

    return this.request<ServiceExecuted<Outputs>>(url.value, { method: 'POST', body });
  }

  #buildExecuteBody<T>(uri: { serviceUri: string; versionId?: string }, params: ExecuteParams<T>): ExecuteBody {
    if (StringUtils.isEmpty(uri.serviceUri)) {
      const error = SparkError.sdk({ message: 'service uri locator is required', cause: uri });
      this.logger.error(error.message);
      throw error;
    }

    const { data, raw } = params;
    const metadata = {
      service: uri.serviceUri,
      version_id: data?.versionId ?? uri.versionId,
      version_by_timestamp: DateUtils.isDate(data?.activeSince) ? data.activeSince.toISOString() : undefined,
      subservice: Array.isArray(data?.subservices) ? data.subservices.join(',') : data?.subservices,
      output: data?.output,
      call_purpose: data?.callPurpose ?? SPARK_SDK,
      source_system: data?.sourceSystem,
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
}

interface ExecuteParams<Inputs = any> {
  readonly data?: ExecuteData<Inputs>;
  readonly inputs?: Inputs[];
  readonly raw?: string;
}

interface ExecuteData<Inputs = any> {
  inputs: Inputs[];
  serviceUri?: string;
  versionId?: string;
  activeSince?: number | string | Date;
  subservices?: string | string[];
  output?: string;
  callPurpose?: string;
  sourceSystem?: string;
  correlationId?: string;
}

type ExecuteBody<Inputs = any> = {
  inputs: Inputs[];
  service: string;
  version_id?: string;
  version_by_timestamp?: string;
  subservice?: string;
  output?: string;
  call_purpose: string;
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
