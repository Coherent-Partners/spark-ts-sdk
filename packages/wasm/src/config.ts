import { BaseUrl, JwtConfig, SparkError } from '@cspark/sdk';

import Utils from './utils';
import { ClientOptions } from './client';
import { ENV_VARS, DEFAULT_RUNNER_URL } from './constants';

export class Config extends JwtConfig {
  /**
   * Overrides parent's copyWith as `env` and `oauth` are not applicable.
   */
  copyWith(options: ClientOptions = {}): Config {
    const { baseUrl: url, tenant } = options;
    return new Config({
      baseUrl: url instanceof BaseUrl ? url.copyWith({ tenant }) : this.baseUrl.copyWith({ url, tenant }),
      apiKey: options.apiKey ?? this.auth.apiKey,
      token: options.token ?? this.auth.token,
      timeout: options.timeout ?? this.timeout,
      maxRetries: options.maxRetries ?? this.maxRetries,
      retryInterval: options.retryInterval ?? this.retryInterval,
      allowBrowser: options.allowBrowser ?? this.allowBrowser,
      logger: options.logger ?? this.logger,
    });
  }
}

export class RunnerUrl extends BaseUrl {
  private constructor(baseUrl: string = Utils.readEnv(ENV_VARS.RUNNER_URL) || DEFAULT_RUNNER_URL, tenant: string = '') {
    super(baseUrl, tenant);
  }

  /**
   * Builds a base URL from the given parameters.
   *
   * @param {object} options - the distinct parameters to build a base URL from.
   * @param {string} options.url - the base URL to use.
   * @param {string} options.tenant - the tenant name.
   * @returns {RunnerUrl} a convenient extension of BaseUrl
   * @throws {SparkError} if a base URL cannot be built from the given parameters.
   */
  static from(options: { url?: string; tenant?: string } = {}): RunnerUrl {
    const errors: string[] = [];

    if (options?.url) {
      try {
        const url = new URL(options.url!);
        const tenant = url.pathname.split('/')[1] || options?.tenant;
        if (!tenant) throw SparkError.sdk('tenant name is required');

        return new this(url.origin, tenant!);
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    } else if (options?.tenant) {
      const tenant = options.tenant.trim().toLowerCase();
      return new this(undefined, tenant);
    }

    throw SparkError.sdk({
      message: errors.join('; ') || 'cannot build base URL from invalid parameters',
      cause: JSON.stringify(options),
    });
  }

  /**
   * Builds a base URL from the given URL without a tenant.
   *
   * NOTE: only valid for health check and version check.
   */
  static noTenant(url: string = Utils.readEnv(ENV_VARS.RUNNER_URL) || DEFAULT_RUNNER_URL): RunnerUrl {
    return new this(url, '');
  }

  /**
   * Overrides parent's copyWith as `env` is not applicable to RunnerUrl.
   */
  copyWith(options: { url?: string; tenant?: string } = {}): RunnerUrl {
    const { url = this.value, tenant = this.tenant } = options;
    return RunnerUrl.from({ url, tenant });
  }
}
