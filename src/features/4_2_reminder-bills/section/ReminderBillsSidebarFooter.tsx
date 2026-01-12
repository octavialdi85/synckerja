import { formatToRupiah } from '@/utils/formatCurrency';

interface ReminderBillsSidebarFooterProps {
  totalBills: number;
  totalAmount: number;
  selectedStatus?: string;
}

export const ReminderBillsSidebarFooter = ({ 
  totalBills, 
  totalAmount,
  selectedStatus
}: ReminderBillsSidebarFooterProps) => {
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Bills: {totalBills}</span>
        <span className="text-xs text-gray-400">Total: {formatToRupiah(totalAmount)}</span>
      </div>
    </div>
  );
};
