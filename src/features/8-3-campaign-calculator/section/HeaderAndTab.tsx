import { BarChart3, ShoppingCart } from "lucide-react";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

type CalculatorTab = "services" | "sales";

interface HeaderAndTabProps {
  activeTab: CalculatorTab;
  onTabChange: (tab: CalculatorTab) => void;
}

const HeaderAndTab = ({
  activeTab,
  onTabChange
}: HeaderAndTabProps) => {
  const { t } = useAppTranslation();

  const tabs: Array<{
    id: CalculatorTab;
    label: string;
    icon: typeof BarChart3;
  }> = [
    {
      id: "services",
      label: t("pages.campaignCalculator.tabs.services", "Services"),
      icon: BarChart3
    },
    {
      id: "sales",
      label: t("pages.campaignCalculator.tabs.sales", "Sales"),
      icon: ShoppingCart
    }
  ];

  return (
    <div className="px-1 py-3">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">
          {t("pages.campaignCalculator.title", "Campaign Calculator")}
        </h1>
        <p className="text-xs text-gray-600">
          {t(
            "pages.campaignCalculator.description",
            "Calculate campaign performance with KPI templates for different industries"
          )}
        </p>
      </div>

      <div className="-mb-3">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <div
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-1.5 py-1.5 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors ${
                  isActive
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

HeaderAndTab.displayName = "CampaignCalculatorHeaderAndTab";

export default HeaderAndTab;


