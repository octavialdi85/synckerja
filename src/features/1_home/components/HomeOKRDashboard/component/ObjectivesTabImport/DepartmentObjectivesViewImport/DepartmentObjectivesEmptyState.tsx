import React from 'react';
import { Button } from '@/features/ui/button';
import { Card, CardContent } from '@/features/ui/card';
import { Building2, Target, Plus } from 'lucide-react';

interface DepartmentObjectivesEmptyStateProps {
  departmentName: string;
  onCreateObjective: () => void;
  onAddContribution: () => void;
}

export const DepartmentObjectivesEmptyState: React.FC<DepartmentObjectivesEmptyStateProps> = ({
  departmentName,
  onCreateObjective,
  onAddContribution
}) => {
  return (
    <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="flex items-center space-x-2 mb-4">
          <Building2 className="h-8 w-8 text-gray-400" />
          <Target className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No objectives for {departmentName}
        </h3>
        <p className="text-sm text-gray-600 mb-6 max-w-md">
          Start building department objectives by creating a new one or contributing to company objectives.
        </p>
        <div className="flex space-x-3">
          <Button
            onClick={onCreateObjective}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Objective
          </Button>
          <Button
            onClick={onAddContribution}
            size="sm"
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <Target className="h-4 w-4 mr-2" />
            Add Contribution
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
