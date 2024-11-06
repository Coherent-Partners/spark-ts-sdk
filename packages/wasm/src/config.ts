import { BaseUrl, JwtConfig } from '@cspark/sdk';

import { DEFAULT_RUNNER_URL } from './constants';

export class Config extends JwtConfig {}

export class RunnerUrl extends BaseUrl {
  constructor(baseUrl: string = DEFAULT_RUNNER_URL, tenant: string = '') {
    super(baseUrl, tenant); // bypass the URL validation set in `BaseUrl.from()`
  }
}
