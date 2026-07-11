/**
 * OAuthManager — Provider Registry (Epic 3)
 *
 * 헌법 §C-9 (Plugin First): 신규 Provider 추가 시 기존 코드 무수정.
 * Provider를 register() 한 번으로 UseCase에서 사용 가능.
 *
 * 사용법:
 *   const manager = new OAuthManager();
 *   manager.register(new GoogleOAuthProvider(clientId, clientSecret));
 *   manager.register(new AppleOAuthProvider(...));
 *   const provider = manager.get('google');
 */

import { ConflictError } from '@platform/core-sdk';
import type {
  IOAuthProvider,
} from '../interfaces/index.js';

export class OAuthManager {
  private readonly providers = new Map<string, IOAuthProvider>();

  /**
   * Register a provider. Throws ConflictError if name already registered.
   */
  register(provider: IOAuthProvider): void {
    if (this.providers.has(provider.name)) {
      throw new ConflictError(`OAuth provider already registered: ${provider.name}`, {
        details: { provider: provider.name },
      });
    }
    this.providers.set(provider.name, provider);
  }

  /**
   * Unregister a provider by name.
   */
  unregister(name: string): boolean {
    return this.providers.delete(name);
  }

  /**
   * Get a provider by name. Returns undefined if not found.
   */
  get(name: string): IOAuthProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Check if a provider is registered.
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * List all registered provider names.
   */
  names(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * List all registered providers.
   */
  list(): IOAuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Convert to a plain Record (backward compat with old deps.providers pattern).
   */
  toRecord(): Record<string, IOAuthProvider> {
    return Object.fromEntries(this.providers);
  }

  /**
   * Number of registered providers.
   */
  get size(): number {
    return this.providers.size;
  }
}
