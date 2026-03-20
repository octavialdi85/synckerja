import { useContext, useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";
import { useDebts } from "@/features/4_2_debt/hooks";
import { DebtForm, DebtPaymentModal } from "@/features/4_2_debt/components";
import type { CreateDebtData, Debt, UpdateDebtData } from "@/features/4_2_debt/types";
import { DebtDashboardCarousel } from "@/mobile/pages/expenses/debt/section/DebtDashboardCarousel";
import { DebtTableSection } from "@/mobile/pages/expenses/debt/section/DebtTableSection";
import { MobileDebtPaymentHistoryModal } from "@/mobile/pages/expenses/debt/modal/MobileDebtPaymentHistoryModal";
import { useBankAccountBalances } from "@/hooks/organized/useBankAccountBalances";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/features/share/hooks/useCurrentOrg";
import { useCurrentUser } from "@/features/share/hooks/useCurrentUser";
import { ExpenseDashboardRefreshContext } from "@/mobile/pages/expenses/ExpenseDashboardRefreshContext";

export function DebtTabContent() {
  const { t } = useAppTranslation();
  const refreshContext = useContext(ExpenseDashboardRefreshContext);
  const refetchRef = refreshContext?.refetchRef;
  const { debts, totalInterestYtd, isLoading, isCreating, isUpdating, createDebt, updateDebt, deleteDebt, refetch: refetchDebts } =
    useDebts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentHistoryDebt, setPaymentHistoryDebt] = useState<Debt | null>(null);
  const { updateBalance } = useBankAccountBalances();
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const { user } = useCurrentUser();

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
    return debts.filter((debt) => debt.status === "active");
  }, [debts]);

  const activeDebtTotal = useMemo(() => {
    return activeDebts.reduce((sum, debt) => {
      const remaining = debt.remaining_debt ?? Math.max(0, debt.debt_amount - (debt.paid_amount ?? 0));
      return sum + remaining;
    }, 0);
  }, [activeDebts]);

  const handleAddClick = () => {
    setEditingDebt(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (debt: Debt) => {
    setEditingDebt(debt);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (debtId: string) => {
    if (confirm(t("debt.deleteConfirm", "Are you sure you want to delete this debt?"))) {
      await deleteDebt(debtId);
    }
  };

  const handlePayDebt = () => {
    setIsPaymentModalOpen(true);
  };

  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
  };

  const handlePaymentSubmit = async (paymentData: {
    debtId: string;
    paymentAmount: number;
    paymentDate: string;
    paymentMethod?: string;
    notes?: string;
  }): Promise<boolean> => {
    const debt = debts.find((d) => d.id === paymentData.debtId);
    if (!debt) return false;
    if (!organizationId || !user?.id) return false;

    try {
      const { error: paymentError } = await supabase
        .from("debt_payments")
        .insert({
          organization_id: organizationId,
          debt_id: paymentData.debtId,
          created_by: user.id,
          payment_amount: paymentData.paymentAmount,
          payment_date: paymentData.paymentDate,
          payment_method: paymentData.paymentMethod || null,
          notes: paymentData.notes || null,
        });

      if (paymentError) return false;

      await refetchDebts();

      if (paymentData.paymentMethod) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(paymentData.paymentMethod)) {
          await updateBalance(
            paymentData.paymentMethod,
            -paymentData.paymentAmount,
            "expense",
            paymentData.debtId,
            `Debt Payment: ${debt.debt_name}`
          );
          queryClient.invalidateQueries({ queryKey: ["bank-account-balances"] });
        }
      }

      return true;
    } catch {
      return false;
    }
  };

  const handleFormSubmit = async (data: CreateDebtData): Promise<boolean> => {
    if (editingDebt) {
      const updateData: UpdateDebtData = {
        id: editingDebt.id,
        ...data,
      };
      return await updateDebt(updateData);
    }
    return await createDebt(data);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDebt(null);
  };

  useEffect(() => {
    if (!refetchRef) return;
    refetchRef.current = async () => {
      await refetchDebts();
    };
    return () => {
      refetchRef.current = null;
    };
  }, [refetchRef, refetchDebts]);

  return (
    <>
      <DebtDashboardCarousel
        isLoading={isLoading}
        totalDebt={totalDebt}
        debtCount={debts.length}
        totalLimit={totalLimit}
        activeDebtTotal={activeDebtTotal}
        activeDebtCount={activeDebts.length}
        totalInterestYtd={totalInterestYtd}
      />
      <DebtTableSection
        debts={debts}
        isLoading={isLoading}
        onAdd={handleAddClick}
        onPayDebt={handlePayDebt}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onPaidClick={setPaymentHistoryDebt}
      />
      <DebtForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingDebt || undefined}
        isLoading={isCreating || isUpdating}
      />
      <MobileDebtPaymentHistoryModal
        debt={paymentHistoryDebt}
        isOpen={!!paymentHistoryDebt}
        onClose={() => setPaymentHistoryDebt(null)}
      />
      <DebtPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentClose}
        onSubmit={handlePaymentSubmit}
        debts={debts}
        isLoading={isUpdating}
      />
    </>
  );
}
