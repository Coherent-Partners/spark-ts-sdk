import { SparkError } from '../error';
import { HttpResponse, getRetryTimeout } from '../http';
import { ApiResource, ApiResponse, Uri, UriParams } from './base';

export class History extends ApiResource {
  async rehydrate(uri: string | RehydrateUriParams, callId?: string): Promise<HttpResponse<RehydrateApiResponse>> {
    const { folder, service, ...params } = Uri.toParams(uri);
    callId ??= params?.callId;
    if (!callId) throw SparkError.sdk({ message: 'callId is required', cause: callId });
    const url = Uri.from({ folder, service }, { base: this.config.baseUrl.full, endpoint: `download/${callId}` });

    const response = await this.request<RehydrateApiResponse>(url.value);
    const downloadUrl = response.data?.response_data?.download_url;
    if (!downloadUrl) throw new SparkError('failed to produce a download URL', response);

    const download = await this.request(downloadUrl);
    return { ...download, status: response.status, data: response.data };
  }

  async download(uri: string | DownloadUriParams, type?: 'csv' | 'json'): Promise<HttpResponse<DownloadStatus>> {
    const { folder, service, ...params } = Uri.toParams(uri);
    type ??= params?.type ?? 'json';
    const url = Uri.from({ folder, service }, { base: this.config.baseUrl.full, endpoint: `log/download${type}` });
    const body = parseBodyParams(params);

    const response = await this.request<DownloadApiResponse>(url.value, { method: 'POST', body });
    const jobId = response.data?.response_data?.job_id;
    if (!jobId) throw new SparkError('failed to produce a download job', response);
    console.log(`[INFO]: ${type} download job created <${response.data?.response_data?.job_id}>`);

    const job = await this.getStatus({ folder, service, jobId, type });
    const downloadUrl = job.data?.response_data?.download_url;
    if (!downloadUrl) throw new SparkError(`failed to produce a download URL for <${jobId}>`, job);

    const download = await this.request(downloadUrl);
    return { ...download, status: job.status, data: job.data };
  }

  async getStatus(uri: string | StatusUriParams, type?: 'csv' | 'json'): Promise<HttpResponse<DownloadStatus>> {
    const { jobId, maxRetries = this.config.maxRetries + 3, ...params } = Uri.toParams(uri);
    type ??= params?.type ?? 'json';
    const url = Uri.from(params, { base: this.config.baseUrl.full, endpoint: `log/download${type}/status/${jobId}` });

    let retries = 0;
    while (retries < maxRetries) {
      const response = await this.request<DownloadStatus>(url.value);
      if (response.data.response_data.progress == 100) return response;

      retries++;
      console.log(`[INFO]: waiting for status job to complete (attempt ${retries} of ${maxRetries})`);

      const timeout = getRetryTimeout(retries, 2);
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
    throw SparkError.sdk({ message: 'download job status timed out' });
  }
}

interface DownloadStatus extends ApiResponse {
  response_data: {
    progress: number;
    download_url: string;
  };
}

interface StatusUriParams extends Pick<UriParams, 'folder' | 'service'> {
  readonly jobId?: string;
  /** Defaults to 'json' */
  readonly type?: 'csv' | 'json';
  /** Defaults to `Config.maxRetries` */
  readonly maxRetries?: number;
}

interface RehydrateUriParams extends Pick<UriParams, 'folder' | 'service'> {
  readonly callId?: string;
}

interface RehydrateApiResponse extends ApiResponse {
  response_data: { download_url: string };
}

interface DownloadApiResponse extends ApiResponse {
  response_data: { job_id: string };
}

interface DownloadUriParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {
  /** Defaults to 'json' */
  readonly type?: 'csv' | 'json';
  readonly callIds?: string[];
  /** Acceptable formats: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss.sssZ' */
  readonly startDate?: string;
  readonly endDate?: string;
  /** Possible fallback: sourceSystem, correlationId if callIds is empty. */
  readonly correlationId?: string;
  readonly sourceSystem?: string;
  readonly timezoneOffset?: string;
}

type DownloadBody = {
  request_data: {
    call_ids?: string[];
    start_date?: string;
    end_date?: string;
    timezone_offset?: string;
  };
  request_meta: {
    version_id?: string;
  };
};

function parseBodyParams(params: DownloadUriParams = {}): DownloadBody {
  const { sourceSystem, correlationId } = params;
  const callIds = params.callIds ?? [];
  if (callIds?.length === 0 && sourceSystem) callIds.push(sourceSystem);
  if (callIds?.length === 0 && correlationId) callIds.push(correlationId);

  return {
    request_data: {
      call_ids: callIds,
      start_date: params.startDate,
      end_date: params.endDate,
      timezone_offset: params.timezoneOffset,
    },
    request_meta: {
      version_id: params.versionId,
    },
  };
}
