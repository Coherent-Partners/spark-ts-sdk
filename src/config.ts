import Utils from './utils';
import Validators from './validators';
import { ClientOptions } from './client';
import { Logger, type LoggerOptions } from './logger';
import { SparkError } from './error';
import { Authorization } from './auth';
import { Interceptor } from './http';
import { DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_IN_MS, ENV_VARS } from './constants';

export class Config {
  readonly #options!: string;
  readonly #interceptors: Set<Interceptor> = new Set<Interceptor>();

  readonly baseUrl!: BaseUrl;
  readonly auth!: Authorization;
  readonly environment?: string | undefined;
  readonly maxRetries!: number;
  readonly timeout!: number;
  readonly allowBrowser!: boolean;
  readonly logger!: LoggerOptions;
  readonly extraHeaders: Record<string, string> = {};

  constructor({
    baseUrl = Utils.readEnv(ENV_VARS.BASE_URL),
    apiKey = Utils.readEnv(ENV_VARS.API_KEY),
    token = Utils.readEnv(ENV_VARS.BEARER_TOKEN),
    ...options
  }: ClientOptions = {}) {
    const numberValidator = Validators.positiveInteger;

    this.baseUrl = BaseUrl.from({ url: baseUrl, tenant: options?.tenant, env: options?.env });
    this.auth = Authorization.from({ apiKey, token, oauth: options?.oauth });
    this.timeout = numberValidator.isValid(options.timeout) ? options.timeout! : DEFAULT_TIMEOUT_IN_MS;
    this.maxRetries = numberValidator.isValid(options.maxRetries) ? options.maxRetries! : DEFAULT_MAX_RETRIES;
    this.allowBrowser = this.auth.isOpen || !!options.allowBrowser;
    this.logger = Logger.of(options.logger).options;
    this.environment = options.env;

    this.#options = JSON.stringify({
      baseUrl: this.baseUrl.toString(),
      apiKey: this.auth.apiKey,
      token: this.auth.token,
      oauth: this.auth.oauth?.toJson(),
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      allowBrowser: this.allowBrowser,
    });

    if (!this.allowBrowser && Utils.isBrowser()) {
      throw new SparkError(
        ''.concat(
          'It looks like you are running in a browser-like environment.\n\n',
          'This is disabled by default, as it risks exposing your secret API credentials to attackers.\n',
          'If you understand the risks and have appropriate mitigations in place,\n',
          'you can set the `allowBrowser` option to `true`, e.g.,\n\nnew Spark({ allowBrowser: true, ... });\n',
        ),
      );
    }
  }

  get interceptors(): Interceptor[] {
    return Array.from(this.#interceptors);
  }

  get hasInterceptors(): boolean {
    return this.#interceptors.size > 0;
  }

  get hasHeaders(): boolean {
    return !Utils.isEmptyObject(this.extraHeaders);
  }

  /**
   * Adds interceptors to the configuration (experimental feature).
   * @param interceptors - methods to intercept requests and responses
   */
  addInterceptors(...interceptors: Interceptor[]): void {
    interceptors.forEach((interceptor) => {
      if (this.#interceptors.has(interceptor)) return;
      this.#interceptors.add(interceptor);
    });
  }

  addHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([key, value]) => {
      this.extraHeaders[key] = value;
    });
  }

  copyWith(options: ClientOptions = {}): Config {
    return new Config({
      baseUrl: options.baseUrl || this.baseUrl.full,
      apiKey: options.apiKey || this.auth.apiKey,
      token: options.token || this.auth.token,
      oauth: options.oauth || this.auth.oauth,
      timeout: options.timeout || this.timeout,
      maxRetries: options.maxRetries || this.maxRetries,
      allowBrowser: options.allowBrowser || this.allowBrowser,
      env: options.env || this.environment,
    });
  }

  toString(): string {
    return this.#options;
  }
}

export class BaseUrl {
  readonly url!: URL;

  private constructor(
    baseUrl: string,
    readonly tenant: string,
  ) {
    this.url = new URL(baseUrl + '/' + tenant);
  }

  static from(options: { url?: string; tenant?: string; env?: string } = {}): BaseUrl {
    const stringValidator = Validators.emptyString;
    const urlValidator = Validators.baseUrl;

    if (urlValidator.isValid(options?.url)) {
      const url = new URL(options.url!);
      const tenant = url.pathname.split('/')[1] || options?.tenant;

      if (stringValidator.isValid(tenant, 'tenant name is required')) {
        return new this(url.origin, tenant!);
      }
    }

    if (options?.env && options?.tenant) {
      const env = options.env.trim().toLowerCase();
      const tenant = options.tenant.trim().toLowerCase();
      return new this(`https://excel.${env}.coherent.global`, tenant);
    }

    const errors = urlValidator.errors.concat(stringValidator.errors);
    throw SparkError.sdk({
      message: errors.map((e) => e.message).join('; ') || 'cannot build base URL from invalid parameters',
      cause: JSON.stringify(options),
    });
  }

  get value(): string {
    return this.url.origin;
  }

  get full(): string {
    return this.url.toString();
  }

  get oauth2(): string {
    return this.to('keycloak').concat('/auth/realms/', this.tenant);
  }

  /**
   * Gets the equivalent URL for the given service.
   * @param service name to replace the engine
   * @returns the base URL for the given service (e.g., "https://entitystore.us.coherent.global")
   */
  to(service: 'excel' | 'keycloak' | 'utility' | 'entitystore', withTenant = false): string {
    return withTenant ? this.full.replace(/excel/, service) : this.value.replace(/excel/, service);
  }

  toString(): string {
    return this.full;
  }
}
