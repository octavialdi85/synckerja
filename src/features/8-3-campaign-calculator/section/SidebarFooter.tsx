import { ReactNode } from "react";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

interface CampaignCalculatorSidebarFooterProps {
  actionSlot?: ReactNode;
}

const CampaignCalculatorSidebarFooter = ({ actionSlot }: CampaignCalculatorSidebarFooterProps) => {
  const { t } = useAppTranslation();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
      <span>
        {t(
          "pages.campaignCalculator.footer.tutorialReminder",
          "Need help? Review the tutorial steps on the right."
        )}
      </span>
      {actionSlot ? (
        <div className="flex items-center space-x-2">{actionSlot}</div>
      ) : (
        <span className="text-gray-400">
          {t("pages.campaignCalculator.footer.autoUpdate", "Guides update based on the selected tab.")}
        </span>
      )}
    </div>
  );
};

CampaignCalculatorSidebarFooter.displayName = "CampaignCalculatorSidebarFooter";

export default CampaignCalculatorSidebarFooter;


