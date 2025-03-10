import { ApiResource, HttpResponse } from '@cspark/sdk';

export class Version extends ApiResource {
  /**
   * Gets the neuron version compatibility of the runner.
   * @returns {Promise<HttpResponse<NeuronVersion>>} version of the runner.
   */
  get(): Promise<HttpResponse<NeuronVersion>> {
    return this.request(`${this.config.baseUrl.value}/version`);
  }
}

export class Health extends ApiResource {
  /**
   * Checks the health of the runner.
   * @returns {Promise<HttpResponse<HealthStatus>>} health status of the runner.
   */
  check(): Promise<HttpResponse<HealthStatus>> {
    return this.request(`${this.config.baseUrl.value}/healthcheck`);
  }
}

export type HealthStatus = { msg: string };

export type NeuronVersion = {
  lastPullDate: string;
  filehash: string;
  version: string;
};
