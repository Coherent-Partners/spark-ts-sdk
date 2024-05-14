import { SparkError, SparkSdkError, SparkApiError } from '@cspark/sdk';
import { BadRequestError, UnauthorizedError } from '@cspark/sdk/error';

describe('SparkError', () => {
  it('should be of base error', () => {
    const error = new SparkError('sample error message');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toEqual('SparkError');
    expect(error.message).toContain('sample error message');
    expect(error.cause).toBeUndefined();
    expect(error.details).toBe('');
  });

  it('should be an SDK type of error', () => {
    const error = new SparkSdkError({ message: 'sample message', cause: new Error('other error') });

    expect(error).toBeInstanceOf(SparkError);
    expect(error.name).toEqual('SparkSdkError');
    expect(error.timestamp).toBeDefined();
    expect(error.cause).toBeDefined();
    expect(error.details).toContain('other error');
  });

  it('should be an API type of error', () => {
    const error = new BadRequestError({ message: 'invalid content' });

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

  it('should create API error from status code', () => {
    const error = SparkApiError.when(401, {
      message: 'authentication required',
      cause: { request: { url: 'url', method: 'GET', headers: { 'x-request-id': 'uuidv4' }, body: 'data' } },
    });
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.status).toBe(401);
    expect(error.requestId).toBe('uuidv4');
    expect(error.toString()).toContain('UnauthorizedError: 401 authentication required');
  });
});
