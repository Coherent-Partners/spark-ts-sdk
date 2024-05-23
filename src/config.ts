import Utils from './utils';
import Validators from './validators';
import { SparkError } from './error';
import { Authorization } from './auth';
import { Interceptor } from './http';
import { ClientOptions } from './client';
import { Logger, LoggerOptions } from './logger';
import { DEFAULT_TIMEOUT_IN_MS, ENV_VARS } from './constants';
import { DEFAULT_MAX_RETRIES, DEFAULT_RETRY_INTERVAL } from './constants';

export class Config {
  readonly #options!: string;

  readonly baseUrl!: BaseUrl;
  readonly auth!: Authorization;
  readonly environment?: string | undefined;
  readonly maxRetries!: number;
  readonly retryInterval!: number;
  readonly timeout!: number;
  readonly allowBrowser!: boolean;
  readonly logger!: LoggerOptions;
  readonly extraHeaders: Record<string, string> = {};
  readonly interceptors: Set<Interceptor> = new Set<Interceptor>();

  constructor({
    baseUrl: url = Utils.readEnv(ENV_VARS.BASE_URL),
    apiKey = Utils.readEnv(ENV_VARS.API_KEY),
    token = Utils.readEnv(ENV_VARS.BEARER_TOKEN),
    timeout = DEFAULT_TIMEOUT_IN_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryInterval = DEFAULT_RETRY_INTERVAL,
    tenant,
    env,
    ...options
  }: ClientOptions = {}) {
    const numberValidator = Validators.positiveInteger.getInstance();

    this.baseUrl = url instanceof BaseUrl ? url : BaseUrl.from({ url, tenant, env });
    this.auth = Authorization.from({ apiKey, token, oauth: options?.oauth });
    this.timeout = numberValidator.isValid(timeout) ? timeout! : DEFAULT_TIMEOUT_IN_MS;
    this.maxRetries = numberValidator.isValid(maxRetries) ? maxRetries! : DEFAULT_MAX_RETRIES;
    this.retryInterval = numberValidator.isValid(retryInterval) ? retryInterval! : DEFAULT_RETRY_INTERVAL;
    this.allowBrowser = this.auth.isOpen || !!options.allowBrowser;
    this.logger = Logger.for(options.logger);
    this.environment = env;

    this.#options = JSON.stringify({
      baseUrl: this.baseUrl.toString(),
      apiKey: this.auth.apiKey,
      token: this.auth.token,
      oauth: this.auth.oauth?.toString(),
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      retryInterval: this.retryInterval,
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

  get hasInterceptors(): boolean {
    return this.interceptors.size > 0;
  }

  get hasHeaders(): boolean {
    return !Utils.isEmptyObject(this.extraHeaders);
  }

  copyWith(options: ClientOptions = {}): Config {
    const { baseUrl: url = this.baseUrl.value, tenant = this.baseUrl.tenant, env = this.environment } = options;
    return new Config({
      baseUrl: url instanceof BaseUrl ? url : BaseUrl.from({ url, tenant, env }),
      apiKey: options.apiKey ?? this.auth.apiKey,
      token: options.token ?? this.auth.token,
      oauth: options.oauth ?? this.auth.oauth,
      timeout: options.timeout ?? this.timeout,
      maxRetries: options.maxRetries ?? this.maxRetries,
      retryInterval: options.retryInterval ?? this.retryInterval,
      allowBrowser: options.allowBrowser ?? this.allowBrowser,
      logger: options.logger ?? this.logger,
    });
  }

  toString(): string {
    return this.#options;
  }
}

export class BaseUrl {
  readonly url!: URL;

  protected constructor(
    baseUrl: string,
    readonly tenant: string,
  ) {
    this.url = new URL(baseUrl + '/' + tenant);
  }

  /**
   * Builds a base URL from the given parameters.
   * @param {object} options - the distinct parameters to build a base URL from.
   * @param {string} options.url - the base URL to use.
   * @param {string} options.tenant - the tenant name.
   * @param {string} options.env - the environment name to use.
   * @returns a BaseUrl
   * @throws {SparkError} if a base URL cannot be built from the given parameters.
   */
  static from(options: { url?: string; tenant?: string; env?: string } = {}): BaseUrl {
    const stringValidator = Validators.emptyString.getInstance();
    const urlValidator = Validators.baseUrl.getInstance();

    if (urlValidator.isValid(options?.url)) {
      const url = new URL(options.url!);
      const tenant = url.pathname.split('/')[1] || options?.tenant;

      if (stringValidator.isValid(tenant, 'tenant name is required')) {
        return new this(url.origin, tenant!);
      }
    } else if (options?.env && options?.tenant) {
      const env = options.env.trim().toLowerCase();
      const tenant = options.tenant.trim().toLowerCase();
      return new this(`https://excel.${env}.coherent.global`, tenant);
    } else {
      // capture errors for missing parameters
      stringValidator.isValid(options?.env, 'environment name is missing') &&
        stringValidator.isValid(options?.tenant, 'tenant name is missing');
    }

    const errors = urlValidator.errors.concat(stringValidator.errors);
    throw SparkError.sdk({
      message: errors.map((e) => e.message).join('; ') || 'cannot build base URL from invalid parameters',
      cause: JSON.stringify(options),
    });
  }

  /** The base URL */
  get value(): string {
    return this.url.origin;
  }

  /** The base URL including the tenant name. */
  get full(): string {
    return this.url.toString();
  }

  /** The base URL for the keycloak service. */
  get oauth2(): string {
    return this.to('keycloak').concat('/auth/realms/', this.tenant);
  }

  /**
   * Gets the equivalent URL for the given service.
   * @param service name to replace the engine
   * @returns the base URL for the given service (e.g., "https://entitystore.us.coherent.global")
   */
  to(service: 'excel' | 'keycloak' | 'utility' | 'entitystore', withTenant = false): string {
    return (withTenant ? this.full : this.value).replace(/excel/, service);
  }

  toString(): string {
    return this.full;
  }
}
