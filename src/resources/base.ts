import { Authorization } from '../auth';
import { Config } from '../config';
import { JsonData } from '../data';
import { SparkError } from '../error';
import { Logger } from '../logger';
import { userAgentHeader, sdkUaHeader } from '../version';
import { _fetch, _download, HttpOptions, HttpResponse } from '../http';
import Utils, { StringUtils, Maybe, sanitizeUri } from '../utils';

/**
 * Base class for all API resources.
 *
 * This class provides a common interface for all API resources to interact with
 * the Spark APIs. It is designed to be extended by other classes that represent
 * specific API resources, such as folders, services, logs, imports, exports, etc.
 *
 * @param {Config} config - the configuration options for the API resource.
 *
 * @see Config for more details.
 */
export abstract class ApiResource {
  protected readonly logger!: Logger;

  constructor(protected readonly config: Config) {
    this.logger = Logger.of(config.logger);
  }

  protected get defaultHeaders(): Record<string, string> {
    return {
      ...this.config.extraHeaders,
      'User-Agent': userAgentHeader,
      'x-spark-ua': sdkUaHeader,
      'x-request-id': Utils.getUuid(),
      'x-tenant-name': this.config.baseUrl.tenant,
    };
  }

  protected request<T = JsonData>(
    url: string,
    { method = 'GET', headers = {}, ...opts }: Omit<HttpOptions, 'config'> = {},
  ): Promise<HttpResponse<T>> {
    this.logger.debug(`${method} ${url}`);
    return _fetch<T>(url, {
      ...opts,
      method,
      headers: { ...headers, ...this.defaultHeaders },
      config: this.config,
    });
  }
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
 *
 * @param folder - the folder name
 * @param service - the service name
 * @param serviceId - the service ID (UUID)
 * @param version - the semantic version (a.k.a revision number - e.g., "4.2.1")
 * @param versionId - the version ID
 * @param proxy - the custom endpoint a.k.a proxy
 * @param public - whether the endpoint is public
 */
export interface UriParams {
  readonly folder?: string;
  readonly service?: string;
  readonly serviceId?: string;
  readonly version?: string;
  readonly versionId?: string;
  readonly proxy?: string;
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
 * 1. `folder/service[version]` or `folders/folder/services/service[version]`
 * 2. `service/serviceId`
 * 3. `version/versionId`
 *
 * Should a user pass in a `UriParams` object, the `Uri` will use the parameters
 * as-is to build the URI accordingly.
 *
 * IMPORTANT:
 * Spark URIs' formats may vary depending on the action to be performed
 * (e.g., upload, execute, download, etc.) due to API versioning and endpoint
 * requirements. Therefore, the `Uri` helper is designed to be flexible enough to
 * handle different formats.
 */
export class Uri {
  private constructor(private readonly url: URL) {}

  /**
   * The final URL string without query parameters.
   */
  get value(): string {
    return this.url.toString();
  }

  /**
   * Builds a Spark URI from UriParams.
   *
   * @param {UriParams} uri - the distinct parameters to build a Spark URI from.
   * @param {UriOptions} - the base URL, version, and endpoint options.
   * @returns {Uri} - a Spark URI
   * @throws {SparkError} - if a final URL cannot be built from the given
   * parameters.
   *
   * NOTE:
   * In this case, the order of priority: folder and service > serviceId > versionId > proxy.
   * However, if a `proxy` is provided, it will be used as the endpoint.
   */
  static from(uri: Maybe<UriParams> = {}, { base, version: path = 'api/v3', endpoint = '' }: UriOptions): Uri {
    const { folder, service, versionId, proxy, public: isPublic } = uri;
    if (isPublic) path += `/public`;
    if (folder && service) path += `/folders/${folder}/services/${service}`;
    else if (versionId) path += `/version/${versionId}`;
    else if (proxy) path += `/proxy/${sanitizeUri(proxy)}`;

    if (endpoint && !proxy) path += `/${endpoint}`;
    try {
      return new this(new URL(`${base}/${path}`));
    } catch {
      throw SparkError.sdk({ message: 'invalid URI params', cause: uri });
    }
  }

  /**
   * Builds a Spark URI from a partial resource.
   * @param resource - the partial resource to build a Spark URI from.
   * @param {UriOptions} - the base URL, version, and endpoint options.
   * @returns {Uri} - a Spark URI
   * @throws {SparkError} - if a final URL cannot be built from the given
   */
  static partial(resource: string, { base, version = 'api/v3', endpoint = '' }: UriOptions): Uri {
    try {
      resource = Utils.sanitizeUri(resource);
      if (version) resource = `${version}/${resource}`;
      if (endpoint) resource += `/${endpoint}`;
      resource = `${base}/${resource}`;

      return new this(new URL(resource));
    } catch (cause) {
      if (cause instanceof SparkError) throw SparkError.sdk({ message: `invalid service URI <${resource}>`, cause });
      throw SparkError.sdk({ message: `failed to build Spark endpoint from <${resource}>`, cause });
    }
  }

  static toParams<T extends UriParams>(uri: string | T): T {
    return (StringUtils.isString(uri) ? Uri.decode(uri as string) : uri) as T;
  }

  /**
   * Decodes a Spark-friendly service locator into `UriParams`.
   *
   * @param {string} uri - Spark-friendly service locator
   * @returns {UriParams} - the decoded parameters if any to build a Spark URI.
   *
   * This can understand a uri only in the following formats:
   * 1. `folder/service[version?]` or `folders/folder/services/service[version?]`
   * 2. `service/serviceId`
   * 3. `version/versionId`
   *
   * Otherwise, it is considered an invalid service locator.
   */
  static decode(uri: string): UriParams {
    uri = Utils.sanitizeUri(uri).replace('folders/', '').replace('services/', '');
    const match = uri.match(/^([^\/]+)\/([^[]+)(?:\[(.*?)\])?$/); // matching folder/service[version?]
    if (!match) return {};

    const [, folder, service, version] = match;
    if (folder === 'version') return { versionId: service }; // FIXME: confirm it's a UUID.
    if (folder === 'service') return { serviceId: service };
    return { folder, service, version: version || undefined };
  }

  /**
   * Encodes `UriParams` into a Spark-friendly service locator.
   * @param {UriParams} uri - the parameters to encode
   * @param long whether to use long format or not (e.g., "folders/folder/services/service[version]")
   */
  static encode(uri: UriParams, long = true): string {
    const { folder, service, version, serviceId, versionId } = uri;
    if (versionId) return `version/${versionId}`;
    if (serviceId) return `service/${serviceId}`;
    if (folder && service)
      return (long ? `folders/${folder}/services` : folder) + `/${service}${version ? `[${version}]` : ''}`;
    return '';
  }

  /**
   * Concatenates query parameters to the URL.
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

type UriOptions = { base: string; version?: string; endpoint?: string };

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
export async function download(url: string, auth?: Authorization) {
  return _download(url, { headers: { ...auth?.asHeader } }).then((response) => response.buffer);
}

export interface ApiResponse {
  status: string;
  response_data: Record<string, any>;
  response_meta: Record<string, any>;
  error: any;
}
