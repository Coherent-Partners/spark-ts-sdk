import { HttpResponse } from '../http';
import { ApiResource } from './base';

export class Health extends ApiResource {
  /** Checks the health status or connectivity of a Spark environment. */
  check(): Promise<HttpResponse<HealthStatus>> {
    return this.request(`${this.config.baseUrl.value}/health`);
  }

  /** Returns `true` if the Spark environment is healthy. */
  async ok(): Promise<boolean> {
    const { status, data } = await this.check();
    return status === 200 && data.status?.toLowerCase() === 'up';
  }
}

export class Platform extends ApiResource {
  /** Returns the configuration of the Spark environment. */
  async getConfig(): Promise<HttpResponse<PlatformConfig>> {
    const url = this.config.baseUrl.concat({ version: 'api/v1', endpoint: 'config/GetSparkConfiguration' });
    return this.request(url, { method: 'GET' }).then((response: HttpResponse<any>) => {
      return { ...response, data: response.data?.status === 'Success' ? response.data?.data : {} };
    });
  }
}

export type HealthStatus = { status: string };

export type PlatformConfig = Record<string, any>;
