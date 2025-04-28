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

export type HealthStatus = { status: string };
