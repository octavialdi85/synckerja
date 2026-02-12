import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { ContentManager } from '../types/social-media';
import type { DigitalMarketingEmployee } from '../hook/useDigitalMarketingEmployees';
import ContentPlannerTab from './EmployeeTarget/ContentPlannerTab';
import ProductionTab from './EmployeeTarget/ProductionTab';
import ContentPostTab from './EmployeeTarget/ContentPostTab';

interface SocialMediaPerformanceTabsProps {
  activePerformanceTab: string;
  setActivePerformanceTab: (tab: string) => void;
  selectedDate: Date;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  selectedMonth: Date;
  setSelectedMonth: React.Dispatch<React.SetStateAction<Date>>;
  isCalendarOpen: boolean;
  setIsCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMonthSelectorOpen: boolean;
  setIsMonthSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  contentPlanners: ContentManager[];
  creativeProductionMembers: ContentManager[];
  digitalEmployees?: DigitalMarketingEmployee[];
  handleEditTarget: (manager: ContentManager) => void;
  handlePreviousMonth: () => void;
  handleNextMonth: () => void;
}

export const SocialMediaPerformanceTabs: React.FC<SocialMediaPerformanceTabsProps> = ({
  activePerformanceTab,
  setActivePerformanceTab,
  selectedDate,
  setSelectedDate,
  selectedMonth,
  setSelectedMonth,
  isCalendarOpen,
  setIsCalendarOpen,
  isMonthSelectorOpen,
  setIsMonthSelectorOpen,
  contentPlanners,
  creativeProductionMembers,
  digitalEmployees = [],
  handleEditTarget,
  handlePreviousMonth,
  handleNextMonth
}) => {
  return (
    <Tabs value={activePerformanceTab} onValueChange={setActivePerformanceTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 border border-gray-200">
        <TabsTrigger value="content-planner" className="border-r border-gray-200">Content Planner</TabsTrigger>
        <TabsTrigger value="production" className="border-r border-gray-200">Production</TabsTrigger>
        <TabsTrigger value="content-post">Content Post</TabsTrigger>
      </TabsList>

      <TabsContent value="content-planner" className="mt-0">
        <ContentPlannerTab
          contentManagers={contentPlanners}
          digitalEmployees={digitalEmployees}
          handleEditTarget={handleEditTarget}
        />
      </TabsContent>

      <TabsContent value="production" className="mt-0">
        <ProductionTab
          contentManagers={creativeProductionMembers}
          digitalEmployees={digitalEmployees}
          handleEditTarget={handleEditTarget}
        />
      </TabsContent>

      <TabsContent value="content-post" className="mt-0">
        <ContentPostTab
          contentManagers={contentPlanners}
          handleEditTarget={handleEditTarget}
        />
      </TabsContent>
    </Tabs>
  );
};
