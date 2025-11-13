import { useCallback } from "react";
import { applyVariables, defaultTranslations } from "./translations";
import { useLanguage } from "./LanguageProvider";

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

  return { t: translate, language };
};












