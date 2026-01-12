import { useState } from 'react';
import { PayrollExpenseMetricsCards } from './PayrollExpenseMetricsCards';
import { PayrollExpenseTable } from './PayrollExpenseTable';
import { PayrollExpenseOverview } from './PayrollExpenseOverview';
import { PayrollExpenseFilters } from './PayrollExpenseFilters';
import { toast } from 'sonner';

export const PayrollExpensePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all-periods');
  const [statusFilter, setStatusFilter] = useState('all-status');

  const handleExport = () => {
    toast.success('Export functionality will be implemented');
  };

  return (
    <div className="p-2 flex gap-2 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-full">
      {/* Main Content - Adjusted layout ratio */}
      <div className="flex-1" style={{ flex: '1.8' }}>
        {/* Compact Filter Section */}
        <PayrollExpenseFilters 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          periodFilter={periodFilter}
          onPeriodChange={setPeriodFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          onExport={handleExport}
        />
        
        {/* Ultra Compact Metrics Section */}
        <div className="mb-2">
          <div className="grid grid-cols-4 gap-1">
            <PayrollExpenseMetricsCards />
          </div>
        </div>
        
        {/* Payroll Expense Table */}
        <div className="bg-white/95 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm overflow-hidden relative">
          {/* Modern accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 via-indigo-500/40 to-purple-500/30"></div>
          
          <PayrollExpenseTable 
            searchTerm={searchTerm}
            periodFilter={periodFilter}
            statusFilter={statusFilter}
          />
        </div>
      </div>
      
      {/* Sidebar - Increased width to 480px */}
      <div className="w-96 bg-white/90 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm overflow-hidden relative" style={{ flex: 'none', width: '480px' }}>
        {/* Subtle accent border */}
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/40 via-indigo-400/30 to-purple-400/20"></div>
        
        <div className="p-3 border-b border-slate-100/80 bg-gradient-to-r from-blue-50/30 to-white">
          <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-1">Payroll Expense Overview</h3>
          <p className="text-xs text-slate-500">Latest payroll expense activities</p>
        </div>
        
        <div className="p-2">
          <PayrollExpenseOverview />
        </div>
      </div>
    </div>
  );
};
