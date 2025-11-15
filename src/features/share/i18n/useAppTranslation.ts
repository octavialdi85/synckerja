import { useCallback, useMemo } from "react";
import { applyVariables, defaultTranslations } from "./translations";
import { useLanguage } from "./LanguageProvider";
import { id, enUS } from "date-fns/locale";

export const useAppTranslation = () => {
  const { language } = useLanguage();

  const translate = useCallback(
    (key: string | undefined, fallback: string, variables?: Record<string, string | number>) => {
      if (!key) {
        return applyVariables(fallback, variables);
      }

      const localized =
        defaultTranslations[language]?.[key] ??
        defaultTranslations.id?.[key] ??
        defaultTranslations.en?.[key] ??
        fallback;

      return applyVariables(localized, variables);
    },
    [language],
  );

  const dateLocale = useMemo(() => {
    return language === 'id' ? id : enUS;
  }, [language]);

  return { t: translate, language, dateLocale };
};

















