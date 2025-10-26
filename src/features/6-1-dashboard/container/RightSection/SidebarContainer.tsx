import React from 'react';
import { ReminderTab } from './ReminderTab';
import { SocialMediaErrorBoundary } from '../../hook/ErrorBoundary';

export const SidebarContainer: React.FC = () => {
  return (
    <div className="h-full flex flex-col seamless-scroll">
      <SocialMediaErrorBoundary>
        <ReminderTab />
      </SocialMediaErrorBoundary>
    </div>
  );
};
