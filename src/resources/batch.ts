import { HttpResponse } from '../http';
import { Serializable } from '../data';
import Utils, { StringUtils } from '../utils';

import { ApiResource, Uri, UriParams } from './base';

export class BatchService extends ApiResource {
  /**
   * Executes a synchronous batch request.
   *
   * @param uri - how to locate the service
   * @param bodyParams - the request body
   */
  execute(uri: Omit<UriParams, 'proxy' | 'versionId'>, bodyParams: BodyParams = {}): Promise<HttpResponse> {
    const { folder, service, version, ...params } = uri;
    const url = Uri.from(params, { base: this.config.baseUrl.full, version: 'api/v4', endpoint: 'execute' });
    const serviceUri = Uri.encode({ folder, service, version });
    const body = parseBodyParams(bodyParams, { serviceUri, callPurpose: 'Spark JS SDK' });

    return this.request(url.value, { method: 'POST', body });
  }
}

interface BodyParams {
  readonly data?: ExecData;
  readonly inputs?: Record<string, any>[];
  readonly raw?: string;
}

interface ExecData {
  inputs: Record<string, any>[];
  serviceUri?: string;
  versionId?: string;
  versionByTimestamp?: string;
  subservice?: string;
  output?: string;
  callPurpose?: string;
  sourceSystem?: string;
  correlationId?: string;
}

type Body = {
  inputs: Record<string, any>[];
  service: string;
  version_id?: string;
  version_by_timestamp?: string;
  subservice?: string;
  output?: string;
  call_purpose?: string;
  source_system?: string;
  correlation_id?: string;
};

function parseBodyParams({ data, inputs: initialInputs, raw }: BodyParams, otherValues: Record<string, string>): Body {
  const metadata = {
    service: data?.serviceUri ?? otherValues.serviceUri,
    version_id: data?.versionId,
    version_by_timestamp: data?.versionByTimestamp,
    subservice: data?.subservice,
    output: data?.output,
    call_purpose: data?.callPurpose ?? otherValues.callPurpose,
    source_system: data?.sourceSystem,
    correlation_id: data?.correlationId,
  };

  const inputs = data?.inputs || initialInputs;
  if ((!Array.isArray(inputs) || inputs?.length === 0) && StringUtils.isNotEmpty(raw)) {
    const parsed = Serializable.deserialize(raw as string, () => {
      console.warn('[WARNING]: failed to parse the raw input as JSON; exec will use default inputs instead.');
      return { inputs: [], ...metadata };
    });

    return Utils.isObject(parsed) ? { ...metadata, ...parsed } : { inputs: [], ...metadata };
  } else {
    return { inputs: inputs ?? [], ...metadata };
  }
}
