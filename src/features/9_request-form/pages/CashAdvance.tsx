
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import MainHeader from '@/components/layouts/MainHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CashAdvanceRequestForm from '@/components/1_halaman/9_request-form/components/CashAdvanceRequestForm';
import PurchaseRequestStatusPanel from '@/components/1_halaman/9_request-form/components/PurchaseRequestStatusPanel';
import { Toaster } from '@/components/ui/toaster';

const CashAdvance = () => {
  const navigate = useNavigate();

  const handleTabChange = (newTab: string) => {
    navigate(`/request-form/${newTab}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <MainHeader />
        
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            {/* Compact Header */}
            <div className="bg-card border-b border-border px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-lg font-semibold text-foreground">Request Form</h1>
              </div>

              {/* Compact Tabs */}
              <Tabs value="cash-advance" onValueChange={handleTabChange}>
                <TabsList className="inline-flex h-7 items-center justify-center rounded-none bg-transparent p-0 border-b border-border w-auto">
                  <TabsTrigger 
                    value="purchase"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-none px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 hover:text-blue-600"
                  >
                    Purchase
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reimbursement"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-none px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 hover:text-blue-600"
                  >
                    Reimbursement
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cash-advance"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-none px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 hover:text-blue-600"
                  >
                    Cash Advance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="loan"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-none px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 hover:text-blue-600"
                  >
                    Loan
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Main Content with Two-Column Layout - Full Width */}
            <div className="flex-1 overflow-auto">
              <div className="flex h-full">
                {/* Main Form Section - 2/3 width */}
                <div className="flex-1 w-2/3 overflow-auto">
                  <CashAdvanceRequestForm />
                </div>
                
                {/* Status Panel Section - 1/3 width */}
                <div className="w-1/3 bg-card border-l border-border overflow-auto">
                  <PurchaseRequestStatusPanel />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Toaster />
    </SidebarProvider>
  );
};

export default CashAdvance;
