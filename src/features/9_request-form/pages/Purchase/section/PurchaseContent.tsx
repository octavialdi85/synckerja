import React from 'react';
import PurchaseRequestForm from '@/features/9_request-form/components/PurchaseRequestForm';
import PurchaseRequestStatusPanel from '@/features/9_request-form/components/PurchaseRequestStatusPanel';

export const PurchaseContent = () => {
  return (
    <div className="flex-1 min-h-0 overflow-auto flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Main Form Section - 2/3 width */}
        <div className="flex-1 w-2/3 overflow-auto">
          <PurchaseRequestForm />
        </div>
        
        {/* Status Panel Section - 1/3 width, full height so panel + ScrollArea get bounded height */}
        <div className="w-1/3 h-full flex flex-col min-h-0 bg-card border-l border-border">
          <PurchaseRequestStatusPanel />
        </div>
      </div>
    </div>
  );
};

PurchaseContent.displayName = 'PurchaseContent';
