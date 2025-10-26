import React from 'react';
import { ReminderTab } from './ReminderTab';
import { SocialMediaErrorBoundary } from '../../hook/ErrorBoundary';

export const SidebarContainer: React.FC = () => {
  return (
    <SocialMediaErrorBoundary>
      <ReminderTab />
    </SocialMediaErrorBoundary>
  );
};
