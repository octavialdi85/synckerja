import { formatToRupiah } from '@/utils/formatCurrency';

interface ReminderBillsTableFooterProps {
  totalBills: number;
  filteredBills: number;
  totalAmount: number;
  selectedStatus?: string;
}

export const ReminderBillsTableFooter = ({ 
  totalBills, 
  filteredBills = totalBills,
  totalAmount,
  selectedStatus 
}: ReminderBillsTableFooterProps) => {
  const statusText = selectedStatus && selectedStatus !== 'all' 
    ? ` in ${selectedStatus}` 
    : '';
    
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {filteredBills} of {totalBills} bills{statusText}</span>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400">Total: {formatToRupiah(totalAmount)}</span>
          <span className="text-xs text-gray-400">{totalBills} bills</span>
        </div>
      </div>
    </div>
  );
};
