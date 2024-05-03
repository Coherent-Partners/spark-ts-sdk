import { SparkError } from '../error';
import { HttpResponse, getRetryTimeout } from '../http';
import { ApiResource, ApiResponse, Uri, UriParams } from './base';
import Utils, { DateUtils } from '../utils';

export class History extends ApiResource {
  get downloads(): LogDownload {
    return new LogDownload(this.config);
  }

  /**
   * Rehydrates the executed model into the original excel file.
   * @param {string | RehydrateParams} uri - how to locate the service
   * @param {string} callId - optional callId to rehydrate if not provided in the params.
   * @returns {Promise<HttpResponse<LogRehydrated>>} the rehydrated log
   *
   * @throws {SparkError} if the callId is missing or the rehydration fails
   * to produce a downloadable Excel file.
   */
  async rehydrate(uri: string, callId: string): Promise<HttpResponse<LogRehydrated>>;
  async rehydrate(params: RehydrateParams): Promise<HttpResponse<LogRehydrated>>;
  async rehydrate(uri: string | RehydrateParams, callId?: string): Promise<HttpResponse<LogRehydrated>> {
    const { folder, service, ...params } = Uri.toParams(uri);
    callId = (callId ?? params?.callId)?.trim();
    if (!callId) {
      const error = SparkError.sdk({ message: 'callId is required', cause: callId });
      this.logger.error(error.message);
      throw error;
    }

    const url = Uri.from({ folder, service }, { base: this.config.baseUrl.full, endpoint: `download/${callId}` });
    const response = await this.request<LogRehydrated>(url);
    const downloadUrl = response.data?.response_data?.download_url;

    if (!downloadUrl) {
      const error = new SparkError('failed to produce a download URL', response);
      this.logger.error(error.message);
      throw error;
    }

    const download = await this.request(downloadUrl);
    return { ...download, data: { ...response.data, status: 'Success' } };
  }

  /**
   * Downloads service execution logs as csv or json file.
   * @param {string | DownloadParams} uri - how to locate the service
   * @param {'csv' | 'json'} type - the file format to download
   * @returns {Promise<HttpResponse<LogStatus>>} the downloaded file
   * @throws {SparkError} if the download job fails to produce a downloadable file.
   */
  async download(uri: string, type: DownloadFileType): Promise<HttpResponse<LogStatus>>;
  async download(params: DownloadParams): Promise<HttpResponse<LogStatus>>;
  async download(uri: string | DownloadParams, type?: DownloadFileType): Promise<HttpResponse<LogStatus>> {
    const { folder, service, ...params } = Uri.toParams(uri);
    const { maxRetries = this.config.maxRetries, retryInterval = this.config.retryInterval } = params;
    type = (type ?? params?.type ?? 'json').toLowerCase() as DownloadFileType;

    const response = await this.downloads.initiate(uri, type);
    const jobId = response.data?.response_data?.job_id;
    if (!jobId) {
      const error = new SparkError('failed to produce a download job', response);
      this.logger.error(error.message);
      throw error;
    }

    const job = await this.downloads.getStatus({ folder, service, jobId, type, maxRetries, retryInterval });
    const downloadUrl = job.data.response_data.download_url;
    if (!downloadUrl) {
      const error = new SparkError(`failed to produce a download URL for <${jobId}>`, job);
      this.logger.error(error.message);
      throw error;
    }

    const download = await this.request(downloadUrl);
    return { ...download, status: job.status, data: { ...job.data, status: 'Success' } };
  }
}

class LogDownload extends ApiResource {
  /**
   * Creates a download job for service execution logs.
   * @param {string | CreateJobParams} uri - how to locate the service
   * @param {'csv' | 'json'} type - optional file format to download
   * @returns {Promise<HttpResponse<LogStatus>>} includes the downloaded file and status
   * @throws {SparkError} if the download job fails to produce a downloadable file.
   */
  async initiate(uri: string | CreateJobParams, type?: DownloadFileType): Promise<HttpResponse<JobCreated>> {
    const { folder, service, ...params } = Uri.toParams(uri);
    type = (type ?? params?.type ?? 'json').toLowerCase() as DownloadFileType;
    const url = Uri.from({ folder, service }, { base: this.config.baseUrl.full, endpoint: `log/download${type}` });

    const body = ((params: Omit<CreateJobParams, 'folder' | 'service'>) => {
      const { sourceSystem, correlationId, startDate, endDate } = params;
      const callIds = params.callIds ?? [];
      if (callIds?.length === 0 && sourceSystem) callIds.push(sourceSystem);
      if (callIds?.length === 0 && correlationId) callIds.push(correlationId);

      return {
        request_data: {
          call_ids: callIds,
          start_date: DateUtils.isDate(startDate) ? new Date(startDate).toISOString() : undefined,
          end_date: DateUtils.isDate(endDate) ? new Date(endDate).toISOString() : undefined,
          timezone_offset: params.timezoneOffset,
        },
        request_meta: {
          version_id: params.versionId,
        },
      };
    })(params);

    return this.request<JobCreated>(url, { method: 'POST', body }).then((response) => {
      this.logger.log(`${type} download job created <${response.data.response_data.job_id}>`);
      return response;
    });
  }

  /**
   * Gets the status of a download job for service execution logs.
   * @param {string | GetStatusParams} uri - how to locate the job
   * @param {'csv' | 'json'} type - optional file format to download
   * @returns {Promise<HttpResponse<LogStatus>>} the download status and URL
   * @throws {SparkError} if the download job status check times out.
   */
  async getStatus(uri: string, type: DownloadFileType): Promise<HttpResponse<LogStatus>>;
  async getStatus(params: GetStatusParams): Promise<HttpResponse<LogStatus>>;
  async getStatus(uri: string | GetStatusParams, type?: DownloadFileType): Promise<HttpResponse<LogStatus>> {
    const { jobId, ...params } = Uri.toParams(uri);
    const { maxRetries = this.config.maxRetries, retryInterval = this.config.retryInterval } = params;
    type = (type ?? params?.type ?? 'json').toLowerCase() as DownloadFileType;
    const url = Uri.from(params, { base: this.config.baseUrl.full, endpoint: `log/download${type}/status/${jobId}` });

    let retries = 0;
    let response = await this.request<LogStatus>(url);
    do {
      const { progress } = response.data.response_data;
      this.logger.log(`waiting for log status job to complete - ${progress || 0}%`);

      if (progress == 100) return response;
      await Utils.sleep(getRetryTimeout(retries, retryInterval));

      retries++;
      response = await this.request<LogStatus>(url);
    } while (response.data.response_data.progress < 100 && retries < maxRetries);

    if (response.data.response_data.download_url) return response;

    const error = SparkError.sdk({ message: 'log download job status check timed out', cause: response });
    this.logger.error(error.message);
    throw error;
  }
}

interface RehydrateParams extends Pick<UriParams, 'folder' | 'service'> {
  folder: string;
  service: string;
  callId: string;
}

/** Download file types: 'csv' or 'json'. Defaults to 'json'. */
type DownloadFileType = 'csv' | 'json' | 'CSV' | 'JSON';

interface CreateJobParams extends Pick<UriParams, 'folder' | 'service' | 'versionId'> {
  folder: string;
  service: string;

  /** Defaults to 'json' */
  type?: DownloadFileType;
  callIds?: string[];

  /** Acceptable formats: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss.sssZ' */
  startDate?: number | string | Date;
  endDate?: number | string | Date;

  /** Possible fallback: sourceSystem, correlationId if callIds is empty. */
  correlationId?: string;
  sourceSystem?: string;
  timezoneOffset?: string;
}

interface DownloadParams extends CreateJobParams {
  /** Defaults to `Config.maxRetries` */
  maxRetries?: number;
  retryInterval?: number;
}

interface GetStatusParams extends Pick<UriParams, 'folder' | 'service'> {
  folder: string;
  service: string;
  jobId: string;
  /** Defaults to 'json' */
  type?: DownloadFileType;
  /** Defaults to `Config.maxRetries` */
  maxRetries?: number;
  retryInterval?: number;
}

type HistoryApiResponse<T = Record<string, any>> = ApiResponse & { response_data: T };

type LogRehydrated = HistoryApiResponse<{ download_url: string }>;

type JobCreated = HistoryApiResponse<{ job_id: string }>;

type LogStatus = HistoryApiResponse<{ progress: number; download_url: string }>;
