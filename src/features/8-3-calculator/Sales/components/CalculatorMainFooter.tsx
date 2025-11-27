import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

interface CalculatorMainFooterProps {
  activeTab: "services" | "sales";
}

const CalculatorMainFooter = ({ activeTab }: CalculatorMainFooterProps) => {
  const { t } = useAppTranslation();

  const footerContent = t(
    "pages.calculator.footer.salesHighlight",
    "Calculator Sales provides comprehensive sales funnel analysis and revenue projections."
  );

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
      <span>{footerContent}</span>
      <span className="text-xs text-gray-400">
        {t(
          "pages.calculator.footer.templateReminder",
          "Tip: Save templates to reuse your sales campaign settings."
        )}
      </span>
    </div>
  );
};

CalculatorMainFooter.displayName = "CalculatorMainFooter";

export default CalculatorMainFooter;

