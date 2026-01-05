import { formatToRupiah } from '@/utils/formatCurrency';

interface IncomeTransactionTableFooterProps {
  totalTransactions: number;
  filteredTransactions: number;
  totalAmount: number;
  selectedType?: string;
}

export const IncomeTransactionTableFooter = ({ 
  totalTransactions, 
  filteredTransactions = totalTransactions,
  totalAmount,
  selectedType 
}: IncomeTransactionTableFooterProps) => {
  const typeText = selectedType && selectedType !== 'all' 
    ? ` in ${selectedType}` 
    : '';
    
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {filteredTransactions} of {totalTransactions} transactions{typeText}</span>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400">Total: {formatToRupiah(totalAmount)}</span>
          <span className="text-xs text-gray-400">{totalTransactions} transactions</span>
        </div>
      </div>
    </div>
  );
};

