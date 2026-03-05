import React, { useState } from 'react';
import { useHabitTracker } from '@/features/8-2-HabitTracker/context/HabitTrackerContext';
import { ConsistencyRateCard } from './ConsistencyRateCard';
import { HabitListMobile } from './HabitListMobile';
import { HabitGridMobile } from './HabitGridMobile';
import { LoadingDots } from '@/components/LoadingDots';

export const HabitTrackerMobileContent = () => {
  const { loading } = useHabitTracker();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain min-h-0 flex flex-col">
        <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-habits space-y-1">
          <div className="bg-card rounded-lg border border-border p-6 flex items-center justify-center">
            <LoadingDots size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain min-h-0 flex flex-col">
      <div className="mx-auto w-full max-w-md px-2 pt-2 content-padding-above-nav-habits space-y-1">
        <ConsistencyRateCard currentMonth={currentMonth} />
        <HabitGridMobile currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
      </div>
    </div>
  );
};
