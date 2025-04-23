import { AccessToken } from '../auth';
import { HttpResponse } from '../http';
import { ApiResource, Uri } from './base';

export class OAuth2 extends ApiResource {
  genAccessToken(): Promise<HttpResponse<AccessTokenModel>> {
    const baseUrl = this.config.baseUrl.oauth2;
    const url = Uri.from(undefined, { base: baseUrl, version: 'protocol', endpoint: 'openid-connect/token' });
    const { clientId: client_id, clientSecret: client_secret } = this.config.auth.oauth?.toJson() ?? {};
    const body = { grant_type: this.config.auth.oauth?.flow, client_id, client_secret };

    return this.request(url, { method: 'POST', contentType: 'application/x-www-form-urlencoded', body });
  }

  async getAccessToken(): Promise<AccessToken> {
    const response = await this.genAccessToken();
    const { data } = response;

    return {
      accessToken: data?.access_token,
      expiresIn: data?.expires_in,
      refreshExpiresIn: data?.refresh_expires_in,
      tokenType: data?.token_type,
      notBeforePolicy: data?.not_before_policy,
      scope: data?.scope,
    };
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
