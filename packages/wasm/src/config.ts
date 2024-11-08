import { BaseUrl, JwtConfig } from '@cspark/sdk';

import Utils from './utils';
import { ENV_VARS, DEFAULT_RUNNER_URL } from './constants';

export class Config extends JwtConfig {}

export class RunnerUrl extends BaseUrl {
  constructor(baseUrl: string = Utils.readEnv(ENV_VARS.RUNNER_URL) || DEFAULT_RUNNER_URL, tenant: string = '') {
    super(baseUrl, tenant); // bypass the URL validation set in `BaseUrl.from()`
  }
}
