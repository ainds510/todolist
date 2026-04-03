'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  defaultLanguage,
  translations,
  type Language,
  type TranslationKey,
} from '../../lib/i18n';

const STORAGE_KEY = 'todo-language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const getBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') {
    return defaultLanguage;
  }

  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(STORAGE_KEY) as Language | null;
    const nextLanguage =
      savedLanguage === 'en' || savedLanguage === 'zh'
        ? savedLanguage
        : getBrowserLanguage();

    setLanguage(nextLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => translations[language][key],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
