import React, { useState } from 'react';
import { ClientVisitsFilters } from './ClientVisitsFilters';
import { ClientVisitsMetricsCards } from './ClientVisitsMetricsCards';
import { ClientVisitsTable } from './ClientVisitsTable';
import { RecentClientVisitsOverview } from './RecentClientVisitsOverview';
import { ClientVisitsSidebarFooter } from './ClientVisitsSidebarFooter';
import { useClientVisits } from '@/hooks/organized/sales';
import { Button } from '@/features/ui/button';
import { Plus } from 'lucide-react';

export const ClientVisitsPageContent = () => {
  const { visits, loading, refetch } = useClientVisits();
  const [filters, setFilters] = useState({
    search: '',
    employee: '',
    date: 'all',
    status: 'all'
  });

  const handleEdit = (visit: any) => {
    console.log('Edit visit:', visit);
    refetch();
  };

  const handleNewVisit = () => {
    console.log('New visit');
    // TODO: Open new visit modal
  };

  const filteredVisits = visits.filter(visit => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const clientName = visit.clientInfo?.company_name?.toLowerCase() || '';
      const locationName = visit.locationInfo?.name?.toLowerCase() || '';
      if (!clientName.includes(searchLower) && !locationName.includes(searchLower)) {
        return false;
      }
    }
    if (filters.employee && visit.employees?.id !== filters.employee) {
      return false;
    }
    if (filters.status !== 'all' && visit.status !== filters.status) {
      return false;
    }
    if (filters.date !== 'all') {
      const visitDate = new Date(visit.visit_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (filters.date) {
        case 'today':
          if (visitDate.toDateString() !== today.toDateString()) return false;
          break;
        case 'this_week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          if (visitDate < weekStart) return false;
          break;
        case 'this_month':
          if (visitDate.getMonth() !== today.getMonth() || visitDate.getFullYear() !== today.getFullYear()) return false;
          break;
        case 'last_month':
          const lastMonth = new Date(today);
          lastMonth.setMonth(today.getMonth() - 1);
          if (visitDate.getMonth() !== lastMonth.getMonth() || visitDate.getFullYear() !== lastMonth.getFullYear()) return false;
          break;
      }
    }
    return true;
  });

  // Calculate unique statuses for footer
  const uniqueStatuses = [...new Set(filteredVisits.map(v => v.status).filter(Boolean))];

  return (
    <>
      {/* Grid Layout: 12 columns (9-3) */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 h-full">
        {/* Main Content - 9 columns */}
        <div className="col-span-9 h-full flex flex-col min-h-0">
          <div className="h-full flex flex-col min-h-0">
            {/* Filter Section */}
            <div className="flex-shrink-0 mb-2">
              <div className="bg-white border rounded-md p-2">
                <ClientVisitsFilters 
                  filters={filters}
                  onFiltersChange={setFilters}
                  onNewVisit={handleNewVisit}
                />
              </div>
            </div>
            
            {/* Metrics Cards Section */}
            <div className="flex-shrink-0 mb-2">
              <ClientVisitsMetricsCards visits={filteredVisits} />
            </div>
            
            {/* Table Section - Main Content */}
            <div className="flex-1 min-h-0 h-full">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                <ClientVisitsTable 
                  visits={filteredVisits}
                  loading={loading}
                  onRefresh={refetch}
                  onEdit={handleEdit}
                  selectedStatus={filters.status}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Overview Sidebar (25% like employee page) */}
        <div className="col-span-3 h-full flex flex-col min-h-0">
          <div className="h-full flex flex-col min-h-0">
            <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col min-h-0">
              {/* Sidebar Header */}
              <div className="px-4 py-1.5 border-b flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">Client Visits Overview</h3>
                    <p className="text-xs text-gray-500 mt-1">Summary of client visits</p>
                  </div>
                  <Button
                    onClick={handleNewVisit}
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Visit
                  </Button>
                </div>
              </div>

              {/* Scrollable Sidebar Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full p-4 seamless-scroll max-h-[calc(100vh-120px)]">
                  <RecentClientVisitsOverview visits={filteredVisits} />
                </div>
              </div>

              {/* Sidebar Footer */}
              <ClientVisitsSidebarFooter 
                totalStatuses={uniqueStatuses.length}
                totalVisits={filteredVisits.length}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};








