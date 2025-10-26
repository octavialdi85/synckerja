
import React from 'react';
import { useRealtimeSocialMedia } from './useRealtimeSocialMedia';
import { SocialMediaProvider } from '../SocialMediaContext';

interface RealtimeSocialMediaProviderProps {
  children: React.ReactNode;
}

export const RealtimeSocialMediaProvider: React.FC<RealtimeSocialMediaProviderProps> = ({ 
  children 
}) => {
  // Setup realtime subscriptions
  useRealtimeSocialMedia();

  return (
    <SocialMediaProvider>
      {children}
    </SocialMediaProvider>
  );
};

