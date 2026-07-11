import type {
  ITemplateRepository,
  IMessageTemplate,
  ChannelType,
} from '../interfaces/index.js';

export class InMemoryTemplateRepository implements ITemplateRepository {
  private readonly records = new Map<string, IMessageTemplate>();

  async insert(template: IMessageTemplate): Promise<void> {
    this.records.set(template.id, template);
  }

  async findByName(name: string, channel: ChannelType, locale: string): Promise<IMessageTemplate | null> {
    for (const t of this.records.values()) {
      if (t.name === name && t.channel === channel && t.locale === locale && t.active) {
        return t;
      }
    }
    return null;
  }

  async findById(id: string): Promise<IMessageTemplate | null> {
    return this.records.get(id) ?? null;
  }

  async findAll(): Promise<IMessageTemplate[]> {
    return Array.from(this.records.values());
  }

  async update(id: string, patch: Partial<IMessageTemplate>): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      Object.assign(record, patch, { updatedAt: new Date().toISOString() });
    }
  }
}
