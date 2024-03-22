import Utils from '../utils';
import { SparkError } from '../error';
import { HttpResponse, getRetryTimeout } from '../http';
import { ApiResource, Uri } from './base';

export class ImpEx extends ApiResource {
  get export() {
    return new Export(this.config);
  }
}

class Export extends ApiResource {
  initiate(bodyParams: ExportBodyParams = {}): Promise<HttpResponse<ExportInit>> {
    const url = Uri.from({}, { base: this.config.baseUrl.full, version: 'api/v4', endpoint: 'export' });
    const { filters, ...params } = bodyParams;
    const metadata = {
      file_filter: filters?.file ?? 'migrate',
      version_filter: filters?.version ?? 'all',
      source_system: params?.source,
      correlation_id: params?.correlationId,
    };

    const inputs: ExportBody['inputs'] = {};
    if (Utils.isNotEmptyArray(params?.folders)) inputs.folders = params!.folders;
    if (Utils.isNotEmptyArray(params?.services)) inputs.services = params!.services;
    if (Utils.isNotEmptyArray(params?.versionIds)) inputs.version_ids = params!.versionIds;
    if (Utils.isEmptyObject(inputs)) {
      throw new SparkError('at least one of folders, services, or versionIds must be provided');
    }

    return this.request(url.value, { method: 'POST', body: { inputs, ...metadata } });
  }

  async getStatus(
    jobId: string,
    { url: statusUrl, maxRetries = this.config.maxRetries }: { url?: string; maxRetries?: number } = {},
  ): Promise<HttpResponse<ExportStatus>> {
    const url = Uri.from({}, { base: this.config.baseUrl.full, version: 'api/v4', endpoint: `export/${jobId}/status` });

    let retries = 0;
    while (retries < maxRetries) {
      const response = await this.request<ExportStatus>(statusUrl ?? url.value);
      if (response.data?.status === 'closed' || response.data?.status === 'completed') {
        return response;
      }

      retries++;
      console.log(`[INFO]: waiting for export job to complete (attempt ${retries} of ${maxRetries})`);

      const timeout = getRetryTimeout(retries, 1000);
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
    throw SparkError.sdk({ message: 'export job status timed out' });
  }
}

interface ExportInit {
  id: string;
  object: string;
  status_url: string;
}

interface ExportStatus {
  response_timestamp: string;
  status: string;
  status_url: string;
  process_time: number;
  source_system: string;
  correlation_id: string;
  errors: any;
  object: string;
  id: string;
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

interface ExportBodyParams {
  // FIXME: unclear whether these are mutually exclusive.
  folders?: string[];
  services?: string[];
  versionIds?: string[];
  // metadata
  filters?: { file?: 'migrate' | 'onpremises'; version?: 'latest' | 'all' };
  source?: string;
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
