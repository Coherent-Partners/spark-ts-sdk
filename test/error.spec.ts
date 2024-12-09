import { SparkError, SparkSdkError, SparkApiError } from '../src';
import * as Errors from '../src/error';

describe('SparkError', () => {
  it('can be of base error', () => {
    const error = new SparkError('sample error message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toEqual('SparkError');
    expect(error.message).toContain('sample error message');
    expect(error.cause).toBeUndefined();
    expect(error.details).toBe('');
  });

  it('can be an SDK type of error', () => {
    const error = new SparkSdkError({ message: 'sample message', cause: new Error('other error') });
    expect(error).toBeInstanceOf(SparkError);
    expect(error.name).toEqual('SparkSdkError');
    expect(error.timestamp).toBeDefined();
    expect(error.cause).toBeDefined();
    expect(error.details).toContain('other error');
  });

  it('can be an API type of error', () => {
    const error = new Errors.BadRequestError({ message: 'invalid content' });
    expect(error).toBeInstanceOf(SparkApiError);
    expect(error.name).toEqual('BadRequestError');
    expect(error.status).toEqual(400);
    expect(error.toString()).toContain('invalid content');
    expect(error.toJson()).toEqual({
      name: 'BadRequestError',
      message: 'invalid content',
      status: 400,
      cause: undefined,
    });
  });

  it('can create API error from status code', () => {
    const error = SparkApiError.when(401, {
      message: 'authentication required',
      cause: { request: { url: 'url', method: 'GET', headers: { 'x-request-id': 'uuidv4' }, body: 'data' } },
    });
    expect(error).toBeInstanceOf(Errors.UnauthorizedError);
    expect(error.status).toBe(401);
    expect(error.requestId).toBe('uuidv4');
    expect(error.toString()).toContain('UnauthorizedError: 401 authentication required');
  });

  it('can infer API error type from status code', () => {
    expect(SparkError.api(0, '')).toBeInstanceOf(Errors.InternetError);
    expect(SparkError.api(400, '')).toBeInstanceOf(Errors.BadRequestError);
    expect(SparkError.api(401, '')).toBeInstanceOf(Errors.UnauthorizedError);
    expect(SparkError.api(403, '')).toBeInstanceOf(Errors.ForbiddenError);
    expect(SparkError.api(404, '')).toBeInstanceOf(Errors.NotFoundError);
    expect(SparkError.api(409, '')).toBeInstanceOf(Errors.ConflictError);
    expect(SparkError.api(415, '')).toBeInstanceOf(Errors.UnsupportedMediaTypeError);
    expect(SparkError.api(422, '')).toBeInstanceOf(Errors.UnprocessableEntityError);
    expect(SparkError.api(429, '')).toBeInstanceOf(Errors.RateLimitError);
    expect(SparkError.api(500, '')).toBeInstanceOf(Errors.InternalServerError);
    expect(SparkError.api(503, '')).toBeInstanceOf(Errors.ServiceUnavailableError);
    expect(SparkError.api(504, '')).toBeInstanceOf(Errors.GatewayTimeoutError);
    expect(SparkError.api(-1, '')).toBeInstanceOf(Errors.UnknownApiError);
  });
});
