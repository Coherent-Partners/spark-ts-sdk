import { SparkOptions, BaseUrl } from '@cspark/sdk';

import * as API from './resources';
import { DEFAULT_RUNNER_URL } from './constants';
import { Config, RunnerUrl } from './config';

export interface ClientOptions extends Omit<SparkOptions, 'oauth'> {
  tenant: string;
}

export class Client {
  readonly config!: Config;

  constructor(options: ClientOptions | Config) {
    if (options instanceof Config) {
      this.config = options;
    } else {
      const { baseUrl: url = DEFAULT_RUNNER_URL, tenant, ...opts } = options;
      const baseUrl = url instanceof BaseUrl ? url : new RunnerUrl(url, tenant);
      this.config = new Config({ baseUrl, ...opts });
    }
  }

  get version(): API.Version {
    return new API.Version(this.config);
  }

  get health(): API.Health {
    return new API.Health(this.config);
  }

  get services(): API.Services {
    return new API.Services(this.config);
  }

  static healthCheck(
    baseUrl: string = DEFAULT_RUNNER_URL,
    { token = 'open', ...options }: Omit<ClientOptions, 'tenant' | 'baseUrl'> = {},
  ) {
    const config = new Config({ ...options, token, baseUrl: new RunnerUrl(baseUrl) });
    return new API.Health(config).check();
  }

  static getVersion(
    baseUrl: string = DEFAULT_RUNNER_URL,
    { token = 'open', ...options }: Omit<ClientOptions, 'tenant' | 'baseUrl'> = {},
  ) {
    const config = new Config({ ...options, token, baseUrl: new RunnerUrl(baseUrl) });
    return new API.Version(config).get();
  }
}

export default Client;
