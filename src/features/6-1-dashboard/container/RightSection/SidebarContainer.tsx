import React from 'react';
import { ReminderTab } from './ReminderTab';
import { SocialMediaErrorBoundary } from '../../hook/ErrorBoundary';

interface SidebarContainerProps {
  selectedMonth?: Date;
}

export const SidebarContainer: React.FC<SidebarContainerProps> = ({ selectedMonth }) => {
  return (
    <SocialMediaErrorBoundary>
      <ReminderTab selectedMonth={selectedMonth} />
    </SocialMediaErrorBoundary>
  );
};
