import React from 'react';
import PurchaseRequestForm from '@/features/9_request-form/components/PurchaseRequestForm';
import PurchaseRequestStatusPanel from '@/features/9_request-form/components/PurchaseRequestStatusPanel';

export const PurchaseContent = () => {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex h-full">
        {/* Main Form Section - 2/3 width */}
        <div className="flex-1 w-2/3 overflow-auto">
          <PurchaseRequestForm />
        </div>
        
        {/* Status Panel Section - 1/3 width */}
        <div className="w-1/3 bg-card border-l border-border overflow-auto">
          <PurchaseRequestStatusPanel />
        </div>
      </div>
    </div>
  );
};

PurchaseContent.displayName = 'PurchaseContent';
