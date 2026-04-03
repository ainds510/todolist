'use client';

import { Segmented } from 'antd';
import { languages } from '../../lib/i18n';
import { useLanguage } from './LanguageProvider';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <Segmented
      size="middle"
      value={language}
      onChange={(value) => setLanguage(value as 'en' | 'zh')}
      options={languages.map((item) => ({
        label: item.label,
        value: item.code,
      }))}
    />
  );
}
