import React from 'react';

/**
 * Loading state component for company profile dashboard
 */
export const CompanyLoadingState = () => {
  return (
    <div className="w-full max-w-none space-y-8">
      <div className="text-center py-8">
        <p className="text-gray-500">Loading company profile...</p>
      </div>
    </div>
  );
};

