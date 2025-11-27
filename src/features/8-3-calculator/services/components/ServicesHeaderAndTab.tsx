import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp } from "lucide-react";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

const tabs = [
  {
    key: "services",
    path: "/tools/calculator/services",
    titleKey: "pages.calculator.tabs.services",
    fallbackTitle: "Services",
    icon: BarChart3,
  },
  {
    key: "sales",
    path: "/tools/calculator/sales",
    titleKey: "pages.calculator.tabs.sales",
    fallbackTitle: "Sales",
    icon: TrendingUp,
  },
];

export const ServicesHeaderAndTab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useAppTranslation();

  const activeKey = useMemo(() => {
    const match = tabs.find((tab) => location.pathname.startsWith(tab.path));
    return match?.key ?? "services";
  }, [location.pathname]);

  return (
    <div className="px-1 py-3">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">
          {t("pages.calculator.title", "Calculator")}
        </h1>
        <p className="text-xs text-gray-600">
          {t(
            "pages.calculator.subtitle",
            "General purpose calculator tools"
          )}
        </p>
      </div>

      <div className="-mb-3">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeKey === tab.key;

            return (
              <div
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`flex items-center space-x-1.5 py-1.5 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors ${
                  isActive
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              >
                <Icon className="w-4 h-4" />
                <span>{t(tab.titleKey, tab.fallbackTitle)}</span>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default ServicesHeaderAndTab;

