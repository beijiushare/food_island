import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * API Key 的加密存储。
 * 原生：android/.../SecureStorePlugin.java（EncryptedSharedPreferences + AndroidKeystore）
 * 浏览器：退回 localStorage，仅用于 npm run dev 调试，不打包进真机逻辑
 */

interface SecureStorePlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

const SecureStore = registerPlugin<SecureStorePlugin>('SecureStore');

const WEB_PREFIX = 'fi-secure:';

export async function getSecret(key: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return localStorage.getItem(WEB_PREFIX + key);
  }
  const { value } = await SecureStore.get({ key });
  return value ?? null;
}

export async function setSecret(key: string, value: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem(WEB_PREFIX + key, value);
    return;
  }
  await SecureStore.set({ key, value });
}

export async function removeSecret(key: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.removeItem(WEB_PREFIX + key);
    return;
  }
  await SecureStore.remove({ key });
}
