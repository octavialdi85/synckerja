import { useState, useCallback } from 'react';
import Header from '@/features/1-layouts/header/Header';
import { AppSidebar } from '@/features/1-layouts/sidebar/AppSidebar';
import { SidebarProvider } from '@/features/ui/sidebar';
import { HeaderAndTab } from '@/features/5-1-dashboard/HeaderAndTab';
import {
  CustomerServiceTicketsFilters,
  CustomerServiceTicketsMetricsCards,
  CustomerServiceTicketsTable,
  CustomerServiceTicketsOverview,
  CustomerServiceTicketsSidebarFooter
} from './section';
import { useCustomerServiceTickets } from '@/features/share/hooks/useCustomerServiceTickets';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/features/ui/button';
import { Plus } from 'lucide-react';
import { CreateTicketDialog } from './CreateTicketDialog';

export const CustomerServiceTicketsPage = () => {
  const [activeTab, setActiveTab] = useState('tickets');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { tickets = [], isLoading } = useCustomerServiceTickets();
  const queryClient = useQueryClient();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customer-service-tickets'] });
  }, [queryClient]);

  const handleAddTicket = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  // Calculate unique categories for footer
  const uniqueCategories = [...new Set(tickets.map(t => t.category).filter(Boolean))];

  return (
    <>
      <Header />
      <SidebarProvider className="flex flex-1 w-full mt-16">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
            <div className="flex flex-1 min-h-0">
              {/* Main Content */}
              <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
                <div className="h-full flex flex-col">
                  {/* Header and Tabs */}
                  <div className="flex-shrink-0 mb-1">
                    <HeaderAndTab 
                      activeTab={activeTab} 
                      onTabChange={handleTabChange} 
                    />
                  </div>

                  {/* Grid Layout: 12 columns (9-3) */}
                  <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                    {/* Main Content - 9 columns */}
                    <div className="col-span-9 h-full">
                      <div className="h-full flex flex-col">
                        {/* Filter Section */}
                        <div className="flex-shrink-0 mb-2">
                          <div className="bg-white border rounded-md p-2">
                            <CustomerServiceTicketsFilters />
                          </div>
                        </div>
                        
                        {/* Metrics Cards Section */}
                        <div className="flex-shrink-0 mb-2">
                          <CustomerServiceTicketsMetricsCards />
                        </div>
                        
                        {/* Table Section - Main Content */}
                        <div className="flex-1 min-h-0">
                          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                            <CustomerServiceTicketsTable 
                              tickets={tickets}
                              onRefresh={handleRefresh}
                              isLoading={isLoading}
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
                                <h3 className="text-sm font-semibold text-gray-900">Ticket Overview</h3>
                                <p className="text-xs text-gray-500 mt-1">Summary of ticket data</p>
                              </div>
                              <Button
                                onClick={handleAddTicket}
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                New Ticket
                              </Button>
                            </div>
                          </div>

                          {/* Scrollable Sidebar Content */}
                          <div className="flex-1 min-h-0 overflow-hidden">
                            <div className="h-full p-4 seamless-scroll max-h-[calc(100vh-120px)]">
                              <CustomerServiceTicketsOverview tickets={tickets} />
                            </div>
                          </div>

                          {/* Sidebar Footer */}
                          <CustomerServiceTicketsSidebarFooter 
                            totalCategories={uniqueCategories.length}
                            selectedCategory="all"
                            totalTickets={tickets.length}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
};

export default CustomerServiceTicketsPage;
