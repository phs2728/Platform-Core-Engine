/**
 * Google OAuth Provider (Epic 3)
 *
 * Google OAuth 2.0 token exchange + userinfo fetch.
 * - Token endpoint: https://oauth2.googleapis.com/token
 * - Userinfo:       https://www.googleapis.com/oauth2/v2/userinfo
 *
 * Constitution S-C9 (Plugin First): copy/modify this file to add a new provider.
 * UseCase/Manager code requires zero modification.
 */

import type {
  IOAuthProvider,
  OAuthTokenResponse,
  OAuthUserProfile,
} from '../interfaces/index.js';

export class GoogleOAuthProvider implements IOAuthProvider {
  readonly name = 'google';

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = (await response.json()) as Record<string, unknown>;
    const token: OAuthTokenResponse = {
      accessToken: String(data['access_token']),
      expiresIn: Number(data['expires_in']),
      tokenType: String(data['token_type']),
      ...(data['refresh_token'] !== undefined
        ? { refreshToken: String(data['refresh_token']) }
        : {}),
      ...(data['scope'] !== undefined ? { scope: String(data['scope']) } : {}),
    };
    return token;
  }

  async fetchUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const authHeader = 'Bearer ' + accessToken;
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: authHeader },
    });
    const data = (await response.json()) as Record<string, unknown>;
    const profile: OAuthUserProfile = {
      providerUserId: String(data['id']),
      email: String(data['email']),
      emailVerified: Boolean(data['verified_email'] ?? true),
      ...(data['name'] !== undefined ? { name: String(data['name']) } : {}),
      ...(data['picture'] !== undefined ? { pictureUrl: String(data['picture']) } : {}),
      ...(data['locale'] !== undefined ? { locale: String(data['locale']) } : {}),
    };
    return profile;
  }
}
