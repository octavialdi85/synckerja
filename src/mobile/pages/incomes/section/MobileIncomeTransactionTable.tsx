import { useState } from "react";
import { format } from "date-fns";
import { FileDown } from "lucide-react";
import { Badge } from "@/features/ui/badge";
import { Button } from "@/mobile/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/mobile/components/ui/alert-dialog";
import { formatToRupiah } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";
import { useIncomeTransactions } from "@/features/4-1-dashboard/hooks";
import type { IncomeTransactionWithRelations } from "@/features/4-1-dashboard/types";
import { MobileEditIncomeTransactionModal } from "../modal/MobileEditIncomeTransactionModal";
import { MobileIncomeTransactionDetailsModal } from "../modal/MobileIncomeTransactionDetailsModal";

interface MobileIncomeTransactionTableProps {
  transactions: IncomeTransactionWithRelations[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function MobileIncomeTransactionTable({
  transactions,
  isLoading = false,
  onRefresh,
}: MobileIncomeTransactionTableProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<IncomeTransactionWithRelations | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { deleteIncomeTransaction, isDeleting } = useIncomeTransactions();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleViewDetails = (transaction: IncomeTransactionWithRelations) => {
    setSelectedTransaction(transaction);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (transaction: IncomeTransactionWithRelations) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (transaction: IncomeTransactionWithRelations) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedTransaction) return;
    deleteIncomeTransaction(selectedTransaction.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedTransaction(null);
        onRefresh?.();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto seamless-scroll nested-scroll-touch-chain-xy touch-pan-x max-h-[52vh]">
        <table className="w-full min-w-[1760px] select-none">
          <thead className="border-b border-slate-400/50 sticky top-0 z-10 bg-slate-500">
            <tr>
              <th className="text-left py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Transaction</th>
              <th className="text-left py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Customer</th>
              <th className="text-left py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Service</th>
              <th className="text-left py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Type & Category</th>
              <th className="text-left py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Amount</th>
              <th className="text-left py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Payment Method</th>
              <th className="text-center py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Recurring</th>
              <th className="text-center py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Receipt</th>
              <th className="text-center py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Status</th>
              <th className="text-left py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Date</th>
              <th className="text-left py-2 px-2 font-medium text-slate-100 whitespace-nowrap text-xs bg-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={11} className="h-16 text-center text-xs text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b hover:bg-muted/30 active:bg-gray-100">
                  <td className="px-3 py-2 text-xs max-w-xs">
                    <div className="font-medium text-wrap break-words">{transaction.description || "Transaction"}</div>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium">{transaction.customer_name || "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{transaction.services?.name || "-"}</div>
                    {transaction.sub_services?.name && <div className="text-gray-500 text-xs">{transaction.sub_services.name}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div>{transaction.income_types?.name || "Unknown"}</div>
                    {transaction.income_categories?.name && <div className="text-gray-500 text-xs">{transaction.income_categories.name}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-semibold text-green-600">{formatToRupiah(transaction.amount)}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{transaction.payment_method || "-"}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "mx-auto",
                        transaction.is_recurring ? "text-xs bg-purple-50 text-purple-700 border-purple-200" : "text-xs"
                      )}
                    >
                      {transaction.is_recurring ? (transaction.recurring_frequency ? `Recurring - ${transaction.recurring_frequency}` : "Recurring") : "One-time"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-center">
                    {transaction.receipt_file_path ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs hover:bg-blue-50 mx-auto"
                        onClick={async () => {
                          try {
                            const path = transaction.receipt_file_path as string;
                            if (path.startsWith("http")) {
                              window.open(path, "_blank");
                              return;
                            }
                            const { supabase } = await import("@/integrations/supabase/client");
                            const { data, error } = await supabase.storage.from("income-receipts").download(path);
                            if (error) return;
                            const url = URL.createObjectURL(data);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = transaction.receipt_file_name || `receipt-${transaction.id.substring(0, 8)}`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        <FileDown className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-center">
                    <Badge variant={getStatusBadgeVariant(transaction.status)} className="text-xs mx-auto">
                      {transaction.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-left">{format(new Date(transaction.transaction_date), "MMM dd, yyyy")}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-left">
                    <div className="flex items-center justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(transaction)}
                        className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-xs font-medium h-8 px-1 rounded-sm touch-manipulation"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(transaction)}
                        className="text-gray-700 hover:text-gray-900 text-xs font-medium h-8 px-1 rounded-sm touch-manipulation"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(transaction)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium h-8 px-1 rounded-sm touch-manipulation"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MobileIncomeTransactionDetailsModal
        transaction={selectedTransaction}
        open={isViewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) setSelectedTransaction(null);
        }}
        onEdit={() => {
          setIsViewDialogOpen(false);
          setIsEditDialogOpen(true);
        }}
      />

      <MobileEditIncomeTransactionModal
        income={selectedTransaction}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setSelectedTransaction(null);
            onRefresh?.();
          }
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this income transaction?
              {selectedTransaction ? (
                <>
                  <br />
                  <span className="font-semibold">{selectedTransaction.description || selectedTransaction.customer_name || "Transaction"}</span>
                  <br />
                  Amount: {formatToRupiah(selectedTransaction.amount)}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedTransaction(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
