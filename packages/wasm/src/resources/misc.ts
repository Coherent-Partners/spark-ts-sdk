import { HttpResponse } from '@cspark/sdk';
import { HybridResource } from './base';

export class Version extends HybridResource {
  /**
   * Gets the neuron version compatibility of the runner.
   * @returns {Promise<HttpResponse<NeuronVersion>>} version of the runner.
   */
  get(): Promise<HttpResponse<NeuronVersion>> {
    return this.request(`${this.config.baseUrl.value}/version`);
  }
}

export class Health extends HybridResource {
  /**
   * Checks the health of the runner.
   * @returns {Promise<HttpResponse<HealthStatus>>} health status of the runner.
   */
  check(): Promise<HttpResponse<HealthStatus>> {
    return this.request(`${this.config.baseUrl.value}/healthcheck`);
  }
}

export class Status extends HybridResource {
  /**
   * Checks the status of the runner.
   *
   * When using the automatic WASM pull feature, the runner will create a temporary
   * mapping of the WASM packages locally and use them to create and execute services.
   * This method provides some visibility into these instances and their usage statistics
   * for monitoring purposes.
   * @returns {Promise<HttpResponse<RunnerStatus>>} status of the runner.
   */
  get(): Promise<HttpResponse<RunnerStatus>> {
    return this.request(`${this.config.baseUrl.value}/status`);
  }
}

export type HealthStatus = { msg: string };

export type NeuronVersion = {
  lastPullDate: string;
  filehash: string;
  version: string;
};

export type RunnerStatus = {
  models: Array<{
    tenant: string;
    model_stats: Array<{
      thread_stats: {
        [key: string]: Array<{
          init_time_ms: number;
          init_memory_mb: number | null;
          uptime_ms: number;
          peak_memory_mb: number | null;
          last_execute_consume_memory_mb: number | null;
          current_memory_mb: number;
        }>;
      };
      memory_usage_mb: number;
      uptime_ms: number;
      min_time_ms: number;
      mean_time_ms: number;
      p95_time_ms: number;
      p99_time_ms: number;
      max_time_ms: number;
      busy: number;
      size: number;
      id: string;
      last_use: string;
      completed_count: number;
      running_count: number;
      crash_count: number;
      timeout_count: number;
    }>;
    total_model: number;
    total_instances: number;
  }>;
  memory_usage_mb: number;
  memory_limit_mb: number;
  [key: string]: any;
};
