import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Button } from '@/features/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { PayrollPeriodsOverview } from '../overview/PayrollPeriodsOverview';
import { PayrollRunsOverview } from '../overview/PayrollRunsOverview';
import { CreatePeriodDialog } from '../../modals/CreatePeriodDialog';
import { CreatePayrollRunDialog } from '../../modals/CreatePayrollRunDialog';
import { PayrollSidebarFooter } from './PayrollSidebarFooter';

interface PayrollSidebarProps {
  selectedPayrollRunId?: string | null;
  onPayrollRunSelect?: (runId: string | null) => void;
  onRunBlocked?: (message: string | null) => void;
}

export const PayrollSidebar = ({ selectedPayrollRunId, onPayrollRunSelect, onRunBlocked }: PayrollSidebarProps) => {
  const [activeTab, setActiveTab] = useState('periods');
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-1.5 border-b flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Payroll Overview</h3>
            <p className="text-xs text-gray-500 mt-1">Latest payroll periods and runs</p>
          </div>
          {activeTab === 'periods' && (
            <Button
              onClick={() => setIsCreatePeriodOpen(true)}
              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5" />
              New Period
            </Button>
          )}
          {activeTab === 'runs' && (
            <CreatePayrollRunDialog>
              <Button className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" />
                New Run
              </Button>
            </CreatePayrollRunDialog>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue="periods" className="h-full flex flex-col" onValueChange={setActiveTab}>
          <div className="px-4 pt-3 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="periods">Periods</TabsTrigger>
              <TabsTrigger value="runs">Runs</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="periods" className="mt-0 h-full">
              <div className="h-full p-4 pt-3 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain min-h-0">
                <PayrollPeriodsOverview />
              </div>
            </TabsContent>
            <TabsContent value="runs" className="mt-0 h-full">
              <div className="h-full p-4 pt-3 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain min-h-0">
                <PayrollRunsOverview
                  selectedRunId={selectedPayrollRunId}
                  onRunSelect={onPayrollRunSelect}
                  onRunBlocked={onRunBlocked}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <PayrollSidebarFooter activeTab={activeTab} />

      <CreatePeriodDialog
        open={isCreatePeriodOpen}
        onOpenChange={setIsCreatePeriodOpen}
      />
    </div>
  );
};