import { type Readable as ByteStream } from 'stream';
import nodeFetch, { RequestInit } from 'node-fetch';
import { AbortSignal } from 'node-fetch/externals';

import { type Config } from './config';
import { Streamer } from './streaming';
import { JsonData, Serializable } from './data';
import { SparkError, SparkApiError, SparkSdkError } from './error';
import { RETRY_RANDOMIZATION_FACTOR } from './constants';
import Utils, { Nullable, loadModule } from './utils';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions<T = JsonData> {
  /** Key-value pairs of headers to be sent with the request. */
  readonly headers?: Record<string, string>;

  /** Key-value pairs of query params to be sent with the request. */
  readonly params?: Record<string, string>;

  /** Request body data. */
  readonly body?: T;

  /** Stream of a file. */
  readonly file?: ByteStream;

  /** Parts of multipart data. */
  readonly multiparts?: Multipart[];

  /** Token used for request cancellation. */
  readonly cancellationToken?: Nullable<AbortSignal>;

  /** Number of retries to attempt. */
  readonly retries?: number;
}

export interface HttpOptions<T> extends RequestOptions<T> {
  /** Client configuration. */
  readonly config: Config;

  /** A string to set request's method (defaults to GET) */
  readonly method?: HttpMethod;

  /** Request body content type. */
  readonly contentType?: string;
}

export interface HttpResponse<T = JsonData | Serializable> {
  /** The status code of the response. */
  readonly status: number;

  /** Response body data. */
  readonly data: T;

  /** Binary array buffer of response body. */
  readonly buffer: ByteStream;

  /** Response headers. */
  readonly headers: Record<string, string>;
}

export interface Multipart {
  readonly name: string;
  readonly data?: JsonData | Serializable;
  readonly fileStream?: ByteStream;
  readonly fileName?: string;
  readonly contentType?: string;
}

export interface Interceptor {
  beforeRequest?<T>(options: HttpOptions<T>): HttpOptions<T>;
  afterRequest?<T>(response: HttpResponse<T>): HttpResponse<T>;
}

/**
 * Calculate the exponential backoff time with randomized jitter.
 * @param {int} retries - which retry number this one will be
 * @param {int} [baseInterval] - the base retry interval set in config
 * @returns the number of milliseconds after which to retry
 */
export function getRetryTimeout(retries: number, baseInterval: number = 1): number {
  const randomization = Math.random() * RETRY_RANDOMIZATION_FACTOR;
  return Math.ceil(retries * baseInterval * 1000 * randomization);
}

async function buildRequest<T>(options: HttpOptions<T>): Promise<RequestInit> {
  const {
    method = 'GET',
    headers = {},
    contentType: initialContentType = 'application/json',
    body: data,
    file: fileStream,
  } = options;

  const { contentType, body } = await (async (): Promise<{
    contentType: string | undefined;
    body: ByteStream | string;
  }> => {
    if (options.multiparts) {
      const isBrowser = Utils.isBrowser();
      // eslint-disable-next-line
      const FormData = isBrowser ? window.FormData : loadModule('form-data');
      const formData = new FormData();

      for (const item of options.multiparts) {
        if (item.fileStream) {
          if (isBrowser) {
            formData.append(item.name, item.fileStream, { filename: item.fileName ?? 'file' });
          } else {
            const buffer = await Streamer.readStream(item.fileStream);
            formData.append(item.name, buffer, {
              filename: item.fileName ?? 'file',
              contentType: item.contentType ?? 'application/octet-stream',
            });
          }
        } else if (item.data) {
          formData.append(
            item.name,
            item.data instanceof Serializable ? item.data.serialize() : Serializable.serialize(item.data),
          );
        } else {
          throw new SparkSdkError({
            message: 'Multipart item must have either serializable body or file stream',
            cause: item,
          });
        }
      }

      return {
        contentType: isBrowser ? undefined : `multipart/form-data; boundary=${formData.getBoundary()}`,
        body: formData,
      };
    }

    const contentType = initialContentType;
    switch (contentType) {
      case 'application/json':
      case 'application/json-patch+json':
        return {
          contentType,
          body: data instanceof Serializable ? data.serialize() : Serializable.serialize(data ?? null),
        };

      case 'application/x-www-form-urlencoded':
        return {
          contentType,
          body: data instanceof Serializable ? data.serialize() : Serializable.toUrlParams(data ?? null),
        };

      case 'application/octet-stream':
        if (!fileStream) {
          throw SparkError.sdk('file stream required for application/octet-stream content type');
        }
        return { contentType, body: fileStream };

      default:
        throw SparkError.sdk(`unsupported content type: ${contentType}`);
    }
  })();

  if (contentType) headers['Content-Type'] = contentType;

  return {
    method,
    body: method === 'GET' ? undefined : body,
    headers: { ...headers, ...options.config.auth?.asHeader },
    signal: options.cancellationToken,
  };
}

function isInternetError(errorCode: string): boolean {
  return (
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'EHOSTUNREACH' ||
    errorCode === 'ENETUNREACH'
  );
}

export async function _fetch<Req = JsonData, Resp = JsonData>(
  resource: string,
  options: HttpOptions<Req>,
): Promise<HttpResponse<Resp>> {
  // Apply beforeRequest interceptors if any.
  const fetchOptions: typeof options = options.config.hasInterceptors
    ? Array.from(options.config.interceptors).reduce(
        (o: HttpOptions<Req>, i: Interceptor) => i.beforeRequest?.(o) ?? o,
        options,
      )
    : options;
  const { config } = fetchOptions;

  // Prepare and make request using fetch API
  const request = await buildRequest(fetchOptions);
  const url = Utils.formatUrl(resource, fetchOptions.params);
  const response = await (async () => {
    try {
      return await nodeFetch(url, { ...request, redirect: 'manual', timeout: config.timeout });
    } catch (cause) {
      if ((cause as any)?.name === 'AbortError') throw cause;
      // is it relevant to retry request when client's internet is down? 🤔
      if (isInternetError((cause as any)?.code)) throw SparkError.api(0, `cannot connect to <${url}>`);
      throw SparkError.api(-1, { message: `failed to fetch <${url}>`, cause: cause as Error });
    }
  })();

  // Extract response data and headers
  const contentType = response.headers.get('content-type') ?? '';
  const responseBytes = await response.arrayBuffer();

  let httpResponse: HttpResponse<Resp> = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    buffer: Streamer.fromBuffer(responseBytes),
    data: ((): Resp => {
      if (contentType.includes('application/json')) {
        const text = new TextDecoder().decode(responseBytes);
        return Serializable.deserialize(text);
      }
      return null as Resp;
    })(),
  };

  // Apply afterRequest interceptors if any.
  if (config?.hasInterceptors) {
    httpResponse = Array.from(config.interceptors).reduce(
      (rsp: HttpResponse<Resp>, i: Interceptor) => i.afterRequest?.(rsp) ?? rsp,
      httpResponse,
    ) as HttpResponse<Resp>;
  }

  // Should retry the request?
  if (httpResponse.status >= 400) {
    const { retries = 0 } = fetchOptions;

    // when unauthorized
    if (httpResponse.status == 401 && config.auth?.type === 'oauth' && retries < config.maxRetries) {
      await config.auth.oauth?.refreshToken(config);
      return _fetch(resource, { ...fetchOptions, retries: retries + 1 });
    }

    // when rate limit exceeded
    if (httpResponse.status === 429 && retries < config.maxRetries) {
      const retryDelay = httpResponse.headers['x-retry-after']
        ? parseFloat(httpResponse.headers['x-retry-after']!) * 1000
        : getRetryTimeout(retries, config.retryInterval);

      await Utils.sleep(retryDelay);
      return _fetch(resource, { ...fetchOptions, retries: retries + 1 });
    }

    throw SparkApiError.when(httpResponse.status, {
      message: `failed to fetch <${url}>`,
      cause: {
        request: {
          url,
          method: request.method!,
          headers: request.headers as Record<string, string>,
          body: request.body,
        },
        response: {
          headers: httpResponse.headers,
          body: httpResponse.data,
          raw: new TextDecoder().decode(responseBytes),
        },
      },
    });
  }

  // otherwise, ok response.
  return httpResponse;
}

export async function _download(
  resource: string,
  options: RequestOptions & { method?: HttpMethod },
): Promise<HttpResponse> {
  const { method = 'GET', headers: _headers = {}, params, cancellationToken } = options;
  const url = Utils.formatUrl(resource, params);
  const headers = { 'Content-Type': 'application/json', ..._headers };

  return nodeFetch(url, { method, headers, redirect: 'manual', signal: cancellationToken })
    .then(async (response) => {
      if (!response.ok || response.status >= 400) throw response;
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        buffer: Streamer.fromBuffer(await response.arrayBuffer()),
        data: null,
      };
    })
    .catch(async (response) => {
      if (response?.name === 'AbortError') throw response;
      if (isInternetError((response as any)?.code)) throw SparkError.api(0, `cannot connect to <${url}>`);
      if (response instanceof Error) {
        throw new SparkSdkError({ message: `failed to fetch <${url}>`, cause: response });
      }

      const raw = new TextDecoder().decode(await response?.arrayBuffer());
      throw SparkApiError.when(response.status, {
        message: `failed to download resource from <${url}>`,
        cause: {
          request: { url, method, headers, body: null },
          response: { headers: response.headers, body: response.data, raw },
        },
      });
    });
}
