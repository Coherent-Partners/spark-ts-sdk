import { type Readable } from 'stream';
import { Maybe, StringUtils } from './utils';
import { Config, type BaseUrl, HealthUrl } from './config';
import { LogLevel, LoggerOptions } from './logger';
import { Authorization, AuthMethod } from './auth';
import { HttpResponse } from './http';
import * as API from './resources';

/**
 * The available settings to initialize a new Spark client.
 *
 * These options are used to configure the behavior of the `SparkClient`, including
 * the base URL for the APIs, the API key to use for authentication, and the maximum
 * amount of time to wait for a response from the server before timing out.
 *
 * Some of these options can be set using environment variables, which are read
 * by default if the corresponding option is not provided.
 *
 * For example, the following environment variables are used:
 * - `CSPARK_BASE_URL` for `baseUrl`
 * - `CSPARK_API_KEY` for `apiKey`
 * - `CSPARK_BEARER_TOKEN` for `token`
 *
 * For user authentication, you may use either an API key, a bearer token, or
 * OAuth2 client credentials. If all of them are provided, the client will consider
 * certain order of precedence (OAuth2 > API key > Bearer token). When using OAuth2,
 * the client will temporarily store the token and refresh it upon expiry.
 */
export interface ClientOptions extends AuthMethod {
  /**
   * Overrides the base URL read from `process.env['CSPARK_BASE_URL']`.
   *
   * This can be only origin (e.g., `https://excel.my-env.coherent.global`) or may
   * include the tenant name (e.g., `https://excel.my-env.coherent.global/my-tenant`).
   * When the tenant name is not provided, the `tenant` option will be used as a
   * backup to build the final base URL.
   */
  baseUrl?: Maybe<string | BaseUrl>;

  /**
   * Overrides the inferred tenant name from `baseUrl` if any.
   */
  tenant?: Maybe<string>;

  /**
   * The environment piece of the base URL, e.g., "sit" or "uat.us".
   *
   * This can be used in conjunction with `tenant` as a fallback to build the base
   * URL when `baseUrl` is not provided, corrupted or is incomplete. If `baseUrl`
   * is provided, this option will be ignored.
   */
  env?: Maybe<string>;

  /**
   * The maximum amount of time (in milliseconds) that the client should wait for
   * a response from the server before timing out a single request.
   *
   * Note that request timeouts are retried by default, so in a worst-case scenario
   * you may wait much longer than this timeout before the promise succeeds or fails.
   */
  timeout?: number;

  /**
   * The maximum number of times that the client will retry a request in case of a
   * temporary failure, like a authentication error or rate limit from the server.
   *
   * By default, the client will retry requests up to 2 times.
   */
  maxRetries?: number;

  /**
   * The interval (in seconds, defaults to 1) between retries.
   *
   * This value is used to calculate the exponential backoff time with randomized
   * jitters. The actual retry interval will be a random value between 0.5 and 1.5
   * times the retry interval.
   */
  retryInterval?: number;

  /**
   * By default, client-side use of this library is not recommended, as it risks exposing
   * your secret API credentials to attackers.
   * Only set this option to `true` if you understand the risks and have appropriate
   * mitigations in place.
   */
  allowBrowser?: boolean;

  /**
   * Enables or disables the logger for the client.
   * if `boolean`, determines whether client should print logs.
   * if `LogLevel | LogLevel[]`, client will print logs with the specified log level(s).
   * if `LoggerOptions`, client will print logs in accordance with the specified options.
   *
   * @see LoggerOptions for more details.
   */
  logger?: boolean | LogLevel | LogLevel[] | LoggerOptions;
}

/**
 * The main entry point for the Coherent Spark SDK client.
 *
 * This class provides access to all the resources available in the SDK, including
 * the `folders`, and `services` APIs, as well as the `impex` and `wasm` utilities.
 *
 * Visit the main documentation page for more details on how to use the SDK.
 * @see https://github.com/Coherent-Partners/spark-ts-sdk/blob/main/docs
 */
export class Client {
  /**
   * The configuration being used by the client.
   *
   * It includes a curated set of the provided options used to customize the behavior
   * of the client and the resources it provides access to. IE, the client relies
   * on this configuration to make requests to the Spark APIs.
   * @see Config for more details.
   */
  readonly config!: Config;

  constructor(options?: ClientOptions | Config) {
    this.config = options instanceof Config ? options : new Config(options);
  }

  /** The resource to check health status. */
  get health(): API.Health {
    return new API.Health(this.config);
  }

  /** The resource to manage Folders API. */
  get folders(): API.Folders {
    return new API.Folders(this.config);
  }

  /** The resource to manage Services API. */
  get services(): API.Services {
    return new API.Services(this.config);
  }

  /** The resource to manage Transforms API. */
  get transforms(): API.Transforms {
    return new API.Transforms(this.config);
  }

  /** The resource to manage asynchronous batch processing. */
  get batches(): API.Batches {
    return new API.Batches(this.config);
  }

  /** The resource to manage service execution logs. */
  get logs(): API.History {
    return new API.History(this.config);
  }

  /** The resource to manage files. */
  get files(): API.Files {
    return new API.Files(this.config);
  }

  /** The resource to import and export Spark services. */
  get impex(): API.ImpEx {
    return API.ImpEx.only(this.config);
  }

  /** The resource to manage a service's WebAssembly module. */
  get wasm(): API.Wasm {
    return new API.Wasm(this.config);
  }

  /**
   * Convenience method to check Spark environment's health status.
   *
   * @param {string | BaseUrl | URL} url of the Spark environment to check.
   * @param {ClientOptions} options to use for the client.
   *
   * Note that url can be treated as an environment name, in which case the url will be
   * constructed as `https://excel.${environment}.coherent.global`.
   */
  static healthCheck(
    url: string | BaseUrl | URL,
    { token = 'open', ...options }: Omit<ClientOptions, 'tenant' | 'baseUrl'> = {},
  ): Promise<HttpResponse<API.HealthStatus>> {
    const config = new Config({ ...options, token, baseUrl: HealthUrl.when(url) });
    return new API.Health(config).check();
  }

  /**
   * Creates a client and extends its capabilities with additional API resources.
   * @param {API.ApiResource} resource - the additional resource to extend the client with.
   * @param {ClientOptions} options - client configuration.
   * @returns the new client with extended functionality.
   *
   * @see API.Extensible for more details.
   *
   * @example
   * ```typescript
   * class Test extends ApiResource { foo() { ... } }
   * const spark = SparkClient.extend({ prop: 'test', type: Test }, JwtConfig.decode('bearer token'));
   * spark.test.foo();
   * ```
   */
  static extend<R extends API.ApiResource>(
    resource: API.Extensible<R>,
    options: ClientOptions | Config,
  ): Client & { [k: string]: R } {
    const { prop, type, args = [] } = resource;
    const client = new Client(options);
    return Object.assign(client, { [prop]: new type(client.config, ...args) });
  }

  /**
   * Extends the client with additional API resources.
   * @param {API.ApiResource | API.Extensible} resource - the additional resource to extend the client with.
   * The resource can either be an instance of a subclass of `ApiResource` or an object of type
   * `API.Extensible` that specifies the resource's property name (prop), a subclass definition
   * of `ApiResource` (type), and optional constructor arguments (args).
   * @returns the extended client with the new resource.
   *
   * When the resource is an instance of `ApiResource`, the property name will be inferred
   * from the class name using camel case (e.g., `class MyResource` => `myResource`). The
   * extended client will have a new property with the same name as the resource to
   * access its class members.
   */
  extend<R extends API.ApiResource>(resource: R | API.Extensible<R>): this & { [k: string]: R } {
    if (resource instanceof API.ApiResource) {
      const prop = StringUtils.toCamelCase(resource.constructor.name);
      return Object.assign(this, { [prop]: resource });
    }

    const { prop, type, args = [] } = resource;
    return Object.assign(this, { [prop]: new type(this.config, ...args) });
  }

  /**
   * Downloads a file from the given URL.
   * @param url - valid URL
   * @param {Authorization} [auth] - optional Spark authorization
   */
  static download(url: string, auth?: Authorization): Promise<Readable> {
    return API.download(url, auth);
  }

  /**
   * Prepares migration data from one tenant to another.
   * @param {ClientOptions | Config} from - source tenant options or configuration.
   * @param {ClientOptions | Config} to - target tenant options or configuration.
   * @throws {SparkError} if invalid options are provided.
   */
  static migration(from: Config | ClientOptions, to: Config | ClientOptions): API.Migration {
    return API.ImpEx.migration({
      exports: from instanceof Config ? from : new Config(from),
      imports: to instanceof Config ? to : new Config(to),
    });
  }

  /**
   * Prepares migration data from one tenant to another.
   * @param {Config | ClientOptions} to - target tenant options or configuration
   * @param {Config | ClientOptions} [from] - optional source tenant configuration; if not provided,
   * the current tenant configuration will be used as the source.
   */
  migration(to: Config | ClientOptions, from: Config | ClientOptions = this.config): API.Migration {
    return API.ImpEx.migration({
      exports: from instanceof Config ? from : new Config(from),
      imports: to instanceof Config ? to : new Config(to),
    });
  }
}

export default Client;
