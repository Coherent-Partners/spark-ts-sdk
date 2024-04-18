import { AccessToken } from '../auth';
import { ApiResource, Uri } from './base';

export class OAuth2 extends ApiResource {
  async requestAccessToken(): Promise<AccessToken> {
    const baseUrl = this.config.baseUrl.oauth2;
    const url = Uri.from(undefined, { base: baseUrl, version: 'protocol', endpoint: 'openid-connect/token' });
    const { clientId: client_id, clientSecret: client_secret } = this.config.auth.oauth?.toJson() ?? {};
    const body = { grant_type: 'client_credentials', client_id, client_secret };

    return this.request<AccessTokenModel>(url.value, {
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      body,
    }).then((response) => {
      const { data } = response;
      return {
        accessToken: data?.access_token,
        expiresIn: data?.expires_in,
        refreshExpiresIn: data?.refresh_expires_in,
        tokenType: data?.token_type,
        notBeforePolicy: data?.not_before_policy,
        scope: data?.scope,
      };
    });
  }
}

interface AccessTokenModel {
  readonly access_token: string;
  readonly expires_in: number;
  readonly refresh_expires_in: number;
  readonly token_type: string;
  readonly not_before_policy: number;
  readonly scope: string;
}
