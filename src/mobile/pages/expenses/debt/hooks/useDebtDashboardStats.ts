import { useMemo } from "react";
import { useDebts } from "@/features/4_2_debt/hooks";

export function useDebtDashboardStats() {
  const { debts, totalInterestYtd, isLoading } = useDebts();

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

  return {
    isLoading,
    debts,
    totalDebt,
    totalLimit,
    activeDebts,
    activeDebtTotal,
    totalInterestYtd,
  };
}
