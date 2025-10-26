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
    <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700 whitespace-nowrap">
          Showing <span className="font-medium">1</span> to <span className="font-medium">{totalEmployees}</span> of{' '}
          <span className="font-medium">{totalEmployees}</span> employees with{' '}
          <span className="font-medium">{totalReprimands}</span> reprimands
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={onPrevious}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button 
            onClick={() => onPageChange?.(currentPage)}
            className="px-3 py-1 text-sm text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            {currentPage}
          </button>
          <button 
            onClick={onNext}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReprimandTableFooter;




