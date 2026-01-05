import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Badge } from '@/features/ui/badge';
import { formatToRupiah } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { IncomeTransactionWithRelations } from '@/features/4-1-dashboard/types';
import { FileDown } from 'lucide-react';
import { Button } from '@/features/ui/button';

interface IncomeTransactionViewDialogProps {
  transaction: IncomeTransactionWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export const IncomeTransactionViewDialog = ({
  transaction,
  open,
  onOpenChange,
  onEdit
}: IncomeTransactionViewDialogProps) => {
  if (!transaction) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const path = transaction.receipt_file_path as string;
      if (path.startsWith('http')) {
        window.open(path, '_blank');
        return;
      }
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.storage
        .from('income-receipts')
        .download(path);
      if (error) {
        console.error('Error downloading receipt:', error);
        return;
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = transaction.receipt_file_name || `receipt-${transaction.id.substring(0, 8)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Income Transaction Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Transaction Date</label>
              <p className="text-sm text-gray-900 mt-1">
                {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <p className="text-sm font-semibold text-green-600 mt-1">
                {formatToRupiah(transaction.amount)}
              </p>
            </div>
          </div>

          {/* Customer & Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Customer Name</label>
              <p className="text-sm text-gray-900 mt-1">
                {transaction.customer_name || '-'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Payment Method</label>
              <p className="text-sm text-gray-900 mt-1">
                {transaction.payment_method || '-'}
              </p>
            </div>
          </div>

          {/* Service Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Service</label>
              <p className="text-sm text-gray-900 mt-1">
                {transaction.services?.name || '-'}
              </p>
              {transaction.sub_services?.name && (
                <p className="text-xs text-gray-500 mt-1">
                  {transaction.sub_services.name}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Type & Category</label>
              <p className="text-sm text-gray-900 mt-1">
                {transaction.income_types?.name || 'Unknown'}
              </p>
              {transaction.income_categories?.name && (
                <p className="text-xs text-gray-500 mt-1">
                  {transaction.income_categories.name}
                </p>
              )}
            </div>
          </div>

          {/* Status & Recurring */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge variant={getStatusBadgeVariant(transaction.status || '')} className="text-xs">
                  {transaction.status || '-'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Recurring</label>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={transaction.is_recurring ? "text-xs bg-purple-50 text-purple-700 border-purple-200" : "text-xs"}
                >
                  {transaction.is_recurring 
                    ? (transaction.recurring_frequency ? `Recurring • ${transaction.recurring_frequency}` : "Recurring")
                    : "One-time"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {transaction.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                {transaction.description}
              </p>
            </div>
          )}

          {/* Receipt */}
          {transaction.receipt_file_path && (
            <div>
              <label className="text-sm font-medium text-gray-500">Receipt</label>
              <div className="mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={handleDownloadReceipt}
                >
                  <FileDown className="h-3 w-3 mr-1" />
                  {transaction.receipt_file_name || 'Download Receipt'}
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {onEdit && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  onEdit();
                  onOpenChange(false);
                }}
              >
                Edit Transaction
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

