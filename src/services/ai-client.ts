import { Capacitor } from '@capacitor/core';

/**
 * AI 客户端（技术文档 §6.2）。
 * 一个客户端 + 一份配置，不做多供应商槽位。
 */

export interface AIProfile {
  baseUrl: string;
  model: string;
  apiKey: string;
  /** 可选附加请求头，单行「名字: 值」（如 OpenCode 的 x-opencode-session） */
  extraHeader?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
}

export type AIErrorCode = 'no-key' | 'unauthorized' | 'rate-limit' | 'timeout' | 'network' | 'server';

export class AIError extends Error {
  readonly code: AIErrorCode;

  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}

/** 真机直连官方地址；浏览器 dev 走 Vite 代理绕 CORS */
export const DEFAULT_BASE_URL = Capacitor.isNativePlatform()
  ? 'https://api.deepseek.com'
  : '/api/deepseek';

export const DEFAULT_MODEL = 'deepseek-flash';

export const DEFAULT_PROFILE: AIProfile = {
  baseUrl: DEFAULT_BASE_URL,
  model: DEFAULT_MODEL,
  apiKey: '',
};

/** 「名字: 值」→ { 名字: 值 }；格式不对就当没填 */
export function parseExtraHeader(value: string | undefined): Record<string, string> {
  const text = (value ?? '').trim();
  if (!text) return {};
  const index = text.indexOf(':');
  if (index <= 0) return {};
  const name = text.slice(0, index).trim();
  const headerValue = text.slice(index + 1).trim();
  if (!name || !headerValue) return {};
  return { [name]: headerValue };
}

function endpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

interface ChatOptions {
  /** 单位毫秒，默认 20s（技术文档 §6.5） */
  timeoutMs?: number;
  temperature?: number;
  /** 要求模型输出 JSON 对象 */
  json?: boolean;
}

export async function chat(
  profile: AIProfile,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const { timeoutMs = 20000, temperature = 0.2, json = true } = options;

  if (!profile.apiKey) throw new AIError('no-key', '还没配置 API Key');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint(profile.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${profile.apiKey}`,
        ...parseExtraHeader(profile.extraHeader),
      },
      body: JSON.stringify({
        model: profile.model,
        messages,
        temperature,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (response.status === 401 || response.status === 403) {
        throw new AIError('unauthorized', `API Key 无效（${response.status}）`);
      }
      if (response.status === 429) {
        throw new AIError('rate-limit', '请求太频繁，稍后再试');
      }
      throw new AIError('server', `服务返回 ${response.status}：${body.slice(0, 120)}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new AIError('server', '返回内容为空');
    return content;
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AIError('timeout', '网络慢，可稍后重试');
    }
    throw new AIError('network', error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

/** 测试连接：发一条最小请求 */
export async function testProfile(profile: AIProfile): Promise<void> {
  await chat(profile, [{ role: 'user', content: 'ping' }], {
    timeoutMs: 15000,
    json: false,
  });
}
