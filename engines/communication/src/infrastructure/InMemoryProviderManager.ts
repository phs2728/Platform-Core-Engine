import type {
  IProviderManager,
  IChannelProvider,
  ChannelType,
} from '../interfaces/index.js';

export class InMemoryProviderManager implements IProviderManager {
  private readonly providers = new Map<string, IChannelProvider>(); // "channel:name" → provider
  private readonly defaults = new Map<ChannelType, string>(); // channel → provider name

  register(provider: IChannelProvider): void {
    const key = `${provider.channel}:${provider.name}`;
    this.providers.set(key, provider);
    // 첫 Provider를 default로 설정
    if (!this.defaults.has(provider.channel)) {
      this.defaults.set(provider.channel, provider.name);
    }
  }

  get(channel: ChannelType, name: string): IChannelProvider | null {
    return this.providers.get(`${channel}:${name}`) ?? null;
  }

  getDefault(channel: ChannelType): IChannelProvider | null {
    const defaultName = this.defaults.get(channel);
    if (!defaultName) return null;
    return this.get(channel, defaultName);
  }

  setDefault(channel: ChannelType, name: string): void {
    if (this.providers.has(`${channel}:${name}`)) {
      this.defaults.set(channel, name);
    } else {
      throw new Error(`Provider not found: ${channel}:${name}`);
    }
  }

  list(channel?: ChannelType): IChannelProvider[] {
    const all = Array.from(this.providers.values());
    if (channel) {
      return all.filter((p) => p.channel === channel);
    }
    return all;
  }

  unregister(channel: ChannelType, name: string): void {
    const key = `${channel}:${name}`;
    this.providers.delete(key);
    if (this.defaults.get(channel) === name) {
      this.defaults.delete(channel);
      // 다른 Provider를 default로
      const remaining = this.list(channel);
      if (remaining.length > 0 && remaining[0]) {
        this.defaults.set(channel, remaining[0].name);
      }
    }
  }
}
