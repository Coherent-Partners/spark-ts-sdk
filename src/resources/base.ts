import { AbortSignal } from 'node-fetch/externals';
import { type Readable } from 'stream';

import { Authorization } from '../auth';
import { Config } from '../config';
import { JsonData } from '../data';
import { SparkError } from '../error';
import { Logger } from '../logger';
import { about as sdkInfo, sdkUaHeader } from '../version';
import { _fetch, _download, HttpOptions, HttpResponse } from '../http';
import Utils, { StringUtils, Maybe } from '../utils';

/**
 * Base class for all API resources.
 *
 * This class provides a common interface for all API resources to interact with
 * the Spark APIs. It is designed to be extended by other classes that represent
 * specific API resources, such as folders, services, logs, imports, exports, etc.
 *
 * @param {Config} config - the configuration options for the API resource.
 * @param {AbortController} controller - an optional controller to abort requests.
 *
 * @see Config for more details.
 */
export abstract class ApiResource {
  protected readonly logger!: Logger;
  protected readonly controller: AbortController | undefined;

  constructor(protected readonly config: Config) {
    this.logger = Logger.of(config.logger);
    this.controller = Utils.getAbortController();

    if (!this.controller) {
      this.logger.warn(
        `"AbortController" is unavailable in this environment "${sdkInfo}". You will not be able to abort requests ` +
          'unless you use a different environment (e.g., Node 14.17+) or a polyfill to support this feature. ' +
          'A suggested implementation is "abort-controller" (https://www.npmjs.com/package/abort-controller)',
      );
    }
  }

  /**
   * The default headers for all requests.
   *
   * It does not include the `Authorization` header. It's added during the request
   * phase, which allows the possibility of changing the token dynamically, such
   * as when refreshing the token.
   *
   * Extra headers can be added to the configuration options. Given that some
   * other headers are added to perform analytics, it's recommended to avoid
   * overwriting or erasing the default headers if you choose to override this
   * getter field in a subclass.
   *
   * The `x-request-id` header is used to track requests across the Spark platform
   * and is useful for debugging and monitoring purposes. It's also part of the
   * `SparkApiError.requestId` field.
   * @see SparkError
   *
   * Older versions of the Spark APIs require the `x-tenant-name` header to be set.
   *
   * If you intend to override this getter field, use it carefully, for it may
   * affect the behavior of your new API resource. Otherwise, simply call
   * `super.defaultHeaders` to inherit the default headers.
   */
  protected get defaultHeaders(): Record<string, string> {
    return {
      ...this.config.extraHeaders,
      'User-Agent': sdkInfo,
      'x-spark-ua': sdkUaHeader,
      'x-request-id': Utils.getUuid(),
      'x-tenant-name': this.config.baseUrl.tenant,
    };
  }

  /**
   * Makes an HTTP request to the Spark API.
   *
   * @param url - The URL to make the request to.
   * @param options - The HTTP options for the request.
   *
   * This method is the core of the entire SDK and is responsible for making HTTP
   * requests to the Spark API. It uses the `node-fetch` module to perform the
   * actual request.
   *
   * Key features of this method include:
   * - By default, it makes a GET request, but the `method` option can be used to specify other HTTP methods.
   * - It dynamically injects the authorization header extracted from the `Config` object.
   * - It concatenates the URL with any query parameters specified in the `options` object.
   * - If enabled, it prints out the method and URL (without query parameters) for debugging purposes.
   * - It supports interceptors to modify the request and response.
   * - It automatically performs retries under certain conditions, such as unauthorized errors or exceeded rate limits.
   * - It wraps any error into a `SparkError` object for better error handling,
   *   except for AbortSignal errors, which are rethrown.
   *
   * It is recommended to use this method for all API requests in the SDK, as it
   * provides a consistent and reliable way to interact with the Spark API.
   */
  protected request<Result = JsonData, Body = JsonData>(
    url: string | Uri,
    { method = 'GET', headers = {}, ...opts }: Omit<HttpOptions<Body>, 'config'> = {},
  ): Promise<HttpResponse<Result>> {
    url = StringUtils.isString(url) ? url : url.value;

    this.logger.debug(`${method} ${url}`);

    return _fetch<Body, Result>(url, {
      ...opts,
      method,
      headers: { ...headers, ...this.defaultHeaders },
      config: this.config,
      cancellationToken: this.controller?.signal as Maybe<AbortSignal>,
    });
  }

  /**
   * Aborts the current request.
   *
   * This method is useful when the user wants to cancel a request that is taking
   * too long or is no longer needed. It is recommended to call this method before
   * making a new request to avoid any conflicts.
   *
   * @see Utils.getAbortController for more details.
   */
  abort(): void {
    this.controller?.abort();
  }
}

/**
 * This interface is used to help you provide the necessary info to cover unsupported Spark APIs.
 * It works in conjunction with the client (e.g., `SparkClient.extend(Extensible)`).
 *
 * @template Resource - the new API resource with additional capabilities.
 */
export interface Extensible<Resource extends ApiResource> {
  /**
   * The property name used to expose a resource with additional members.
   *
   * It is recommended to use camel case for the property name. Be sure to choose
   * a name that is descriptive, unique and does not conflict with any existing properties
   * in the client or other resources.
   */
  prop: string;

  /** The constructable resource with extra capabilities. */
  type: { new (...args: any[]): Resource };

  /** Additional arguments to pass to the resource constructor if needed. */
  args?: any[];
}

/**
 * Optional parameters for building a Spark URI.
 *
 * Spark may use distinct parameters to build a Spark URI to locate a specific
 * resource. Roughly speaking, Spark is structured such that a folder contains
 * services, and a service contains versions. However, a service may also have a
 * custom endpoint (a.k.a proxy endpoint), and a version may be public.
 *
 * @see Uri for more details.
 */
export interface UriParams {
  /** The folder name. */
  readonly folder?: string;
  /** The service name. */
  readonly service?: string;
  /** The service ID (UUID). */
  readonly serviceId?: string;
  /** The semantic version (a.k.a revision number - e.g., "4.2.1"). */
  readonly version?: string;
  /** The version ID (UUID). */
  readonly versionId?: string;
  /** The custom endpoint a.k.a proxy. */
  readonly proxy?: string;
  /** Whether the endpoint is public. */
  readonly public?: boolean;
}

/**
 * A Spark URI handler.
 *
 * This helper is used to build a Spark URI from partial resources or `UriParams`.
 * Because it's user-facing, it's designed to be as flexible as possible and will
 * throw `SparkError` if the input is invalid.
 *
 * As specified in the `UriParams` interface, there are two main formats a user can
 * use to pass in the parameters to build a Spark URI: `string` or `UriParams`.
 *
 * Should a user pass in a string, the `Uri` will attempt to parse it and extract
 * the UriParams from the following:
 * 1. `{folder}/{service}[?{version}]` or (even `folders/{folder}/services/{service}[?{version}]`)
 * 2. `service/{serviceId}`
 * 3. `version/{versionId}`
 * 4. `proxy/{endpoint}`
 *
 * Should a user pass in a `UriParams` object, the `Uri` will use the parameters
 * as-is to build the URI accordingly.
 *
 * Spark URI's formats may vary depending on the action to be performed
 * (e.g., upload, execute, download, etc.) due to API versioning and endpoint
 * requirements. Therefore, the `Uri` helper is designed to be flexible enough to
 * handle different formats.
 */
export class Uri {
  private constructor(private readonly url: URL) {}

  /** The final URL string without query parameters. */
  get value(): string {
    return this.url.toString();
  }

  /**
   * Builds a Spark URI from UriParams.
   *
   * @param {UriParams} uri - the distinct parameters to build a Spark URI from.
   * @param {UriOptions} options - the base URL, version, and endpoint options.
   * @returns {Uri} a Spark URI
   * @throws {SparkError} if a final URL cannot be built from the given
   * parameters.
   *
   * NOTE:
   * In this case, the order of priority: versionId > serviceId > folder & service > proxy.
   * However, if a `proxy` is provided, it will be used as the endpoint.
   */
  static from(uri: Maybe<UriParams> = {}, { base, version: path = 'api/v3', endpoint = '' }: UriOptions): Uri {
    const { folder, service, versionId, serviceId, proxy, public: isPublic } = uri;
    if (isPublic) path += `/public`;
    if (versionId) path += `/version/${versionId}`;
    else if (serviceId) path += `/service/${serviceId}`;
    else if (folder && service) path += `/folders/${folder}/services/${service}`;
    else if (proxy) path += `/proxy/${Utils.sanitizeUri(proxy)}`;

    if (endpoint && !proxy) path += `/${endpoint}`;
    try {
      return new this(new URL(`${base}/${path}`));
    } catch {
      throw SparkError.sdk({ message: 'invalid URI params', cause: uri });
    }
  }

  /**
   * Builds a Spark URI from a partial resource.
   *
   * @param {string} resource - the partial resource to build a Spark URI from.
   * @param {UriOptions} - the base URL, version, and endpoint options.
   * @returns {Uri} a Spark URI locator.
   * @throws {SparkError} if a final URL cannot be built from the given resource.
   */
  static partial(resource: string, { base, version = 'api/v3', endpoint = '' }: UriOptions): Uri {
    try {
      resource = Utils.sanitizeUri(resource);
      if (version) resource = `${version}/${resource}`;
      if (endpoint) resource += `/${endpoint}`;
      resource = `${base}/${resource}`;

      return new this(new URL(resource));
    } catch {
      throw SparkError.sdk({ message: `failed to build Spark endpoint`, cause: resource });
    }
  }

  /**
   * Transforms a Spark-friendly service locator into `UriParams`.
   *
   * @param {string | T} uri - Spark-friendly service locator
   * @returns {UriParams} the decoded parameters if any to build a Spark URI.
   *
   * This is a convenience method to handle string-based URIs and `UriParams` objects
   * interchangeably. This improves the user experience by allowing them to pass in
   * URIs in different formats without worrying about the underlying implementation.
   */
  static toParams<T extends UriParams>(uri: string | T): T {
    return (StringUtils.isString(uri) ? Uri.decode(uri as string) : uri) as T;
  }

  /**
   * Decodes a Spark-friendly service locator into `UriParams`.
   *
   * @param {string} uri - Spark-friendly service locator
   * @returns {UriParams} the decoded parameters if any to build a Spark URI.
   *
   * This can understand a uri only in the following formats:
   * 1. `folder/service[?version]` or `folders/folder/services/service[?version]`
   * 2. `service/serviceId`
   * 3. `version/versionId`
   * 4. `proxy/custom-endpoint`
   *
   * Otherwise, it is considered an invalid service URI locator.
   */
  static decode(uri: string): UriParams {
    uri = Utils.sanitizeUri(uri).replace('folders/', '').replace('services/', '');
    const match = uri.match(/^([^\/]+)\/([^[]+)(?:\[(.*?)\])?$/); // matching folder/service[version?]
    if (!match) return {};

    const [, folder, service, version] = match;
    if (folder === 'version') return { versionId: service }; // FIXME: confirm it's a UUID.
    if (folder === 'service') return { serviceId: service };
    if (folder === 'proxy') return { proxy: service };
    return { folder, service, version: version || undefined };
  }

  /**
   * Encodes `UriParams` into a Spark-friendly service locator.
   *
   * @param {UriParams} uri - the parameters to encode
   * @param {boolean} long whether to use long format or not (e.g., "folders/folder/services/service[version]")
   * This long format is from older versions of the Spark APIs. It's still supported
   * but not recommended for new implementations.
   * @returns {string} the encoded service locator or an empty string if no parameters
   * are provided. It is expected to be appended to the base URL to locate a specific
   * resource.
   */
  static encode(uri: UriParams, long: boolean = true): string {
    const { folder, service, version, serviceId, versionId, proxy } = uri;
    if (proxy) return `proxy/${proxy}`;
    if (versionId) return `version/${versionId}`;
    if (serviceId) return `service/${serviceId}`;
    if (folder && service)
      return (long ? `folders/${folder}/services` : folder) + `/${service}${version ? `[${version}]` : ''}`;
    return '';
  }

  /**
   * Validates and transforms a Spark-friendly service locator into `UriParams`.
   *
   * @param {string | T} uri - Spark-friendly uri locator
   * @returns {UriParams} the decoded parameters if any to build a Spark URI.
   * @throws {SparkError} if the uri is invalid or missing required parameters.
   */
  static validate<T extends UriParams>(uri: string | T, message?: string): T {
    const uriParams = Uri.toParams(uri);
    if (StringUtils.isEmpty(Uri.encode(uriParams, false))) {
      const { folder, service } = uriParams;
      if (folder && !service) message ??= 'service name is missing';
      if (service && !folder) message ??= 'folder name is missing';

      message ??= 'service uri locator is required';
      message += ' :: a uri needs to be of these formats: \n\t- "folder/service[?version]" \n\t-';
      message += ' "service/serviceId" \n\t- "version/versionId" \n\t- "proxy/custom-endpoint"\n';

      throw SparkError.sdk({ message, cause: uri });
    }
    return uriParams;
  }

  /**
   * Concatenates query parameters to the URL.
   *
   * @param params - the query parameters to concatenate
   * @returns the final URL with query parameters
   */
  concat(params: Record<string, string> = {}): string {
    const url = this.value;
    const searchParams = new URLSearchParams(params).toString();
    return `${url}${searchParams ? (url.includes('?') ? '&' : '?') + searchParams : ''}`;
  }

  toString(): string {
    return this.value;
  }
}

export type UriOptions = { base: string; version?: string; endpoint?: string };

/**
 * Downloads a resource from the given URL.
 *
 * @param url path to the resource
 * @param auth method of authentication if any.
 * @returns a Readable stream of the obtained blob.
 *
 * Spark may issue URLs to download resources that may or not require authentication.
 * This is made available to the user in case they need to download a resource after
 * performing an action (e.g., rehydrate, import, export, etc.).
 */
export async function download(url: string, auth?: Authorization): Promise<Readable> {
  return _download(url, { headers: { ...auth?.asHeader } }).then((response) => response.buffer);
}

export interface ApiResponse {
  status: string;
  response_data: Record<string, any>;
  response_meta: Record<string, any>;
  error: any;
}
