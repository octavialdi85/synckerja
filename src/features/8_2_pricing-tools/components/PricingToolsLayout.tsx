import { PriceCalculator } from './PriceCalculator';

interface PricingToolsLayoutProps {
  onCalculate?: (results: any) => void;
}

export const PricingToolsLayout = ({ onCalculate }: PricingToolsLayoutProps) => {
  return (
    <div className="w-full h-full">
      <PriceCalculator onCalculate={onCalculate} />
    </div>
  );
};
