interface PayrollCalculationsTableFooterProps {
  totalCalculations: number;
  paidCalculations: number;
  filteredCalculations?: number;
}

export const PayrollCalculationsTableFooter = ({
  totalCalculations,
  paidCalculations,
  filteredCalculations = totalCalculations
}: PayrollCalculationsTableFooterProps) => {
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {filteredCalculations} of {totalCalculations} payroll calculations</span>
        <span className="text-xs text-gray-400">Paid: {paidCalculations} entries</span>
      </div>
    </div>
  );
};
