import React from 'react';
import { SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { useStatusBarStyle } from '@/mobile/hooks/useStatusBarStyle';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { JobDescTracker } from './section';

export function JobDescPage() {
  useStatusBarStyle('light');
  const { t } = useAppTranslation();

  return (
    <>
      <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-base font-semibold text-foreground">
              {t('jobDesc.page.title', 'Job Desc')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('jobDesc.page.subtitle', 'See active workload per employee')}
            </p>
          </div>
        </div>
        <div />
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="mx-auto w-full max-w-md px-2 pt-2 flex-1 min-h-0 flex flex-col">
            <JobDescTracker />
          </div>
        </div>
      </div>
    </>
  );
}
