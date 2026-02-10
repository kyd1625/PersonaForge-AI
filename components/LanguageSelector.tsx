
import React from 'react';
import { Language } from '../types';

interface Props {
  current: Language;
  onChange: (lang: Language) => void;
}

const LanguageSelector: React.FC<Props> = ({ current, onChange }) => {
  const langs: { id: Language; label: string; flag: string }[] = [
    { id: 'ko', label: '한국어', flag: '🇰🇷' },
    { id: 'en', label: 'English', flag: '🇺🇸' },
    { id: 'ja', label: '日本語', flag: '🇯🇵' },
  ];

  return (
    <div className="flex gap-2">
      {langs.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onChange(lang.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            current === lang.id
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <span className="mr-1">{lang.flag}</span>
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
