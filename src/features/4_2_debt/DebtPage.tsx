import { useState, useCallback, useMemo } from 'react';
import { HeaderAndTab } from '../4_2_dashboard/HeaderAndTab';
import { Card, CardContent } from '@/features/ui/card';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useDebts } from './hooks';
import { DebtTable, DebtForm, DebtPaymentHistoryModal } from './components';
import { DebtPaymentModal } from './components/DebtPaymentModal';
import { Debt, CreateDebtData, UpdateDebtData } from './types';
import { formatToRupiah } from '@/utils/formatCurrency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { useBankAccountBalances } from '@/hooks/organized/useBankAccountBalances';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';

export const DebtPage = () => {
  const [activeTab, setActiveTab] = useState('debt');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentHistoryDebt, setPaymentHistoryDebt] = useState<Debt | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const { t } = useAppTranslation();
  const { debts, totalInterestYtd, isLoading, isCreating, isUpdating, createDebt, updateDebt, deleteDebt, refetch: refetchDebts } = useDebts();
  const { updateBalance } = useBankAccountBalances();
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const { user } = useCurrentUser();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleAddClick = () => {
    setEditingDebt(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (debt: Debt) => {
    setEditingDebt(debt);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (debtId: string) => {
    if (confirm(t('debt.deleteConfirm', 'Are you sure you want to delete this debt?'))) {
      await deleteDebt(debtId);
    }
  };

  const handleViewDetails = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsDetailModalOpen(true);
  };

  const handlePayDebt = () => {
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (paymentData: {
    debtId: string;
    paymentAmount: number;
    paymentDate: string;
    paymentMethod?: string;
    notes?: string;
  }): Promise<boolean> => {
    const debt = debts.find(d => d.id === paymentData.debtId);
    if (!debt) return false;

    if (!organizationId || !user?.id) {
      console.error('Missing organizationId or user.id');
      return false;
    }

    // Insert payment record into debt_payments table
    // The trigger will automatically update paid_amount and available_limit in debts table
    try {
      const { error: paymentError } = await supabase
        .from('debt_payments')
        .insert({
          organization_id: organizationId,
          debt_id: paymentData.debtId,
          created_by: user.id,
          payment_amount: paymentData.paymentAmount,
          payment_date: paymentData.paymentDate,
          payment_method: paymentData.paymentMethod || null,
          notes: paymentData.notes || null,
        });

      if (paymentError) {
        console.error('Error inserting debt payment:', paymentError);
        return false;
      }

      // Trigger will automatically update paid_amount and available_limit in debts table
      // No need to manually update debt
      const success = true;

      // Refetch debts to ensure UI shows updated paid_amount
      if (success) {
        await refetchDebts();
      }

      // Update bank account balance if payment method is a bank account
      if (success && paymentData.paymentMethod) {
        try {
        // Check if paymentMethod is a valid UUID (bank account ID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(paymentData.paymentMethod)) {
          // This is a bank account ID, reduce the balance
          await updateBalance(
            paymentData.paymentMethod,
            -paymentData.paymentAmount, // Negative because we're paying from the account
            'expense', // Debt payment is treated as an expense from the bank account
            paymentData.debtId,
            `Debt Payment: ${debt.debt_name}`
          );
          
          // Invalidate bank account balances query to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['bank-account-balances'] });
        }
        } catch (balanceError) {
          console.error('Error updating bank account balance:', balanceError);
          // Don't fail the payment if balance update fails, but log the error
        }
      }

      return success;
    } catch (insertError) {
      console.error('Error inserting debt payment:', insertError);
      return false;
    }
  };

  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
  };

  const handleFormSubmit = async (data: CreateDebtData): Promise<boolean> => {
    if (editingDebt) {
      const updateData: UpdateDebtData = {
        id: editingDebt.id,
        ...data,
      };
      return await updateDebt(updateData);
    } else {
      return await createDebt(data);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDebt(null);
  };

  // Calculate totals: ambil dari kolom remaining_debt di table debts, fallback ke debt_amount - paid_amount
  const totalDebt = useMemo(() => {
    return debts.reduce((sum, debt) => {
      const remaining = debt.remaining_debt ?? Math.max(0, debt.debt_amount - (debt.paid_amount ?? 0));
      return sum + remaining;
    }, 0);
  }, [debts]);

  const totalLimit = useMemo(() => {
    return debts.reduce((sum, debt) => sum + debt.limit_amount, 0);
  }, [debts]);

  const activeDebts = useMemo(() => {
    return debts.filter(d => d.status === 'active');
  }, [debts]);

  const activeDebtTotal = useMemo(() => {
    return activeDebts.reduce((sum, debt) => {
      const remaining = debt.remaining_debt ?? Math.max(0, debt.debt_amount - (debt.paid_amount ?? 0));
      return sum + remaining;
    }, 0);
  }, [activeDebts]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 pb-4 min-w-0">
          <div className="h-full flex flex-col overflow-hidden min-w-0">
            {/* Header and Tabs */}
            <div className="flex-shrink-0 mb-1 min-w-0">
              <HeaderAndTab 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
              />
            </div>
            
            {/* Content Area - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)] min-w-0">
              <div className="p-2 bg-gradient-to-br from-gray-50 to-white min-h-full flex flex-col min-w-0">
                {/* Header Card */}
                <Card className="mb-4 bg-blue-600 text-white border-0 w-full min-w-0">
                  <CardContent className="p-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl sm:text-2xl font-semibold mb-1 text-white truncate">
                        {t('debt.title', 'Manajemen Hutang')}
                      </h1>
                      <p className="text-blue-100 text-xs sm:text-sm truncate">
                        {t('debt.description', 'Kelola dan lacak catatan hutang')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2 min-w-0">
                  <Card className="min-w-0">
                    <CardContent className="p-3 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{t('debt.totalDebt', 'Total Debt')}</div>
                      <div className="text-xl sm:text-2xl font-bold mb-1 truncate text-red-600">
                        {formatToRupiah(totalDebt)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {debts.length} {t('debt.debts', 'debts')}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0">
                    <CardContent className="p-3 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{t('debt.totalLimit', 'Total Limit')}</div>
                      <div className="text-xl sm:text-2xl font-bold mb-1 truncate">
                        {formatToRupiah(totalLimit)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {t('debt.totalPlafon', 'Total limit')}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0">
                    <CardContent className="p-3 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{t('debt.activeDebt', 'Active Debt')}</div>
                      <div className="text-xl sm:text-2xl font-bold mb-1 truncate text-red-600">
                        {formatToRupiah(activeDebtTotal)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {activeDebts.length} {t('debt.activeDebts', 'active debts')}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0">
                    <CardContent className="p-3 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">{t('debt.totalInterestYtd', 'Total Interest YTD')}</div>
                      <div className="text-xl sm:text-2xl font-bold mb-1 truncate text-amber-600">
                        {formatToRupiah(totalInterestYtd)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {new Date().getFullYear()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Table Section */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <DebtTable
                    debts={debts}
                    isLoading={isLoading}
                    onAdd={handleAddClick}
                    onPayDebt={handlePayDebt}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onViewDetails={handleViewDetails}
                    onPaidClick={setPaymentHistoryDebt}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      <DebtForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingDebt || undefined}
        isLoading={isCreating || isUpdating}
      />

      {/* Payment Modal */}
      <DebtPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentClose}
        onSubmit={handlePaymentSubmit}
        debts={debts}
        isLoading={isUpdating}
      />

      {/* Payment History Modal */}
      <DebtPaymentHistoryModal
        debt={paymentHistoryDebt}
        isOpen={!!paymentHistoryDebt}
        onClose={() => setPaymentHistoryDebt(null)}
      />

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto min-w-0">
          <DialogHeader>
            <DialogTitle>{t('debt.detail.title', 'Debt Details')}</DialogTitle>
            <DialogDescription>
              {t('debt.detail.description', 'Complete information about this debt')}
            </DialogDescription>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.table.debtName', 'Debt Name')}</label>
                  <p className="text-sm font-semibold mt-1">{selectedDebt.debt_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.table.type', 'Type')}</label>
                  <p className="text-sm mt-1">{selectedDebt.debt_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.table.bankInstitution', 'Bank/Institution')}</label>
                  <p className="text-sm mt-1">{selectedDebt.bank_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.table.status', 'Status')}</label>
                  <p className="text-sm mt-1">
                    {selectedDebt.status === 'active' ? t('debt.status.active', 'Active') : 
                     selectedDebt.status === 'paid_off' ? t('debt.status.paidOff', 'Paid Off') : t('debt.status.closed', 'Closed')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.table.totalLimit', 'Total Limit')}</label>
                  <p className="text-sm font-semibold mt-1">{formatToRupiah(selectedDebt.limit_amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.table.debt', 'Debt')}</label>
                  <p className="text-sm font-bold mt-1 text-red-600">
                    {formatToRupiah(
                      selectedDebt.remaining_debt ?? Math.max(0, selectedDebt.debt_amount - (selectedDebt.paid_amount ?? 0))
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.table.utilization', 'Utilization')}</label>
                  <p className="text-sm mt-1">
                    {selectedDebt.limit_amount > 0
                      ? Math.round((selectedDebt.debt_amount / selectedDebt.limit_amount) * 100)
                      : 0}%
                  </p>
                </div>
                {selectedDebt.interest_rate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('debt.detail.interest', 'Interest')}</label>
                    <p className="text-sm mt-1">{selectedDebt.interest_rate} {t('debt.detail.interestPerYear', '% per year')}</p>
                  </div>
                )}
                {selectedDebt.due_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('debt.table.dueDate', 'Due Date')}</label>
                    <p className="text-sm mt-1">
                      {new Date(selectedDebt.due_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                )}
                {selectedDebt.minimum_payment && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('debt.form.minimumPayment', 'Minimum Payment (Rp)')}</label>
                    <p className="text-sm mt-1">{formatToRupiah(selectedDebt.minimum_payment)}</p>
                  </div>
                )}
              </div>
              {selectedDebt.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.form.description', 'Description')}</label>
                  <p className="text-sm mt-1">{selectedDebt.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.detail.created', 'Created')}</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedDebt.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('debt.detail.updated', 'Updated')}</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedDebt.updated_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebtPage;
