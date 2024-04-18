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
    this.name = this.constructor.name;
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
    };
  }

  static sdk<T>(error: ErrorMessage<T>): SparkSdkError {
    return new SparkSdkError(error);
  }

  static api<TReq, TResp>(status: number, error: ErrorMessage<ApiErrorCause<TReq, TResp>>): SparkApiError {
    return SparkApiError.when(status, error);
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
  }

  toJson(): Pick<SparkSdkError, 'name' | 'message' | 'cause' | 'timestamp'> {
    return {
      ...super.toJson(),
      timestamp: this.timestamp,
    };
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
    super(`${status || ''} ${error.message}`.trim(), error.cause as ApiErrorCause);
    this.status = status;
  }

  get requestId(): string {
    return (this.cause as ApiErrorCause)?.request.headers['x-request-id'] || '';
  }

  override toJson(): Pick<SparkApiError, 'name' | 'message' | 'cause' | 'status'> {
    return {
      ...super.toJson(),
      status: this.status,
    };
  }

  static when<TReq, TResp>(status: number, error: ErrorMessage<ApiErrorCause<TReq, TResp>>): SparkApiError {
    switch (status) {
      case 0:
        return new InternetError(error, 0);
      case 400:
        return new BadRequestError(error, 400);
      case 401:
        return new UnauthorizedError(error, 401);
      case 403:
        return new ForbiddenError(error, 403);
      case 404:
        return new NotFoundError(error, 404);
      case 409:
        return new ConflictError(error, 409);
      case 415:
        return new UnsupportedMediaTypeError(error, 415);
      case 422:
        return new UnprocessableEntityError(error, 422);
      case 429:
        return new RateLimitError(error, 429);
      case 500:
        return new InternalServerError(error, 500);
      case 503:
        return new ServiceUnavailableError(error, 503);
      case 504:
        return new GatewayTimeoutError(error, 504);
      default:
        return new ApiUnknownError(error);
    }
  }
}

export class InternetError extends SparkApiError {
  override readonly status = 0;

  get details(): string {
    return super.details || 'no internet access';
  }
}

export class BadRequestError extends SparkApiError {
  override readonly status = 400;

  get details(): string {
    return super.details || 'bad request';
  }
}

export class UnauthorizedError extends SparkApiError {
  override readonly status = 401;

  get details(): string {
    return super.details || 'access unauthorized';
  }
}

export class ForbiddenError extends SparkApiError {
  override readonly status = 403;

  get details(): string {
    return super.details || 'permission denied';
  }
}

export class NotFoundError extends SparkApiError {
  override readonly status = 404;

  get details(): string {
    return super.details || 'content not found';
  }
}

export class ConflictError extends SparkApiError {
  override readonly status = 409;

  get details(): string {
    return super.details || 'resource conflict';
  }
}

export class UnsupportedMediaTypeError extends SparkApiError {
  override readonly status = 415;

  get details(): string {
    return super.details || 'unsupported media type';
  }
}

export class UnprocessableEntityError extends SparkApiError {
  override readonly status = 422;

  get details(): string {
    return super.details || 'unprocessable entity';
  }
}

export class RateLimitError extends SparkApiError {
  override readonly status = 429;

  get details(): string {
    return super.details || 'rate limit exceeded';
  }
}

export class InternalServerError extends SparkApiError {
  override readonly status = 500;

  get details(): string {
    return super.details || 'internal server error';
  }
}

export class ServiceUnavailableError extends SparkApiError {
  override readonly status = 503;

  get details(): string {
    return super.details || 'service unavailable';
  }
}

export class GatewayTimeoutError extends SparkApiError {
  override readonly status = 504;

  get details(): string {
    return super.details || 'gateway timeout';
  }
}

export class ApiUnknownError extends SparkApiError {
  override readonly status = undefined;

  get details(): string {
    return super.details || 'unknown error';
  }
}

export default SparkError;
