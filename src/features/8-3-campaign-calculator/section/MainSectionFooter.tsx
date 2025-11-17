import { useMemo } from "react";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

interface MainSectionFooterProps {
  activeTab: "services" | "sales";
}

const CampaignCalculatorMainFooter = ({ activeTab }: MainSectionFooterProps) => {
  const { t } = useAppTranslation();

  const footerContent = useMemo(() => {
    if (activeTab === "services") {
      return t(
        "pages.campaignCalculator.footer.servicesHighlight",
        "Services tab focuses on consultation journeys and client retention metrics."
      );
    }

    return t(
      "pages.campaignCalculator.footer.salesHighlight",
      "Sales tab projects full-funnel conversion metrics for product-based campaigns."
    );
  }, [activeTab, t]);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
      <span>{footerContent}</span>
      <span className="text-xs text-gray-400">
        {t(
          "pages.campaignCalculator.footer.templateReminder",
          "Tip: Save frequently used KPI presets as templates."
        )}
      </span>
    </div>
  );
};

CampaignCalculatorMainFooter.displayName = "CampaignCalculatorMainFooter";

export default CampaignCalculatorMainFooter;

























