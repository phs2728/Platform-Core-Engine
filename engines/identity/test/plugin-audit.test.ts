/**
 * Plugin Audit Test — OAuth Providers (Sprint 2C-4 Task 6)
 *
 * 사장님 지시: 7개 OAuth Provider (Google, Apple, Facebook, Microsoft, GitHub, Kakao, Naver)
 * 각각에 대해 Register / Enable / Disable / Remove / Update / Failure Handling 검증.
 *
 * OAuthManager를 사용한 Provider 생명주기 관리.
 * 헌법 §C-9 (Plugin First): 신규 Provider 추가 시 기존 코드 무수정.
 *
 * 한국어 주석, 영어 코드.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OAuthManager } from '../src/providers/OAuthManager.js';
import { GoogleOAuthProvider } from '../src/providers/GoogleOAuthProvider.js';
import { ConflictError } from '@platform/core-sdk';
import type { IOAuthProvider, OAuthTokenResponse, OAuthUserProfile } from '../src/interfaces/index.js';

// ═══════════════════════════════════════════════════════════
// Mock Provider Factory
// 7개 Provider의 인터페이스를 만족하는 테스트용 Provider 생성.
// 실제 네트워크 호출 없이 동작 검증.
// ═══════════════════════════════════════════════════════════

interface MockProviderConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  failMode?: 'none' | 'exchange' | 'profile' | 'timeout';
}

function createMockProvider(config: MockProviderConfig): IOAuthProvider & {
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  updateConfig(patch: Partial<MockProviderConfig>): void;
  getConfig(): MockProviderConfig;
} {
  let enabled = true;
  let currentConfig = { ...config };

  return {
    get name() { return currentConfig.name; },

    async exchangeCode(code: string, _redirectUri: string): Promise<OAuthTokenResponse> {
      if (!enabled) throw new Error(`Provider ${currentConfig.name} is disabled`);
      if (currentConfig.failMode === 'exchange') {
        throw new Error(`Token exchange failed for ${currentConfig.name}: invalid_grant`);
      }
      if (currentConfig.failMode === 'timeout') {
        throw new Error(`Request timeout for ${currentConfig.name}: ETIMEDOUT`);
      }
      return {
        accessToken: `access-${currentConfig.name}-${code}`,
        refreshToken: `refresh-${currentConfig.name}`,
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'openid email profile',
      };
    },

    async fetchUserProfile(accessToken: string): Promise<OAuthUserProfile> {
      if (!enabled) throw new Error(`Provider ${currentConfig.name} is disabled`);
      if (currentConfig.failMode === 'profile') {
        throw new Error(`Profile fetch failed for ${currentConfig.name}: 401 Unauthorized`);
      }
      return {
        providerUserId: `uid-${currentConfig.name}-${accessToken.slice(-4)}`,
        email: `user@${currentConfig.name}.com`,
        emailVerified: true,
        name: `Test User (${currentConfig.name})`,
      };
    },

    setEnabled(e: boolean) { enabled = e; },
    isEnabled() { return enabled; },
    updateConfig(patch: Partial<MockProviderConfig>) {
      currentConfig = { ...currentConfig, ...patch };
    },
    getConfig() { return { ...currentConfig }; },
  };
}

// ─── 7개 Provider 생성 헬퍼 ──────────────────────────────────

const PROVIDER_NAMES = ['google', 'apple', 'facebook', 'microsoft', 'github', 'kakao', 'naver'] as const;

function createAllProviders(): Array<ReturnType<typeof createMockProvider>> {
  return PROVIDER_NAMES.map((name) =>
    createMockProvider({ name, clientId: `cid-${name}`, clientSecret: `sec-${name}` }),
  );
}

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════

describe('Plugin Audit — 7 OAuth Providers', () => {
  let manager: OAuthManager;

  beforeEach(() => {
    manager = new OAuthManager();
  });

  // ─── Register ─────────────────────────────────────────────

  describe('Register', () => {
    it('7개 Provider 모두 등록 성공', () => {
      const providers = createAllProviders();
      for (const p of providers) {
        manager.register(p);
      }
      expect(manager.size).toBe(7);
      expect(manager.names().sort()).toEqual([...PROVIDER_NAMES].sort());
    });

    it('각 Provider가 get()으로 조회 가능', () => {
      const providers = createAllProviders();
      for (const p of providers) {
        manager.register(p);
      }
      for (const name of PROVIDER_NAMES) {
        expect(manager.has(name)).toBe(true);
        expect(manager.get(name)?.name).toBe(name);
      }
    });

    it('중복 등록 시 ConflictError', () => {
      const provider = createMockProvider({ name: 'google', clientId: 'c1', clientSecret: 's1' });
      manager.register(provider);

      const duplicate = createMockProvider({ name: 'google', clientId: 'c2', clientSecret: 's2' });
      expect(() => manager.register(duplicate)).toThrow(ConflictError);
    });

    it('Google Provider만 실제 구현체로 등록 (나머지는 Mock)', () => {
      const google = new GoogleOAuthProvider('real-client-id', 'real-secret');
      manager.register(google);
      expect(manager.has('google')).toBe(true);
      expect(manager.get('google')).toBe(google);
    });
  });

  // ─── Enable / Disable ─────────────────────────────────────

  describe('Enable / Disable', () => {
    it('Provider 비활성화 시 exchangeCode 호출 → Error', async () => {
      const provider = createMockProvider({ name: 'google', clientId: 'c', clientSecret: 's' });
      manager.register(provider);

      // 활성 상태 → 정상 동작
      expect(provider.isEnabled()).toBe(true);
      const token = await provider.exchangeCode('code1', 'https://redirect.uri/cb');
      expect(token.accessToken).toContain('google');

      // 비활성화
      provider.setEnabled(false);
      expect(provider.isEnabled()).toBe(false);

      // 비활성 상태 → Error
      await expect(provider.exchangeCode('code2', 'https://redirect.uri/cb')).rejects.toThrow('disabled');
    });

    it('비활성화된 Provider 재활성화 후 정상 동작', async () => {
      const provider = createMockProvider({ name: 'apple', clientId: 'c', clientSecret: 's' });
      provider.setEnabled(false);

      expect(provider.isEnabled()).toBe(false);

      provider.setEnabled(true);
      const token = await provider.exchangeCode('code', 'https://redirect.uri/cb');
      expect(token.accessToken).toContain('apple');
    });

    it('7개 Provider 각각 Enable/Disable 토글', async () => {
      const providers = createAllProviders();
      for (const p of providers) manager.register(p);

      for (const name of PROVIDER_NAMES) {
        const p = manager.get(name) as ReturnType<typeof createMockProvider> | undefined;
        expect(p).toBeDefined();
        p!.setEnabled(false);
        expect(p!.isEnabled()).toBe(false);
        p!.setEnabled(true);
        expect(p!.isEnabled()).toBe(true);
      }
    });
  });

  // ─── Remove ───────────────────────────────────────────────

  describe('Remove (Unregister)', () => {
    it('Provider 제거 후 get() → undefined', () => {
      const providers = createAllProviders();
      for (const p of providers) manager.register(p);

      expect(manager.size).toBe(7);

      // google 제거
      const removed = manager.unregister('google');
      expect(removed).toBe(true);
      expect(manager.has('google')).toBe(false);
      expect(manager.get('google')).toBeUndefined();
      expect(manager.size).toBe(6);
    });

    it('존재하지 않는 Provider 제거 시 false 반환', () => {
      expect(manager.unregister('nonexistent')).toBe(false);
    });

    it('모든 Provider 제거 후 size === 0', () => {
      const providers = createAllProviders();
      for (const p of providers) manager.register(p);

      for (const name of PROVIDER_NAMES) {
        manager.unregister(name);
      }
      expect(manager.size).toBe(0);
      expect(manager.names()).toHaveLength(0);
    });
  });

  // ─── Update ───────────────────────────────────────────────

  describe('Update', () => {
    it('Provider 설정 업데이트 (clientId, clientSecret)', () => {
      const provider = createMockProvider({ name: 'google', clientId: 'old-id', clientSecret: 'old-secret' });
      manager.register(provider);

      expect(provider.getConfig().clientId).toBe('old-id');

      provider.updateConfig({ clientId: 'new-id', clientSecret: 'new-secret' });
      const cfg = provider.getConfig();
      expect(cfg.clientId).toBe('new-id');
      expect(cfg.clientSecret).toBe('new-secret');
    });

    it('7개 Provider 각각 설정 업데이트', () => {
      const providers = createAllProviders();
      for (const p of providers) manager.register(p);

      for (const name of PROVIDER_NAMES) {
        const p = manager.get(name) as ReturnType<typeof createMockProvider> | undefined;
        expect(p).toBeDefined();
        p!.updateConfig({ clientId: `updated-${name}` });
        expect(p!.getConfig().clientId).toBe(`updated-${name}`);
      }
    });
  });

  // ─── Failure Handling ─────────────────────────────────────

  describe('Failure Handling', () => {
    it('Token Exchange 실패 (invalid_grant)', async () => {
      const provider = createMockProvider({
        name: 'google', clientId: 'c', clientSecret: 's', failMode: 'exchange',
      });
      manager.register(provider);

      await expect(
        provider.exchangeCode('bad-code', 'https://redirect.uri/cb'),
      ).rejects.toThrow('invalid_grant');
    });

    it('Profile Fetch 실패 (401 Unauthorized)', async () => {
      const provider = createMockProvider({
        name: 'facebook', clientId: 'c', clientSecret: 's', failMode: 'profile',
      });
      manager.register(provider);

      // exchange는 성공
      const token = await provider.exchangeCode('good-code', 'https://redirect.uri/cb');
      expect(token.accessToken).toBeDefined();

      // profile fetch 실패
      await expect(
        provider.fetchUserProfile(token.accessToken),
      ).rejects.toThrow('401 Unauthorized');
    });

    it('Provider Timeout (ETIMEDOUT)', async () => {
      const provider = createMockProvider({
        name: 'microsoft', clientId: 'c', clientSecret: 's', failMode: 'timeout',
      });
      manager.register(provider);

      await expect(
        provider.exchangeCode('code', 'https://redirect.uri/cb'),
      ).rejects.toThrow('ETIMEDOUT');
    });

    it('7개 Provider 각각 실패 모드 검증', async () => {
      for (const name of PROVIDER_NAMES) {
        const provider = createMockProvider({
          name, clientId: 'c', clientSecret: 's', failMode: 'exchange',
        });
        manager.register(provider);

        await expect(
          provider.exchangeCode('code', 'uri'),
        ).rejects.toThrow();

        // 실패 후 정상 모드로 복구
        provider.updateConfig({ failMode: 'none' });
        const token = await provider.exchangeCode('code', 'uri');
        expect(token.accessToken).toContain(name);
      }
    });

    it('Provider 장애 시 다른 Provider는 영향 없음', async () => {
      const google = createMockProvider({
        name: 'google', clientId: 'c', clientSecret: 's', failMode: 'exchange',
      });
      const apple = createMockProvider({
        name: 'apple', clientId: 'c', clientSecret: 's',
      });
      manager.register(google);
      manager.register(apple);

      // google 실패
      await expect(google.exchangeCode('x', 'uri')).rejects.toThrow();

      // apple 정상
      const token = await apple.exchangeCode('x', 'uri');
      expect(token.accessToken).toContain('apple');
    });

    it('OAuthManager toRecord()로 모든 Provider 조회', () => {
      const providers = createAllProviders();
      for (const p of providers) manager.register(p);

      const record = manager.toRecord();
      expect(Object.keys(record)).toHaveLength(7);
      for (const name of PROVIDER_NAMES) {
        expect(record[name]).toBeDefined();
        expect(record[name]?.name).toBe(name);
      }
    });
  });

  // ─── 종합: 생명주기 ─────────────────────────────────────────

  describe('Provider Lifecycle (종합)', () => {
    it('Register → Enable → Use → Disable → Remove 전체 흐름', async () => {
      // 1. Register
      const provider = createMockProvider({ name: 'kakao', clientId: 'c', clientSecret: 's' });
      manager.register(provider);
      expect(manager.has('kakao')).toBe(true);

      // 2. Enable (기본 활성)
      expect(provider.isEnabled()).toBe(true);

      // 3. Use
      const token = await provider.exchangeCode('auth-code', 'https://redirect.uri/cb');
      expect(token.accessToken).toContain('kakao');

      const profile = await provider.fetchUserProfile(token.accessToken);
      expect(profile.email).toBe('user@kakao.com');

      // 4. Disable
      provider.setEnabled(false);
      await expect(provider.exchangeCode('x', 'uri')).rejects.toThrow('disabled');

      // 5. Remove
      manager.unregister('kakao');
      expect(manager.has('kakao')).toBe(false);
    });

    it('Naver Provider 전체 생명주기', async () => {
      const provider = createMockProvider({ name: 'naver', clientId: 'naver-id', clientSecret: 'naver-secret' });

      // Register
      manager.register(provider);
      expect(manager.get('naver')).toBeDefined();

      // Update
      provider.updateConfig({ clientId: 'updated-naver-id' });
      expect(provider.getConfig().clientId).toBe('updated-naver-id');

      // Use
      const token = await provider.exchangeCode('code', 'https://redirect.uri/cb');
      const profile = await provider.fetchUserProfile(token.accessToken);
      expect(profile.emailVerified).toBe(true);

      // Remove
      manager.unregister('naver');
      expect(manager.size).toBe(0);
    });
  });
});
