interface PayrollSidebarFooterProps {
  activeTab: string;
}

export const PayrollSidebarFooter = ({
  activeTab
}: PayrollSidebarFooterProps) => {
  const isPeriods = activeTab === 'periods';

  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{isPeriods ? 'Showing latest payroll periods' : 'Showing latest payroll runs'}</span>
        <span className="text-xs text-gray-400">
          {isPeriods ? 'Period overview' : 'Run overview'}
        </span>
      </div>
    </div>
  );
};
