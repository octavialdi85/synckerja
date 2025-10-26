import React from 'react';
import { Badge } from '@/features/ui/badge';
import { Accordion } from '@/features/ui/accordion';
import { Calendar } from 'lucide-react';

interface SectionDraftObjectivesProps {
  draftObjectives: any[];
  expandedObjective: string | undefined;
  setExpandedObjective: (value: string | undefined) => void;
  renderObjectiveCard: (objective: any, status: string, borderClass: string, textClass: string) => React.ReactNode;
}

export const SectionDraftObjectives = ({
  draftObjectives,
  expandedObjective,
  setExpandedObjective,
  renderObjectiveCard
}: SectionDraftObjectivesProps) => {
  if (draftObjectives.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="bg-yellow-50 px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-gray-900 text-xs">Draft Objectives</span>
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
              {draftObjectives.length}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            Needs Activation
          </div>
        </div>
      </div>
      
      <div className="p-0 max-h-[550px] overflow-y-auto seamless-scroll scrollbar-hide">
        <Accordion type="single" collapsible value={expandedObjective} onValueChange={setExpandedObjective}>
          {draftObjectives.map(objective => renderObjectiveCard(objective, 'draft', 'border-l-yellow-500', 'text-yellow-600'))}
        </Accordion>
      </div>
    </div>
  );
};
