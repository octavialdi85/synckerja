import Header from "@/features/1-layouts/header/Header";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

const LoadingView = () => {
  const { t } = useAppTranslation();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {t("transferOwnership.loading", "Loading…")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingView;
