import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import type { Language } from "../../features/crop-problems/types";

const LANGUAGE_STORAGE_KEY = "sipat.language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const isLanguage = (value: string | null): value is Language =>
  value === "tl" || value === "en";

/**
 * App-wide language choice for the bundled guide content.
 *
 * Tagalog is the default, matching the rest of the offline experience. The
 * choice is persisted so a farmer who switches to English keeps that setting
 * after closing the app. SecureStore can be unavailable on web, so every
 * access is best-effort and the in-memory value still works.
 */
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>("tl");

  useEffect(() => {
    let isActive = true;

    SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (isActive && isLanguage(stored)) {
          setLanguageState(stored);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => {
      const next: Language = current === "tl" ? "en" : "tl";
      SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, next).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language, setLanguage, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside a LanguageProvider");
  }

  return context;
};
