import { Maybe } from './utils';
import { Config, type BaseUrl } from './config';
import { LogLevel, LoggerOptions } from './logger';
import { Authorization, OAuthMethod } from './auth';
import * as API from './resources';

/**
 * The available settings to initialize a new client.
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
 * Note that for user authentication you can use either an API key, a bearer token,
 * OAuth2 client credentials. If all of them are provided, the client will consider
 * certain order of precedence (API key > Bearer token > OAuth). When using OAuth,
 * the client will temporarily store the token and refresh it as needed upon expiry.
 */
export interface ClientOptions extends OAuthMethod {
  /**
   * Overrides the default base URL for the API, e.g., "https://excel.us.coherent.global/tenant-name/"
   * By default, it'll be read from `process.env['CSPARK_BASE_URL']`.
   */
  baseUrl?: Maybe<string | BaseUrl>;

  /**
   * Overrides the inferred tenant name from `baseUrl`.
   */
  tenant?: Maybe<string>;

  /**
   * The environment piece of the base URL, e.g., "sit" or "uat.us".
   *
   * This can be used in conjunction with `tenant` as a fallback to build the base
   * URL when `baseUrl` is not provided, corrupted or is incomplete.
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
   * temporary failure, like a network error or a 5XX error from the server.
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
 * the `folder`, and `service` APIs, as well as the `impex` and `wasm` utilities.
 *
 * Visit the main documentation page for more details on how to use the SDK.
 * @see https://github.com/c-spark/cspark-ts-sdk/blob/main/docs
 */
export class Client {
  readonly config!: Config;

  constructor(options: ClientOptions = {}) {
    this.config = new Config(options);
  }

  get folder(): API.Folder {
    return new API.Folder(this.config);
  }

  get service(): API.Service {
    return new API.Service(this.config);
  }

  get batch(): API.Batch {
    return new API.Batch(this.config);
  }

  get file(): API.File {
    return new API.File(this.config);
  }

  get impex(): API.ImpEx {
    return API.ImpEx.only(this.config);
  }

  get wasm(): API.Wasm {
    return new API.Wasm(this.config);
  }

  /**
   * Download a file from the given URL.
   * @param url - valid URL
   */
  static download(url: string): ReturnType<typeof API.download>;
  /**
   * Download a file from the given URL.
   * @param url - valid URL
   * @param auth - optional authorization
   */
  static download(url: string, auth?: Authorization) {
    return API.download(url, auth);
  }

  /**
   * Prepare migration data from one tenant to another.
   * @param {ClientOptions} from - source tenant options.
   * @param {ClientOptions} to - target tenant options
   * @throws {SparkError} if invalid options are provided.
   */
  static migration(from: ClientOptions, to: ClientOptions): API.Migration;
  /**
   * Prepare migration data from one tenant to another.
   * @param {Config} from - source tenant configuration.
   * @param {Config} to - target tenant configuration
   */
  static migration(from: Config | ClientOptions, to: Config | ClientOptions) {
    return API.ImpEx.migration({
      exports: from instanceof Config ? from : new Config(from),
      imports: to instanceof Config ? to : new Config(to),
    });
  }

  /**
   * Prepare migration data from one tenant to another.
   * @param {ClientOptions} to - target tenant options
   * The current tenant configuration will be used as the source.
   * @throws {SparkError} if invalid options are provided.
   */
  migration(to: ClientOptions): API.Migration;
  /**
   * Prepare migration data from one tenant to another.
   * @param {Config} to - target tenant configuration
   * The current tenant configuration will be used as the source.
   */
  migration(to: Config): API.Migration;
  /**
   * Prepare migration data from one tenant to another.
   * @param {Config} to - target tenant configuration
   * @param {Config} from - optional source tenant configuration; if not provided,
   * the current tenant configuration will be used as the source.
   */
  migration(to: Config | ClientOptions, from: Config | ClientOptions = this.config) {
    return API.ImpEx.migration({
      exports: from instanceof Config ? from : new Config(from),
      imports: to instanceof Config ? to : new Config(to),
    });
  }
}

export default Client;
