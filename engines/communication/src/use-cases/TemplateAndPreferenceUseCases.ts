/**
 * Template Management UseCase
 *
 * 템플릿 생성, 조회, 버전 관리.
 */

import { Ok, Err, type Result, ValidationError, ConflictError, z } from '@platform/core-sdk';
import type {
  ITemplateRepository,
  IMessageTemplate,
  ChannelType,
  IClock,
  IIdGenerator,
} from '../interfaces/index.js';

export interface CreateTemplateInput {
  name: string;
  channel: ChannelType;
  locale: string;
  bodyTemplate: string;
  subjectTemplate?: string;
  htmlTemplate?: string;
}

export interface CreateTemplateDeps {
  templateRepository: ITemplateRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
}

const supportedLocales = ['ko', 'en', 'ka', 'ru', 'tr', 'zh', 'de'] as const;

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  channel: z.string().min(1),
  locale: z.enum(supportedLocales),
  bodyTemplate: z.string().min(1),
  subjectTemplate: z.string().optional(),
  htmlTemplate: z.string().optional(),
});

export async function createTemplateUseCase(
  input: CreateTemplateInput,
  deps: CreateTemplateDeps,
): Promise<Result<IMessageTemplate, ValidationError | ConflictError>> {
  const validation = templateSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid template', { details: { issues: validation.error.errors } }));
  }

  // 중복 확인
  const existing = await deps.templateRepository.findByName(input.name, input.channel, input.locale);
  if (existing) {
    return Err(new ConflictError('Template already exists', {
      details: { name: input.name, channel: input.channel, locale: input.locale },
    }));
  }

  const now = deps.clock.now().toISOString();
  const template: IMessageTemplate = {
    id: deps.idGenerator.generate(),
    name: input.name,
    channel: input.channel,
    locale: input.locale,
    bodyTemplate: input.bodyTemplate,
    ...(input.subjectTemplate !== undefined ? { subjectTemplate: input.subjectTemplate } : {}),
    ...(input.htmlTemplate !== undefined ? { htmlTemplate: input.htmlTemplate } : {}),
    version: 1,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  await deps.templateRepository.insert(template);
  return Ok(template);
}

/**
 * User Preference 설정 UseCase
 */

export interface SetPreferenceInput {
  accountId: string;
  tenantId: string;
  locale: string;
  channelPreferences?: Record<string, boolean>;
  categoryPreferences?: Record<string, boolean>;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  maxFrequencyPerDay?: number | null;
}

export interface SetPreferenceDeps {
  preferenceRepository: { upsert(pref: import('../interfaces/index.js').IUserPreference): Promise<void>; findByAccount(accountId: string): Promise<import('../interfaces/index.js').IUserPreference | null> };
  idGenerator: IIdGenerator;
  clock: IClock;
}

export async function setPreferenceUseCase(
  input: SetPreferenceInput,
  deps: SetPreferenceDeps,
): Promise<Result<void, ValidationError>> {
  if (!input.accountId || !input.tenantId) {
    return Err(new ValidationError('accountId and tenantId required'));
  }

  const now = deps.clock.now().toISOString();
  const existing = await deps.preferenceRepository.findByAccount(input.accountId);

  // 사장님 확립: 모든 Channel + Category preference
  const defaultChannelPrefs: Record<string, boolean> = {
    email: true, sms: true, push: true, browser: true, in_app: true,
    webhook: true, whatsapp: true, telegram: true, slack: true, discord: true, teams: true, voice: true,
  };
  const defaultCategoryPrefs: Record<string, boolean> = {
    email: true, sms: true, push: true, marketing: true, security: true, system: true,
    booking: true, payment: true, review: true,
  };

  const pref: import('../interfaces/index.js').IUserPreference = {
    id: existing?.id ?? deps.idGenerator.generate(),
    accountId: input.accountId,
    tenantId: input.tenantId,
    channelPreferences: { ...defaultChannelPrefs, ...(existing?.channelPreferences ?? {}), ...(input.channelPreferences ?? {}) },
    categoryPreferences: { ...defaultCategoryPrefs, ...(existing?.categoryPreferences ?? {}), ...(input.categoryPreferences ?? {}) },
    locale: input.locale || existing?.locale || 'en',
    quietHoursStart: input.quietHoursStart !== undefined ? input.quietHoursStart : (existing?.quietHoursStart ?? null),
    quietHoursEnd: input.quietHoursEnd !== undefined ? input.quietHoursEnd : (existing?.quietHoursEnd ?? null),
    maxFrequencyPerDay: input.maxFrequencyPerDay !== undefined ? input.maxFrequencyPerDay : (existing?.maxFrequencyPerDay ?? null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await deps.preferenceRepository.upsert(pref);
  return Ok(undefined);
}
