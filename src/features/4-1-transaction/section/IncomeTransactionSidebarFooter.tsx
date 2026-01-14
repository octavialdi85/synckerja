interface IncomeTransactionSidebarFooterProps {
  totalTransactions: number;
  totalAmount: number;
  selectedType?: string;
}

export const IncomeTransactionSidebarFooter = ({ 
  totalTransactions, 
  totalAmount,
  selectedType
}: IncomeTransactionSidebarFooterProps) => {
  return (
    <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Transactions: {totalTransactions}</span>
        <span className="text-xs text-gray-400">Total: {totalTransactions}</span>
      </div>
    </div>
  );
};

