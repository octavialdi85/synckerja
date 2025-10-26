import React from 'react';

interface ReprimandSidebarFooterProps {
  totalReprimands: number;
  activeReprimands: number;
  thisMonthReprimands: number;
}

export const ReprimandSidebarFooter = ({ 
  totalReprimands, 
  activeReprimands, 
  thisMonthReprimands 
}: ReprimandSidebarFooterProps) => {
  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0 mt-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Total Reprimands: {totalReprimands}</span>
        <span className="text-xs text-gray-400">Active: {activeReprimands}</span>
      </div>
    </div>
  );
};

