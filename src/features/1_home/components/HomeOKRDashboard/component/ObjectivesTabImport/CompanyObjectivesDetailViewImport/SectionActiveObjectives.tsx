import React from 'react';
import { Badge } from '@/features/ui/badge';
import { Accordion } from '@/features/ui/accordion';
import { TrendingUp } from 'lucide-react';

interface SectionActiveObjectivesProps {
  activeObjectives: any[];
  expandedObjective: string | undefined;
  setExpandedObjective: (value: string | undefined) => void;
  renderObjectiveCard: (objective: any, status: string, borderClass: string, textClass: string) => React.ReactNode;
}

export const SectionActiveObjectives = ({
  activeObjectives,
  expandedObjective,
  setExpandedObjective,
  renderObjectiveCard
}: SectionActiveObjectivesProps) => {
  if (activeObjectives.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="bg-green-50 px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="font-medium text-gray-900 text-xs">Active Objectives</span>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {activeObjectives.length}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            In Progress
          </div>
        </div>
      </div>
      
      <div className="p-0 max-h-[350px] overflow-y-auto seamless-scroll scrollbar-hide">
        <Accordion type="single" collapsible value={expandedObjective} onValueChange={setExpandedObjective}>
          {activeObjectives.map(objective => renderObjectiveCard(objective, 'active', 'border-l-green-500', 'text-green-600'))}
        </Accordion>
      </div>
    </div>
  );
};
