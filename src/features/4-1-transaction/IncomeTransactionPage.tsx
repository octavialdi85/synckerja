import { useState, useCallback, useMemo } from 'react';
import {
  HeaderAndTab,
  IncomeTransactionFilters,
  IncomeTransactionMetricsCards,
  IncomeTransactionTable,
  IncomeTransactionOverview,
  IncomeTransactionTableFooter,
  IncomeTransactionSidebarFooter,
  type IncomeTransactionFiltersType
} from './section';
import { useIncomeTransactions } from '@/features/4-1-dashboard/hooks';
import { filterTransactions, getUniqueIncomeTypes, getUniqueIncomeCategories } from './utils/transactionUtils';
import { formatToRupiah } from '@/utils/formatCurrency';

export const IncomeTransactionPage = () => {
  const [activeTab, setActiveTab] = useState('transaction');
  const [filters, setFilters] = useState<IncomeTransactionFiltersType>({
    search: '',
    status: 'all',
    type: 'all',
    category: 'all'
  });
  
  const { incomeTransactions, isLoading, refetch } = useIncomeTransactions();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return filterTransactions(incomeTransactions, filters);
  }, [incomeTransactions, filters]);

  // Get unique types and categories for filter options
  const incomeTypes = useMemo(() => {
    return getUniqueIncomeTypes(incomeTransactions);
  }, [incomeTransactions]);

  const incomeCategories = useMemo(() => {
    return getUniqueIncomeCategories(incomeTransactions);
  }, [incomeTransactions]);

  const handleFilterChange = useCallback((key: keyof IncomeTransactionFiltersType, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      type: 'all',
      category: 'all'
    });
  }, []);

  // Calculate totals
  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [filteredTransactions]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4">
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header and Tabs */}
          <div className="flex-shrink-0 mb-1">
            <HeaderAndTab 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </div>

          {/* Grid Layout: full height - table & sidebar isi tinggi yang tersedia */}
          <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 max-h-[calc(100vh-120px)] overflow-hidden grid-rows-1">
            {/* Main Content - 9 columns, full height */}
            <div className="col-span-9 flex flex-col min-h-0 h-full">
              <div className="flex flex-col flex-1 min-h-0 h-full">
                {/* Filter Section */}
                <div className="flex-shrink-0 mb-2">
                  <div className="bg-white border rounded-md p-2">
                    <IncomeTransactionFilters 
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onClearFilters={handleClearFilters}
                    />
                  </div>
                </div>
                
                {/* Metrics Cards Section */}
                <div className="flex-shrink-0 mb-2">
                  <div className="grid grid-cols-4 gap-2">
                    <IncomeTransactionMetricsCards />
                  </div>
                </div>
                
                {/* Table Section - scroll container di dalam IncomeTransactionTable */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <IncomeTransactionTable 
                      transactions={filteredTransactions}
                      onRefresh={handleRefresh}
                      isLoading={isLoading}
                    />
                    <IncomeTransactionTableFooter
                      totalTransactions={incomeTransactions.length}
                      filteredTransactions={filteredTransactions.length}
                      totalAmount={totalAmount}
                      selectedType={filters.type}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Overview Sidebar, full height */}
            <div className="col-span-3 flex flex-col min-h-0 h-full">
              <div className="flex flex-col flex-1 min-h-0 h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Sidebar Header */}
                <div className="px-4 py-1.5 border-b flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">Income Overview</h3>
                      <p className="text-xs text-gray-500 mt-1">Summary of income transactions</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Sidebar Content - wrapper beri tinggi agar tab (Overview/Bank Accounts) bisa scroll */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4">
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <IncomeTransactionOverview transactions={filteredTransactions} />
                    </div>
                  </div>
                </div>

                {/* Sidebar Footer */}
                <IncomeTransactionSidebarFooter 
                  totalTransactions={filteredTransactions.length}
                  totalAmount={totalAmount}
                  selectedType={filters.type}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



