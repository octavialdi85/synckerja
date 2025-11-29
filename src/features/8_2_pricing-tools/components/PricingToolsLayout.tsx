import { forwardRef } from 'react';
import { PricingWizard, PricingWizardRef } from './PricingWizard';
import { PricingCalculationResult, PricingCalculationInput } from '../types/pricingTypes';

interface PricingToolsLayoutProps {
  onCalculate?: (results: PricingCalculationResult, input: PricingCalculationInput) => void;
}

export const PricingToolsLayout = forwardRef<PricingWizardRef, PricingToolsLayoutProps>(
  ({ onCalculate }, ref) => {
    return (
      <div className="w-full h-full">
        <PricingWizard ref={ref} onCalculate={onCalculate} />
      </div>
    );
  }
);

PricingToolsLayout.displayName = 'PricingToolsLayout';
