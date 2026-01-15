import { useState, useCallback, useMemo } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import {
  HeaderAndTab,
  JobOpeningsFilters,
  JobOpeningsMetricsCards,
  JobOpeningsTable,
  JobOpeningsOverview
} from './section';
import { JobOpeningsSidebarFooter } from './section/JobOpeningsSidebarFooter';
import { useJobOpeningsCrud } from '@/features/2_2_job-openings/hooks/useJobOpeningsCrud';
import { JobOpening } from '@/features/2_2_job-openings/hooks/jobOpeningTypes';
import { filterJobOpenings, type JobOpeningsFilters as FilterType } from './utils/jobOpeningsUtils';
import { Button } from '@/features/ui/button';
import { Plus } from 'lucide-react';
import { JobOpeningModal } from '@/features/2_2_job-openings/JobOpeningModal';
import { GenerateLinkModal } from '@/features/2_2_job-openings/GenerateLinkModal';

export const JobOpeningsPage = () => {
  const [activeTab, setActiveTab] = useState('job-openings');
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    status: 'all',
    department: 'all',
    position: 'all',
    level: 'all',
    timePeriod: 'all'
  });
  const [generateLinkModalOpen, setGenerateLinkModalOpen] = useState(false);
  const [selectedJobForLink, setSelectedJobForLink] = useState<JobOpening | null>(null);
  
  const { 
    data: jobOpenings = [], 
    isLoading, 
    refetch,
    modalOpen,
    editItem,
    openAddModal, 
    openEditModal, 
    closeModal,
    saveItem,
    deleteItem,
    saving
  } = useJobOpeningsCrud();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleAddJob = useCallback(() => {
    openAddModal();
  }, [openAddModal]);

  const handleEditJob = useCallback((job: JobOpening) => {
    openEditModal(job);
  }, [openEditModal]);

  const handleDeleteJob = useCallback((id: string) => {
    deleteItem(id);
  }, [deleteItem]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleGenerateLink = useCallback((job: JobOpening) => {
    setSelectedJobForLink(job);
    setGenerateLinkModalOpen(true);
  }, []);

  const handleCloseGenerateLinkModal = useCallback(() => {
    setGenerateLinkModalOpen(false);
    setSelectedJobForLink(null);
    // Refresh job openings data after closing modal
    refetch();
  }, [refetch]);

  // Filter job openings based on current filters
  const filteredJobOpenings = useMemo(() => {
    return filterJobOpenings(jobOpenings, filters);
  }, [jobOpenings, filters]);

  // Get unique departments, positions, and levels for filter options
  const departments = useMemo(() => {
    return [...new Set(jobOpenings.map(job => job.departments?.name).filter(Boolean))].sort() as string[];
  }, [jobOpenings]);

  const positions = useMemo(() => {
    return [...new Set(jobOpenings.map(job => job.job_positions?.name).filter(Boolean))].sort() as string[];
  }, [jobOpenings]);

  const levels = useMemo(() => {
    return [...new Set(jobOpenings.map(job => job.job_levels?.name).filter(Boolean))].sort() as string[];
  }, [jobOpenings]);

  const handleFilterChange = useCallback((key: keyof FilterType, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      department: 'all',
      position: 'all',
      level: 'all',
      timePeriod: 'all'
    });
  }, []);

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

              {/* Grid Layout: 12 columns (9-3) */}
              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                {/* Main Content - 9 columns */}
                <div className="col-span-9 h-full">
                  <div className="h-full flex flex-col">
                    {/* Filter Section */}
                    <div className="flex-shrink-0 mb-2">
                      <div className="bg-white border rounded-md p-2">
                        <JobOpeningsFilters 
                          filters={filters}
                          departments={departments}
                          positions={positions}
                          levels={levels}
                          onFilterChange={handleFilterChange}
                          onClearFilters={handleClearFilters}
                        />
                      </div>
                    </div>
                    
                    {/* Metrics Cards Section */}
                    <div className="flex-shrink-0 mb-2">
                      <JobOpeningsMetricsCards jobOpenings={jobOpenings} />
                    </div>
                    
                    {/* Table Section - Main Content */}
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                        <JobOpeningsTable 
                          jobOpenings={filteredJobOpenings}
                          onRefresh={handleRefresh}
                          onEditJob={handleEditJob}
                          onDeleteJob={handleDeleteJob}
                          onGenerateLink={handleGenerateLink}
                          isLoading={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Overview Sidebar (25% like employee page) */}
                <div className="col-span-3 h-full">
                  <div className="h-full flex flex-col">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
                      {/* Sidebar Header */}
                      <div className="px-4 py-1.5 border-b flex-shrink-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900">Job Openings Overview</h3>
                            <p className="text-xs text-gray-500 mt-1">Summary of job openings data</p>
                          </div>
                          <Button
                            onClick={handleAddJob}
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Job
                          </Button>
                        </div>
                      </div>

                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full p-4 overflow-y-auto seamless-scroll">
                          <JobOpeningsOverview jobOpenings={filteredJobOpenings} />
                        </div>
                      </div>

                      {/* Sidebar Footer */}
                      <JobOpeningsSidebarFooter 
                        totalDepartments={[...new Set(jobOpenings.map(job => job.departments?.name).filter(Boolean))].length}
                        selectedDepartment={filters.department || 'all'}
                        totalJobs={filteredJobOpenings.length}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Job Opening Modal */}
      <JobOpeningModal
        open={modalOpen}
        onClose={closeModal}
        onSave={saveItem}
        editData={editItem && editItem.isEdit ? editItem : null}
        saving={saving}
      />

      {/* Generate Link Modal */}
      <GenerateLinkModal
        open={generateLinkModalOpen}
        onClose={handleCloseGenerateLinkModal}
        job={selectedJobForLink}
      />
    </StandardLayout>
  );
};

export default JobOpeningsPage;
