import React from 'react';
import CashAdvanceRequestForm from '@/features/9_request-form/components/CashAdvanceRequestForm';
import PurchaseRequestStatusPanel from '@/features/9_request-form/components/PurchaseRequestStatusPanel';

export const CashAdvanceContent = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none">
      <div className="flex h-full min-h-0">
        {/* Main Form Section - 2/3 width */}
        <div className="flex-1 w-2/3 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none">
          <CashAdvanceRequestForm />
        </div>
        
        {/* Status Panel Section - 1/3 width */}
        <div className="w-1/3 min-h-0 bg-card border-l border-border overflow-y-auto overflow-x-hidden overscroll-none">
          <PurchaseRequestStatusPanel />
        </div>
      </div>
    </div>
  );
};

CashAdvanceContent.displayName = 'CashAdvanceContent';
