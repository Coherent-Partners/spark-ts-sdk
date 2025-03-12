import { SparkOptions, BaseUrl, HttpResponse } from '@cspark/sdk';

import { Config, RunnerUrl } from './config';
import * as API from './resources';

/**
 * The available settings to initialize a new Hybrid client.
 *
 * These options are used to configure the behavior of the `HybridClient`, including
 * the base URL for the APIs, the API key to use for authentication, and the maximum
 * amount of time to wait for a response from the server before timing out.
 */
export interface ClientOptions extends Omit<SparkOptions, 'oauth' | 'env'> {}

/**
 * The main entry point for the Coherent Hybrid Runner SDK client.
 *
 * Visit the main documentation page for more details on how to use the SDK.
 * @see https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/packages/wasm/docs
 */
export class Client {
  /**
   * The configuration being used by the client.
   *
   * It includes a curated set of the provided options used to customize the behavior
   * of the client and the resources it provides access to.
   */
  readonly config!: Config;

  constructor(options: ClientOptions | Config) {
    if (options instanceof Config) {
      this.config = options;
    } else {
      const { baseUrl: url, tenant, ...opts } = options;
      const baseUrl = url instanceof BaseUrl ? url : RunnerUrl.from({ url, tenant });
      this.config = new Config({ baseUrl, ...opts });
    }
  }

  /** The resource to check neuron version compatibility. */
  get version(): API.Version {
    return new API.Version(this.config);
  }

  /** The resource to check health status. */
  get health(): API.Health {
    return new API.Health(this.config);
  }

  /** The resource to manage Services API. */
  get services(): API.Services {
    return new API.Services(this.config);
  }

  /**
   * Convenience method to check the health of the runner.
   *
   * @param {string} baseUrl of the runner to check.
   * @param {ClientOptions} options to use for the client.
   */
  static healthCheck(
    baseUrl?: string,
    { token = 'open', ...options }: Omit<ClientOptions, 'tenant' | 'baseUrl'> = {},
  ): Promise<HttpResponse<API.HealthStatus>> {
    const config = new Config({ ...options, token, baseUrl: RunnerUrl.noTenant(baseUrl) });
    return new API.Health(config).check();
  }

  /**
   * Convenience method to check the neuron version of the runner.
   *
   * @param {string} baseUrl of the runner to check.
   * @param {ClientOptions} options to use for the client.
   */
  static getVersion(
    baseUrl?: string,
    { token = 'open', ...options }: Omit<ClientOptions, 'tenant' | 'baseUrl'> = {},
  ): Promise<HttpResponse<API.NeuronVersion>> {
    const config = new Config({ ...options, token, baseUrl: RunnerUrl.noTenant(baseUrl) });
    return new API.Version(config).get();
  }
}

export default Client;
