type ErrorMessage<T = unknown> = {
  message: string;
  cause?: T | Error;
};

interface ApiErrorCause<TReq = any, TResp = any> {
  request: Readonly<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body: TReq;
  }>;
  response?: {
    headers: Record<string, string>;
    body: TResp;
    raw: string;
  };
}

/**
 * Base class for all SDK-related errors.
 */
export class SparkError extends Error {
  constructor(
    message: string,
    readonly cause?: any,
  ) {
    super(message);
    this.name = 'SparkError';
  }

  /**
   * Details of what causes the failure if any as a string.
   */
  get details(): string {
    if (this.cause instanceof Error) return this.cause.message;
    if (typeof this.cause === 'string') return this.cause;
    if (typeof this.cause === 'object') return JSON.stringify(this.cause);
    return '';
  }

  /**
   * Returns a string representation of the error.
   */
  override toString(): string {
    const error = `${this.name}: ${this.message}`;
    return this.details ? `${error} (${this.details})` : error;
  }

  /**
   * Returns a JSON representation of the error.
   */
  toJson(): Pick<SparkError, 'name' | 'message' | 'cause'> {
    return {
      name: this.name,
      message: this.message,
      cause: this.cause,
    } as const;
  }

  static sdk<T>(error: string | ErrorMessage<T>): SparkSdkError {
    return new SparkSdkError(typeof error === 'string' ? { message: error } : error);
  }

  static api<TReq, TResp>(status: number, error: string | ErrorMessage<ApiErrorCause<TReq, TResp>>): SparkApiError {
    return SparkApiError.when(status, typeof error === 'string' ? { message: error } : error);
  }
}

/**
 * Base class for SDK-specific errors.
 *
 * Usually thrown when an argument fails to comply with the expected format.
 * Because it's a client-side error, it will include in the majority of cases
 * the invalid entry as `cause`.
 *
 * If the argument causes another process to fail, the `cause` will be referencing
 * that thrown `Error`. The `timestamp` helps to define a hierarchy of errors since
 * the `cause` might be a `SparkError` as well.
 */
export class SparkSdkError extends SparkError {
  readonly timestamp!: string;

  constructor(error: ErrorMessage) {
    super(error.message, error.cause);
    this.timestamp = new Date().toISOString();
    this.name = 'SparkSdkError';
  }

  toJson(): Pick<SparkSdkError, 'name' | 'message' | 'cause' | 'timestamp'> {
    return {
      ...super.toJson(),
      timestamp: this.timestamp,
    } as const;
  }
}

/**
 * Base class for errors related to the API.
 *
 * When attempting to communicate with the API, the SDK will wrap any sort of failure
 * (any error during the round trip) into `SparkApiError`. The `status` will be the HTTP status code
 * of the response, and the `requestId` will be the unique identifier of the request.
 */
export class SparkApiError extends SparkError {
  constructor(
    error: ErrorMessage<ApiErrorCause>,
    readonly status: number | undefined = undefined,
  ) {
    super(`${status || ''} ${error.message}`.trim(), error.cause);
    this.status = status;
    this.name = 'SparkApiError';
  }

  get requestId(): string {
    return (this.cause as ApiErrorCause)?.request.headers['x-request-id'] || '';
  }

  override toJson(): Pick<SparkApiError, 'name' | 'message' | 'cause' | 'status'> {
    return {
      ...super.toJson(),
      status: this.status,
    } as const;
  }

  static when<TReq, TResp>(status: number, error: ErrorMessage<ApiErrorCause<TReq, TResp>>): SparkApiError {
    switch (status) {
      case 0:
        return new InternetError(error, status);
      case 400:
        return new BadRequestError(error, status);
      case 401:
        return new UnauthorizedError(error, status);
      case 403:
        return new ForbiddenError(error, status);
      case 404:
        return new NotFoundError(error, status);
      case 409:
        return new ConflictError(error, status);
      case 415:
        return new UnsupportedMediaTypeError(error, status);
      case 422:
        return new UnprocessableEntityError(error, status);
      case 429:
        return new RateLimitError(error, status);
      case 500:
        return new InternalServerError(error, status);
      case 503:
        return new ServiceUnavailableError(error, status);
      case 504:
        return new GatewayTimeoutError(error, status);
      default:
        return new UnknownApiError(error);
    }
  }
}

export class InternetError extends SparkApiError {
  override readonly status = 0;
  override readonly name = 'InternetError';
}

export class BadRequestError extends SparkApiError {
  override readonly status = 400;
  override readonly name = 'BadRequestError';
}

export class UnauthorizedError extends SparkApiError {
  override readonly status = 401;
  override readonly name = 'UnauthorizedError';
}

export class ForbiddenError extends SparkApiError {
  override readonly status = 403;
  override readonly name = 'ForbiddenError';
}

export class NotFoundError extends SparkApiError {
  override readonly status = 404;
  override readonly name = 'NotFoundError';
}

export class ConflictError extends SparkApiError {
  override readonly status = 409;
  override readonly name = 'ConflictError';
}

export class UnsupportedMediaTypeError extends SparkApiError {
  override readonly status = 415;
  override readonly name = 'UnsupportedMediaTypeError';
}

export class UnprocessableEntityError extends SparkApiError {
  override readonly status = 422;
  override readonly name = 'UnprocessableEntityError';
}

export class RateLimitError extends SparkApiError {
  override readonly status = 429;
  override readonly name = 'RateLimitError';
}

export class InternalServerError extends SparkApiError {
  override readonly status = 500;
  override readonly name = 'InternalServerError';
}

export class ServiceUnavailableError extends SparkApiError {
  override readonly status = 503;
  override readonly name = 'ServiceUnavailableError';
}

export class GatewayTimeoutError extends SparkApiError {
  override readonly status = 504;
  override readonly name = 'GatewayTimeoutError';
}

export class UnknownApiError extends SparkApiError {
  override readonly status = undefined;
  override readonly name = 'UnknownApiError';
}

export default SparkError;
