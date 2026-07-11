import {
  Ok,
  Err,
  type Result,
  AuthenticationError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IAccountRepository,
  IPasswordHasher,
  ISessionSigner,
  ISessionRepository,
  IAuditLogRepository,
  AccountRecord,
  SessionRecord,
} from '../interfaces/index.js';

/**
 * OAuth Provider 인터페이스 (Plugin Pattern)
 * 헌법 §C-9 (Plugin First): 신규 Provider 추가 시 기존 코드 무수정.
 */
export interface IOAuthProvider {
  readonly name: string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse>;
  fetchUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
  tokenType: string;
}

export interface OAuthUserProfile {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  pictureUrl?: string;
  locale?: string;
}

/**
 * OAuth Login UseCase (Sprint 2C-2-6)
 */
export interface OAuthLoginInput {
  providerName: string;
  authCode: string;
  redirectUri: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface OAuthLoginOutput {
  accountId: string;
  sessionToken: string;
  expiresAt: string;
  isNewAccount: boolean;
}

export interface OAuthLoginDeps {
  providers: Record<string, IOAuthProvider>;
  accountRepository: IAccountRepository;
  passwordHasher: IPasswordHasher;
  sessionSigner: ISessionSigner;
  sessionRepository: ISessionRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: { sessionDurationHours: number };
}

export async function oauthLoginUseCase(
  input: OAuthLoginInput,
  deps: OAuthLoginDeps,
): Promise<Result<OAuthLoginOutput, AuthenticationError>> {
  const provider = deps.providers[input.providerName];
  if (!provider) {
    return Err(
      new AuthenticationError(`Unknown OAuth provider: ${input.providerName}`, {
        details: { reason: 'unknown_provider' },
      }),
    );
  }

  let tokenResponse: OAuthTokenResponse;
  let profile: OAuthUserProfile;
  try {
    tokenResponse = await provider.exchangeCode(input.authCode, input.redirectUri);
    profile = await provider.fetchUserProfile(tokenResponse.accessToken);
  } catch (e) {
    await recordAudit(deps.auditLogRepository, {
      accountId: null,
      tenantId: input.tenantId,
      eventType: 'oauth_login',
      metadata: { provider: input.providerName, phase: 'token_exchange_failed', error: String(e) },
    });
    return Err(
      new AuthenticationError('OAuth exchange failed', {
        details: { reason: 'oauth_failed' },
      }),
    );
  }

  const email = profile.email.toLowerCase().trim();
  let isNewAccount = false;

  let accountLookup = await deps.accountRepository.findByEmail(input.tenantId, email);
  let account: AccountRecord;

  if (!accountLookup.ok) {
    // Create new account
    isNewAccount = true;
    const newAccountId = deps.idGenerator.generate();
    const now = deps.clock.now().toISOString();
    const randomPasswordHash = await deps.passwordHasher.hash(deps.idGenerator.generate());

    await deps.accountRepository.insert({
      id: newAccountId,
      tenantId: input.tenantId,
      email,
      passwordHash: randomPasswordHash,
      createdAt: now,
      updatedAt: now,
    });

    account = {
      id: newAccountId,
      tenantId: input.tenantId,
      email,
      passwordHash: randomPasswordHash,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    account = accountLookup.value;
  }

  // Session 발급
  const sessionId = deps.idGenerator.generate();
  const issuedAt = deps.clock.now();
  const expiresAt = new Date(issuedAt.getTime() + deps.policy.sessionDurationHours * 3600 * 1000);

  const sessionToken = await deps.sessionSigner.sign({
    accountId: account.id,
    sessionId,
    tenantId: input.tenantId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  const sessionRecord: SessionRecord = {
    id: sessionId,
    accountId: account.id,
    tenantId: input.tenantId,
    token: sessionToken,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  await deps.sessionRepository.insert(sessionRecord);

  // Event
  const envelope: EventEnvelope<{ accountId: string; provider: string; loggedInAt: string }> =
    createEnvelope({
      eventId: deps.idGenerator.generate(),
      aggregateId: account.id,
      occurredAt: issuedAt.toISOString(),
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'identity',
      eventType: 'oauth.login',
      schemaRef: `oauth.login.${input.providerName}.v1`,
      payload: {
        accountId: account.id,
        provider: input.providerName,
        loggedInAt: issuedAt.toISOString(),
      },
    });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'oauth_login',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { provider: input.providerName, providerUserId: profile.providerUserId, isNewAccount, sessionId },
  });

  return Ok({
    accountId: account.id,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
    isNewAccount,
  });
}

/**
 * Example Google OAuth Provider
 */
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
    const data = (await response.json()) as Record<string, any>;
    const token: OAuthTokenResponse = {
      accessToken: String(data['access_token']),
      expiresIn: Number(data['expires_in']),
      tokenType: String(data['token_type']),
      ...(data['refresh_token'] !== undefined ? { refreshToken: String(data['refresh_token']) } : {}),
      ...(data['scope'] !== undefined ? { scope: String(data['scope']) } : {}),
    };
    return token;
  }

  async fetchUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    const data = (await response.json()) as Record<string, any>;
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
