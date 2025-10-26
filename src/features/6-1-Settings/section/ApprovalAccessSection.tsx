import React from 'react';
import { ApprovalAccessTable } from './ApprovalAccessTable';

interface ApprovalAccessSectionProps {
  approvalConfigs: any[];
  isLoading: boolean;
  isAdmin: boolean;
  onAddConfig: () => void;
  onUpdateConfig: (id: string, updates: any) => Promise<void>;
  onDeleteConfig: (id: string) => Promise<void>;
  onEditConfig: (config: any) => void;
}

export const ApprovalAccessSection: React.FC<ApprovalAccessSectionProps> = ({
  approvalConfigs,
  isLoading,
  isAdmin,
  onAddConfig,
  onUpdateConfig,
  onDeleteConfig,
  onEditConfig
}) => {
  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading configurations...</p>
          </div>
        </div>
      ) : (
        <ApprovalAccessTable 
          configs={approvalConfigs}
          onUpdate={onUpdateConfig}
          onDelete={onDeleteConfig}
          onEdit={onEditConfig}
          canManage={isAdmin}
        />
      )}
    </div>
  );
};
