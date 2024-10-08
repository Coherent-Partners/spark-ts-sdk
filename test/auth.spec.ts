import { SparkSdkError, Authorization } from '../src';
import { OAuth } from '../src/auth';

describe('Authorization', () => {
  const TOKEN = 'some-access-token';
  const API_KEY = 'some-api-key';
  const OAUTH = { clientId: 'some-id', clientSecret: 'some-secret' };

  it('can create an open authorization', () => {
    expect(Authorization.from({ apiKey: 'open' }).isOpen).toBe(true);
    expect(Authorization.from({ token: 'open' }).isOpen).toBe(true);
  });

  it('can create an authorization with API key', () => {
    const auth = Authorization.from({ apiKey: API_KEY });
    expect(auth.apiKey).toBe('********-key');
    expect(auth.isEmpty).toBe(false);
    expect(auth.isOpen).toBe(false);
    expect(auth.type).toBe('apiKey');
    expect(auth.asHeader).toEqual({ 'x-synthetic-key': API_KEY });
    expect(auth.oauth).toBeUndefined();
    expect(auth.token).toBeUndefined();
  });

  it('can create an authorization with bearer token', () => {
    const auth = Authorization.from({ token: 'Bearer ' + TOKEN });
    expect(auth.token).toBe(TOKEN);
    expect(auth.isEmpty).toBe(false);
    expect(auth.isOpen).toBe(false);
    expect(auth.type).toBe('token');
    expect(auth.asHeader).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect(auth.apiKey).toBeUndefined();
    expect(auth.oauth).toBeUndefined();

    expect(Authorization.from({ token: TOKEN }).asHeader).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it('can create an authorization from JSON OAuth', () => {
    const auth = Authorization.from({ oauth: OAUTH });
    expect(auth.oauth).toBeInstanceOf(OAuth);
    expect(auth.oauth?.clientId).toBe(OAUTH.clientId);
    expect(auth.oauth?.clientSecret).toBe('*******cret');
    expect(auth.isEmpty).toBe(false);
    expect(auth.isOpen).toBe(false);
    expect(auth.type).toBe('oauth');
    expect(auth.apiKey).toBeUndefined();
    expect(auth.token).toBeUndefined();
  });

  it('can create an authorization from file OAuth', () => {
    const auth = Authorization.from({ oauth: './test/sample-ccg.txt' });
    expect(auth.oauth).toBeInstanceOf(OAuth);
    expect(auth.oauth?.clientId).toBe(OAUTH.clientId);
    expect(auth.oauth?.clientSecret).toBe('*******cret');
    expect(auth.isEmpty).toBe(false);
    expect(auth.isOpen).toBe(false);
    expect(auth.type).toBe('oauth');
    expect(auth.apiKey).toBeUndefined();
    expect(auth.token).toBeUndefined();
  });

  it('should throw an SDK error if no authentication method is provided', () => {
    expect(() => Authorization.from({})).toThrow(SparkSdkError);
  });
});
