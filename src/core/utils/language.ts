import { Language, LanguagePreference } from '../types';

/**
 * Detects the system/device language locale.
 * Returns 'hi' if browser/device locale is Hindi (e.g. 'hi', 'hi-IN'), otherwise defaults to 'en'.
 */
export const getSystemLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'en';
  
  const languages = navigator.languages || [navigator.language || (navigator as any).userLanguage || 'en'];
  for (const lang of languages) {
    if (lang && lang.toLowerCase().startsWith('hi')) {
      return 'hi';
    }
  }
  return 'en';
};

/**
 * Resolves an active Language ('en' | 'hi') from a LanguagePreference ('system' | 'en' | 'hi').
 */
export const resolveLanguage = (preference: LanguagePreference | string | null | undefined): Language => {
  if (preference === 'hi') return 'hi';
  if (preference === 'en') return 'en';
  return getSystemLanguage();
};

/**
 * Subscribes to system locale changes (e.g., user switches device language in system settings).
 */
export const subscribeToSystemLanguageChange = (onChange: (resolvedLang: Language) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleLanguageChange = () => {
    const activePref = (localStorage.getItem('appLanguagePreference') || localStorage.getItem('appLanguage') || 'system') as LanguagePreference;
    if (activePref === 'system') {
      onChange(getSystemLanguage());
    }
  };

  window.addEventListener('languagechange', handleLanguageChange);
  return () => window.removeEventListener('languagechange', handleLanguageChange);
};
