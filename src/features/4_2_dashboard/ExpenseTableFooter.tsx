import React from 'react';
import { Receipt } from 'lucide-react';
import { formatToRupiah } from '@/utils/formatCurrency';

interface ExpenseTableFooterProps {
  totalExpenses: number;
  totalCount: number;
  isLoading?: boolean;
}

/**
 * ExpenseTableFooter Component
 * 
 * Footer untuk expense table yang menampilkan:
 * - Total expenses count
 * - Total amount
 * 
 * @component
 */
export const ExpenseTableFooter = ({ 
  totalExpenses, 
  totalCount, 
  isLoading = false 
}: ExpenseTableFooterProps) => {
  if (isLoading) {
    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-center text-xs text-gray-400">
          <span>Loading statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-3 flex-shrink-0 relative z-10"
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Total Count */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-800">
              Total: {totalCount}
            </span>
          </div>
        </div>

        {/* Right: Total Amount */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700">
              Total Amount: <span className="font-semibold">{formatToRupiah(totalExpenses)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
