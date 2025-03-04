import Utils, { Maybe, loadModule } from './utils';
import Validators from './validators';
import { SparkError } from './error';
import { Authorization } from './auth';
import { Interceptor } from './http';
import { ClientOptions } from './client';
import { Logger, LoggerOptions } from './logger';
import { Uri, UriOptions, UriParams } from './resources';
import { DEFAULT_TIMEOUT_IN_MS, ENV_VARS } from './constants';
import { DEFAULT_MAX_RETRIES, DEFAULT_RETRY_INTERVAL } from './constants';

export class Config {
  readonly #options!: string;

  readonly baseUrl!: BaseUrl;
  readonly auth!: Authorization;
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
      throw SparkError.sdk(
        ''.concat(
          'looks like you are running in a browser-like environment.\n\n',
          'This is disabled by default as it risks exposing your secret API credentials to attackers.\n',
          'If you understand the risks and have appropriate mitigations in place,\n',
          'you can set the `allowBrowser` option to `true`, e.g.,\n\nnew SparkClient({ allowBrowser: true, ... });\n',
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
    const { baseUrl: url, tenant, env } = options;
    return new Config({
      baseUrl: url instanceof BaseUrl ? url.copyWith({ tenant, env }) : this.baseUrl.copyWith({ url, tenant, env }),
      apiKey: options.apiKey ?? this.auth.apiKey,
      token: options.token ?? this.auth.token,
      oauth: options.oauth ?? this.auth.oauth?.toJson(),
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

export class JwtConfig extends Config {
  /**
   * Decodes a Spark-issued JWT and extracts the base URL and tenant name.
   * @param token {string} - the JWT to decode.
   * @returns {ClientOptions} the token itself, and decoded base URL and tenant name.
   *
   * This method is not supported in browser environments and is not intended for general
   * use of token decoding. Additionally, it requires the `jwt-decode` module to be installed.
   */
  static decode(token: string): Pick<ClientOptions, 'baseUrl' | 'tenant' | 'token'> {
    if (Utils.isBrowser()) throw SparkError.sdk('JWT decoding is not supported in browser environments');

    const jwtDecode = loadModule('jwt-decode')?.jwtDecode;
    if (!jwtDecode) throw SparkError.sdk('jwt-decode module is not available; use `npm install jwt-decode`');

    try {
      const decoded: JwtPayload = jwtDecode(token?.replace(/bearer/i, '')?.trim());
      return {
        baseUrl: BaseUrl.from({ url: new URL(decoded?.iss || '').toString() }).to('excel'),
        tenant: decoded?.realm,
        token,
      };
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'InvalidTokenError') {
        throw SparkError.sdk({ message: `invalid JWT value <${token}>`, cause });
      }
      throw SparkError.sdk({ message: 'cannot decode JWT value', cause: token });
    }
  }

  /**
   * Builds a Config from the given JWT token.
   * @param {ClientOptions} options - the distinct parameters to build a Config from.
   * @param {string} options.token - the JWT token to decode.
   * @returns {Config} necessary setting (base url and tenant) to create a Spark instance.
   * @throws {SparkError} if basic config cannot be built from the given JWT token.
   */
  static from({ token = Utils.readEnv(ENV_VARS.BEARER_TOKEN), ...options }: ClientOptions = {}): Config {
    if (!token) throw SparkError.sdk('Bearer token is required');
    const decoded = JwtConfig.decode(token);
    return new this({ ...options, ...decoded });
  }
}

export class BaseUrl {
  readonly url!: URL;
  readonly env: string | undefined;
  readonly service: string | undefined;

  protected constructor(
    baseUrl: string,
    readonly tenant: string,
  ) {
    const url = new URL(baseUrl + '/' + tenant);

    const matches = url.origin.match(/https:\/\/([^\.]+)\.((?:[^\.]+\.)?[^\.]+)\.coherent\.global/);
    if (matches && matches.length >= 3) {
      const [, service, env] = matches;
      this.service = ['excel', 'keycloak', 'utility', 'entitystore'].includes(service?.toLowerCase())
        ? service.toLowerCase()
        : 'excel';
      this.env = env?.toLowerCase();
      this.url = new URL(`https://${this.service}.${this.env}.coherent.global/${tenant}`);
    } else {
      this.url = url;
      // no environment or service needed for local development.
      this.service = undefined;
      this.env = undefined;
    }
  }

  /**
   * Builds a base URL from the given parameters.
   *
   * A Spark base URL comprises the following parts:
   * - the service name (e.g., excel)
   * - the environment or region name (e.g., uat.us)
   * - and the tenant name (e.g., my-tenant)
   *
   * So, a base URL should look like this: `https://{service}.{env}.coherent.global/{tenant}`.
   * Though these parts can be provided separately, the `url` parameter is the source of truth.
   * That is, if the `url` is provided, the service, environment, and tenant names are extracted
   * from it. Note that if an unsupported service name is provided such as this Spark URL:
   * `https://spark.us.coherent.global/my-tenant`, the service name will default to `excel`.
   *
   * @param {object} options - the distinct parameters to build a base URL from.
   * @param {string} options.url - the base URL to use.
   * @param {string} options.tenant - the tenant name.
   * @param {string} options.env - the environment name to use.
   * @returns a Spark BaseUrl
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

  /** The base URL only (no tenant). */
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
    return (withTenant ? this.full : this.value).replace(this.service ?? /excel/, service);
  }

  copyWith(options: { url?: string; tenant?: string; env?: string } = {}): BaseUrl {
    const { url, tenant = this.tenant, env = this.env } = options;
    return url ? BaseUrl.from({ url, tenant }) : BaseUrl.from({ tenant, env });
  }

  /**
   * Augments (or adjusts) the base URL to support the given parameters.
   *
   * This is a convenience method to build a Uri from the base URL. This is a
   * convenience method as sometimes the final URL has to be restructured to
   * accommodate the tenant name or other parameters. This helps centralize the logic
   * for building URLs in a consistent manner for each `ApiResource`.
   *
   * @param {UriParams} [params] - Uri parameters to reshape the URL with if any.
   * @param {object} options - parameters to build a Uri from.
   * @param {string} options.version - the API version to use.
   * @param {string} options.endpoint - the API endpoint to use.
   * @returns a Spark Uri.
   *
   * NOTE: By default, `UriOptions.version` is set to 'api/v3' in `Uri.from(...)`.
   * This is because most of the APIs are built on that version. `api/v1` is also
   * supported for backward compatibility.
   */
  add(params: Maybe<UriParams>, { version, endpoint }: Omit<UriOptions, 'base'>): Uri {
    const url = version?.toLowerCase() === 'api/v1' ? this.value : this.full;
    return Uri.from(params, { base: url, version, endpoint });
  }

  /**
   * Concatenates the base URL with the given parameters.
   * @param {Omit<UriOptions, 'base'>} options - parameters to build a Uri from.
   * @param {string} options.version - the API version to use.
   * @param {string} options.endpoint - the API endpoint to use.
   * @returns a Spark Uri.
   *
   * @see {@link add} for more details on how this method works.
   */
  concat({ version, endpoint }: Omit<UriOptions, 'base'>): Uri {
    return this.add(undefined, { version, endpoint });
  }

  toString(): string {
    return this.full;
  }
}

interface JwtPayload {
  exp?: number;
  iat?: number;
  auth_time?: number;
  jti?: string;
  iss?: string;
  aud?: string[] | string;
  sub?: string;
  typ?: string;
  'allowed-origins'?: string[];
  scope?: string;
  name?: string;
  realm?: string;
  [key: string]: any;
}
