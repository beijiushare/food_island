import { db } from '../db';
import { DEFAULT_TARGETS, type Targets } from '../types';
import { DEFAULT_PROFILE, type AIProfile } from '../../services/ai-client';

const TARGETS_KEY = 'targets';
const AI_KEY = 'ai-profile';

export async function getTargets(): Promise<Targets> {
  const row = await db.settings.get(TARGETS_KEY);
  const value = row?.value as Partial<Targets> | undefined;
  return { ...DEFAULT_TARGETS, ...(value ?? {}) };
}

export async function setTargets(targets: Targets): Promise<void> {
  await db.settings.put({ key: TARGETS_KEY, value: targets });
}

/** AI 配置；开发期没有手动配 Key 时回落到本地环境变量 */
export async function getAIProfile(): Promise<AIProfile> {
  const row = await db.settings.get(AI_KEY);
  const stored = row?.value as Partial<AIProfile> | undefined;
  const envKey = (import.meta.env.VITE_DEEPSEEK_KEY as string | undefined) ?? '';

  return {
    ...DEFAULT_PROFILE,
    ...(stored ?? {}),
    apiKey: stored?.apiKey?.trim() || envKey,
  };
}

export async function setAIProfile(profile: AIProfile): Promise<void> {
  await db.settings.put({ key: AI_KEY, value: profile });
}
