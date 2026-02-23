import { useState, useCallback, useMemo } from 'react';
import {
  HeaderAndTab,
  PaymentFilters,
  PaymentMetricsCards,
  PaymentTable,
  PaymentTableFooter,
  PaymentOverview,
  PaymentSidebarFooter,
  type PaymentFiltersType
} from './section';
import { usePurchaseRequests } from '@/features/9_request-form/hooks/usePurchaseRequests';
import { filterPaymentRequests } from './utils/paymentUtils';
import { formatToRupiah } from '@/utils/formatCurrency';

export const PaymentProcessPage = () => {
  const [activeTab, setActiveTab] = useState('payment-process');
  const [filters, setFilters] = useState<PaymentFiltersType>({
    search: '',
    status: 'all',
    type: 'all',
    department: 'all'
  });
  
  const { data: requests = [], isLoading, refetch } = usePurchaseRequests();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Filter requests - only approved requests for payment processing
  const approvedRequests = useMemo(() => {
    return requests.filter(req => req.status === 'approved');
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return filterPaymentRequests(requests, filters);
  }, [requests, filters]);

  const handleFilterChange = useCallback((key: keyof PaymentFiltersType, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      type: 'all',
      department: 'all'
    });
  }, []);

  // Calculate totals
  const totalAmount = useMemo(() => {
    return filteredRequests.reduce((sum, req) => sum + (req.amount_idr || 0), 0);
  }, [filteredRequests]);

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

          {/* Grid Layout: full height, table & sidebar satu scroll per panel (scroll chaining) */}
          <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 max-h-[calc(100vh-120px)] overflow-hidden grid-rows-1">
            {/* Main Content - 9 columns, full height */}
            <div className="col-span-9 flex flex-col min-h-0 h-full">
              <div className="flex flex-col flex-1 min-h-0 h-full">
                {/* Filter Section */}
                <div className="flex-shrink-0 mb-2">
                  <div className="bg-white border rounded-md p-2">
                    <PaymentFilters 
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onClearFilters={handleClearFilters}
                    />
                  </div>
                </div>
                
                {/* Metrics Cards Section */}
                <div className="flex-shrink-0 mb-2">
                  <div className="grid grid-cols-4 gap-2">
                    <PaymentMetricsCards />
                  </div>
                </div>
                
                {/* Table Section - scroll container di dalam PaymentTable */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <PaymentTable 
                      requests={filteredRequests}
                      onRefresh={handleRefresh}
                      isLoading={isLoading}
                    />
                    <PaymentTableFooter
                      totalRequests={approvedRequests.length}
                      filteredRequests={filteredRequests.length}
                      totalAmount={totalAmount}
                      selectedStatus={filters.status}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Overview Sidebar, scroll chaining */}
            <div className="col-span-3 flex flex-col min-h-0 h-full">
              <div className="flex flex-col flex-1 min-h-0 h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Sidebar Header */}
                <div className="px-4 py-1.5 border-b flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">Payment Overview</h3>
                      <p className="text-xs text-gray-500 mt-1">Summary of payment requests</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Sidebar Content - satu scroll container, chain ke halaman */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
                    <PaymentOverview requests={filteredRequests} />
                  </div>
                </div>

                {/* Sidebar Footer */}
                <PaymentSidebarFooter 
                  totalRequests={filteredRequests.length}
                  totalAmount={totalAmount}
                  selectedStatus={filters.status}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
