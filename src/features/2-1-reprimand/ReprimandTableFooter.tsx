import React from 'react';

interface ReprimandTableFooterProps {
  totalEmployees: number;
  totalReprimands: number;
  currentPage?: number;
  totalPages?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onPageChange?: (page: number) => void;
}

export const ReprimandTableFooter: React.FC<ReprimandTableFooterProps> = ({
  totalEmployees,
  totalReprimands,
  currentPage = 1,
  totalPages = 1,
  onPrevious,
  onNext,
  onPageChange
}) => {
  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0 mt-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Total Employees: {totalEmployees}</span>
        <span className="text-xs text-gray-400">
          {totalReprimands > 0 ? `${totalReprimands} reprimands` : 'No reprimands yet'}
        </span>
      </div>
    </div>
  );
};

export default ReprimandTableFooter;




