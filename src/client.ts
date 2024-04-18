import { type Maybe } from './utils';
import { Config } from './config';
import { LogLevel, type LoggerOptions } from './logger';
import { Authorization, type OAuthMethod } from './auth';
import * as API from './resources';

/**
 * The available settings to initialize a new client.
 *
 * The client options are used to configure the behavior of the client, including
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
  baseUrl?: Maybe<string>;

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
   * By default, client-side use of this library is not recommended, as it risks exposing
   * your secret API credentials to attackers.
   * Only set this option to `true` if you understand the risks and have appropriate
   * mitigations in place.
   */
  allowBrowser?: boolean;

  /**
   * Enables or disables the logger for the client.
   * if `true`, determines whether client should print colorful logs (including timestamps).
   * if `string`, client will print logs with the specified log level.
   * if `LoggerOptions`, client will print logs with the specified options.
   *
   * @see LoggerOptions for more details.
   */
  logger?: boolean | LogLevel | LoggerOptions;
}

export class Client {
  readonly config!: Config;

  constructor(options: ClientOptions = {}) {
    this.config = new Config(options);
  }

  get service(): API.Service {
    return new API.Service(this.config);
  }

  get folder(): API.Folder {
    return new API.Folder(this.config);
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
   * @param auth - optional authorization
   */
  static download(url: string, auth?: Authorization) {
    return API.download(url, auth);
  }

  /**
   * Prepare migration data from one tenant to another.
   * @param {Config} to - target tenant configuration
   * @param {Config} from - optional source tenant configuration; if not provided,
   * the current tenant configuration will be used as the source.
   */
  migration(to: Config, from: Config = this.config) {
    return API.ImpEx.migration({ exports: from, imports: to });
  }
}

export default Client;
