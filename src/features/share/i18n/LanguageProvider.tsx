import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppLanguage, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "./translations";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/features/1-login/hooks/useCurrentOrg";
import { logger } from "@/config/logger";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const loadInitialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "en" || stored === "id" ? (stored as AppLanguage) : DEFAULT_LANGUAGE;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>(loadInitialLanguage);
  const { organizationId } = useCurrentOrg();
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true);

  // Load language from database when organizationId is available
  useEffect(() => {
    const loadLanguageFromDatabase = async () => {
      if (!organizationId) {
        setIsLoadingFromDb(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('application_language')
          .select('is_indonesian')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Failed to load language from database:', error);
          setIsLoadingFromDb(false);
          return;
        }

        if (data) {
          // Convert boolean to AppLanguage: true = "id", false = "en"
          const dbLanguage: AppLanguage = data.is_indonesian ? 'id' : 'en';
          
          // Update language from database
          setLanguageState(dbLanguage);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(LANGUAGE_STORAGE_KEY, dbLanguage);
            document.documentElement.lang = dbLanguage;
          }
          
          if (import.meta.env.DEV) {
            logger.debug('✅ Loaded language from database:', { organizationId, isIndonesian: data.is_indonesian, language: dbLanguage });
          }
        }
      } catch (error: any) {
        console.error('Error loading language from database:', error);
      } finally {
        setIsLoadingFromDb(false);
      }
    };

    loadLanguageFromDatabase();
  }, [organizationId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      document.documentElement.lang = nextLanguage;
    }

    // Save to database if organizationId is available
    if (organizationId && !isLoadingFromDb) {
      const saveLanguageToDatabase = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.warn('No authenticated user, language saved to localStorage only');
            return;
          }

          // Convert language to boolean: "id" = true (Indonesian), "en" = false (English)
          const isIndonesian = nextLanguage === 'id';

          // Upsert language setting to application_language table
          const { error: langError } = await supabase
            .from('application_language')
            .upsert({
              organization_id: organizationId,
              is_indonesian: isIndonesian,
              created_by: user.id,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'organization_id'
            });

          if (langError) {
            console.error('Failed to save language to database:', langError);
          } else {
            if (import.meta.env.DEV) {
              logger.debug('✅ Language saved to database:', { organizationId, isIndonesian, language: nextLanguage });
            }
          }
        } catch (error: any) {
          console.error('Error saving language to database:', error);
        }
      };

      saveLanguageToDatabase();
    }
  }, [organizationId, isLoadingFromDb]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

















