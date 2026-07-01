import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import en from '@/locales/en.json';

export const defaultLocale = 'en';
export const supportedLocales = [defaultLocale] as const;

const translations = { en };

const resolveLocale = (): string => {
  const locales = getLocales();

  for (const locale of locales) {
    const languageTag = locale.languageTag;
    const languageCode = locale.languageCode;

    if (languageTag in translations) return languageTag;
    if (languageCode !== null && languageCode in translations) return languageCode;
  }

  return defaultLocale;
};

export const i18n = new I18n(translations);
i18n.defaultLocale = defaultLocale;
i18n.enableFallback = true;
i18n.locale = resolveLocale();

export const t = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, options) as string;
