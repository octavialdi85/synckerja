import { useState, useCallback, useMemo } from 'react';
import {
  HeaderAndTab,
  ApprovalFilters,
  ApprovalMetricsCards,
  ApprovalTable,
  ApprovalTableFooter,
  ApprovalOverview,
  ApprovalSidebarFooter,
  type ApprovalFiltersType
} from './section';
import { usePurchaseRequests } from '@/features/9_request-form/hooks/usePurchaseRequests';
import { filterRequests } from './utils/approvalUtils';
import { formatToRupiah } from '@/utils/formatCurrency';

export const ApprovalsPage = () => {
  const [activeTab, setActiveTab] = useState('approvals');
  const [filters, setFilters] = useState<ApprovalFiltersType>({
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

  // Filter requests based on current filters
  const filteredRequests = useMemo(() => {
    return filterRequests(requests, filters);
  }, [requests, filters]);

  const handleFilterChange = useCallback((key: keyof ApprovalFiltersType, value: string) => {
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

          {/* Grid Layout: 12 columns (9-3) */}
          <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 overflow-hidden">
            {/* Main Content - 9 columns */}
            <div className="col-span-9 h-full">
              <div className="h-full flex flex-col">
                {/* Filter Section */}
                <div className="flex-shrink-0 mb-2">
                  <div className="bg-white border rounded-md p-2">
                    <ApprovalFilters 
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onClearFilters={handleClearFilters}
                    />
                  </div>
                </div>
                
                {/* Metrics Cards Section */}
                <div className="flex-shrink-0 mb-2">
                  <div className="grid grid-cols-4 gap-2">
                    <ApprovalMetricsCards />
                  </div>
                </div>
                
                {/* Table Section - Main Content */}
                <div className="flex-1 min-h-0">
                  <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                    <ApprovalTable 
                      requests={filteredRequests}
                      onRefresh={handleRefresh}
                      isLoading={isLoading}
                    />
                    <ApprovalTableFooter
                      totalRequests={requests.length}
                      filteredRequests={filteredRequests.length}
                      totalAmount={totalAmount}
                      selectedStatus={filters.status}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Overview Sidebar (25% like employee page) */}
            <div className="col-span-3 h-full">
              <div className="h-full flex flex-col">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                  {/* Sidebar Header */}
                  <div className="px-4 py-1.5 border-b flex-shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900">Approval Overview</h3>
                        <p className="text-xs text-gray-500 mt-1">Summary of approval requests</p>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Sidebar Content */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="h-full p-4">
                      <ApprovalOverview requests={filteredRequests} />
                    </div>
                  </div>

                  {/* Sidebar Footer */}
                  <ApprovalSidebarFooter 
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
    </div>
  );
};
