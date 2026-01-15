import { useState, useCallback, useEffect } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { useJobOpeningsCrud } from '@/features/2_2_job-openings/hooks/useJobOpeningsCrud';
import { LoadingDots } from '@/components/LoadingDots';
import { JobOpening } from '@/features/2_2_job-openings/hooks/jobOpeningTypes';
import { HeaderAndTab } from './section';

interface DashboardOverviewContentProps {
  jobOpenings: JobOpening[] | undefined;
}

function DashboardOverviewContent({ jobOpenings }: DashboardOverviewContentProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <div className="text-2xl font-bold text-blue-600">
            {jobOpenings?.filter(job => job.status === 'active').length || 0}
          </div>
          <div className="text-sm text-blue-600">Active Positions</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
          <div className="text-2xl font-bold text-yellow-600">
            {jobOpenings?.filter(job => job.status === 'draft').length || 0}
          </div>
          <div className="text-sm text-yellow-600">Draft Positions</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <div className="text-2xl font-bold text-green-600">
            {jobOpenings?.reduce((sum, job) => sum + (job.submissions || 0), 0) || 0}
          </div>
          <div className="text-sm text-green-600">Total Applications</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <div className="text-2xl font-bold text-purple-600">
            {jobOpenings?.reduce((sum, job) => sum + (job.clicks || 0), 0) || 0}
          </div>
          <div className="text-sm text-purple-600">Total Clicks</div>
        </div>
      </div>

      {/* Top performing jobs */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-semibold mb-4">Top Performing Jobs</h4>
        {jobOpenings && jobOpenings.length > 0 ? (
          <div className="space-y-2">
            {jobOpenings.sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{job.job_title}</p>
                  <p className="text-sm text-gray-600">
                    Created by: {job.creator_profile?.full_name || 'Unknown'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">{job.clicks || 0} clicks</p>
                  <p className="text-sm text-gray-600">{job.submissions || 0} applications</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No job data available</p>
        )}
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: jobOpenings, isLoading } = useJobOpeningsCrud();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    console.log('DashboardOverview mounted', { isLoading, jobOpeningsCount: jobOpenings?.length });
  }, [isLoading, jobOpenings]);

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Content Area - Scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)]">
                <div className="min-h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                      <div className="flex flex-col items-center space-y-4">
                        <LoadingDots size="lg" />
                        <p className="text-sm text-gray-600">Loading recruitment data...</p>
                      </div>
                    </div>
                  ) : (
                    <DashboardOverviewContent jobOpenings={jobOpenings} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
}

export default DashboardOverview;
