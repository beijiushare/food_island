import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import zh from './zh.json';

export const SUPPORTED_LANGS = ['zh', 'en'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_STORAGE_KEY = 'fi-lang';

function detectLang(): Lang {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'zh';
  return nav?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: detectLang(),
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** 切换语言：写本地 + 更新 <html lang>，下次启动优先用它 */
export function setLanguage(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* 隐私模式可能写不了，忽略 */
  }
  void i18n.changeLanguage(lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }
}

export default i18n;
