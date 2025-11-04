
import React from 'react';
import { SocialMediaProvider } from '../SocialMediaContext';
import { RealtimeSocialMediaSubscriber } from './RealtimeSocialMediaSubscriber';

interface RealtimeSocialMediaProviderProps {
  children: React.ReactNode;
}

export const RealtimeSocialMediaProvider: React.FC<RealtimeSocialMediaProviderProps> = ({ 
  children 
}) => {
  return (
    <SocialMediaProvider>
      <RealtimeSocialMediaSubscriber>
        {children}
      </RealtimeSocialMediaSubscriber>
    </SocialMediaProvider>
  );
};

