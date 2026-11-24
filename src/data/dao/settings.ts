import { db } from '../db';
import { DEFAULT_TARGETS, type Targets } from '../types';
import { DEFAULT_PROFILE, type AIProfile } from '../../services/ai-client';
import { getSecret, removeSecret, setSecret } from '../../services/secure-store';

const TARGETS_KEY = 'targets';
const AI_KEY = 'ai-profile';
const AI_KEY_NAME = 'deepseek-key';

/** 非敏感部分：Base URL / 模型 / 附加请求头 */
type AISettings = Omit<AIProfile, 'apiKey'>;

export async function getTargets(): Promise<Targets> {
  const row = await db.settings.get(TARGETS_KEY);
  const value = row?.value as Partial<Targets> | undefined;
  return { ...DEFAULT_TARGETS, ...(value ?? {}) };
}

export async function setTargets(targets: Targets): Promise<void> {
  await db.settings.put({ key: TARGETS_KEY, value: targets });
}

export async function getAISettings(): Promise<AISettings> {
  const row = await db.settings.get(AI_KEY);
  const stored = row?.value as Partial<AISettings> | undefined;
  const { apiKey: _ignored, ...defaults } = DEFAULT_PROFILE;
  return { ...defaults, ...(stored ?? {}) };
}

export async function setAISettings(settings: AISettings): Promise<void> {
  await db.settings.put({ key: AI_KEY, value: settings });
}

/** Key 走加密存储；读不到时回落到开发期环境变量 */
export async function getAPIKey(): Promise<string> {
  try {
    const stored = await getSecret(AI_KEY_NAME);
    if (stored) return stored;
  } catch {
    // 加密存储不可用时不影响手动模式
  }
  return (import.meta.env.VITE_DEEPSEEK_KEY as string | undefined) ?? '';
}

export async function setAPIKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) {
    await removeSecret(AI_KEY_NAME);
    return;
  }
  await setSecret(AI_KEY_NAME, trimmed);
}

export async function clearAPIKey(): Promise<void> {
  await removeSecret(AI_KEY_NAME);
}

export async function getAIProfile(): Promise<AIProfile> {
  const settings = await getAISettings();
  return { ...settings, apiKey: await getAPIKey() };
}
