import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Plus, User } from 'lucide-react';
import { LoadingDots } from '@/components/LoadingDots';
import { ModalAddIndividualContribution } from '@/features/1_home/components/HomeOKRDashboard/modal/ModalAddIndividualContribution';
import { FiturTimePeriod, YearQuarterSelection } from './FiturTimePeriod';

interface SectionIndividualObjectivesProgressOverviewProps {
  enhancedIndividualObjectives: any[];
  calculateOverallProgress: () => number;
  activeObjectives: any[];
  draftObjectives: any[];
  completedObjectives: any[];
  loading?: boolean;
  error?: string | null;
  // Props for modal functionality
  organizationId?: string;
  cycleId?: string;
  departmentId?: string;
  yearQuarterSelection?: YearQuarterSelection;
  onYearQuarterChange?: (selection: YearQuarterSelection) => void;
  availableYears?: number[];
  isLoadingCycles?: boolean;
}

export const IndividualObjectivesProgressCard = ({
  enhancedIndividualObjectives,
  calculateOverallProgress,
  activeObjectives,
  draftObjectives,
  completedObjectives,
  loading = false,
  error = null,
  // Props for modal functionality
  organizationId,
  cycleId,
  departmentId,
  yearQuarterSelection,
  onYearQuarterChange,
  availableYears,
  isLoadingCycles = false
}: SectionIndividualObjectivesProgressOverviewProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = currentMonth <= 3 ? 'Q1' : currentMonth <= 6 ? 'Q2' : currentMonth <= 9 ? 'Q3' : 'Q4';
  const defaultYearQuarterSelection: YearQuarterSelection = {
    years: {
      [currentYear]: {
        selected: false,
        quarters: { [currentQuarter]: true }
      }
    }
  };
  
  const currentYearQuarterSelection = yearQuarterSelection || defaultYearQuarterSelection;
  
  const handleYearQuarterChange = (selection: YearQuarterSelection) => {
    if (onYearQuarterChange) onYearQuarterChange(selection);
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };


  // Check if any period is selected (use currentYearQuarterSelection so default works when parent hasn't passed)
  const hasSelectedPeriod = currentYearQuarterSelection &&
    Object.values(currentYearQuarterSelection.years).some(year =>
      year.selected || Object.values(year.quarters).some(Boolean)
    );

  const stats = {
    total: hasSelectedPeriod ? enhancedIndividualObjectives.length : 0,
    active: hasSelectedPeriod ? activeObjectives.length : 0,
    draft: hasSelectedPeriod ? draftObjectives.length : 0,
    completed: hasSelectedPeriod ? completedObjectives.length : 0,
    averageProgress: hasSelectedPeriod ? calculateOverallProgress() : 0
  };

  return (
    <div className="space-y-3 flex-shrink-0">

      {/* Progress Overview Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm relative z-10">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-900">
                Individual Objectives - {new Date().getFullYear()}
              </h4>
            </div>
            <div className="flex items-center space-x-3">
              {/* Time Period Selector */}
              <FiturTimePeriod
                value={currentYearQuarterSelection}
                onChange={handleYearQuarterChange}
                availableYears={availableYears}
                className="h-8"
                isLoading={isLoadingCycles}
              />
              
              {/* Add Contribution Button */}
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors h-8"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contribution</span>
              </button>
              
              {/* Chevron Toggle */}
              <button
                onClick={handleToggle}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar - Always Visible */}
        <div className="p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-4">
              <LoadingDots size="md" />
              <span className="text-sm text-gray-600">Loading progress...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <div className="text-red-600 text-sm">{error}</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Average Progress</span>
                <span className="text-xs font-semibold text-gray-900">{stats.averageProgress}%</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.averageProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Collapsible Content */}
        {isExpanded && !loading && !error && (
          <div className="p-3 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-md p-2">
                <div className="text-sm font-bold text-green-600">{stats.active}</div>
                <div className="text-xs text-green-700 font-medium">Active</div>
              </div>
              <div className="bg-gray-50 rounded-md p-2">
                <div className="text-sm font-bold text-gray-600">{stats.draft}</div>
                <div className="text-xs text-gray-600 font-medium">Draft</div>
              </div>
              <div className="bg-green-50 rounded-md p-2">
                <div className="text-sm font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-green-700 font-medium">Completed</div>
              </div>
            </div>
            
            <div className="text-center bg-gray-50 rounded-md p-2">
              <div className="text-sm font-bold text-gray-900">{stats.total} Total</div>
              <div className="text-xs text-gray-600">Overall Progress: {stats.averageProgress}%</div>
            </div>
          </div>
        )}
      </div>

            {/* Create Individual Contribution Modal */}
            {organizationId && (
              <ModalAddIndividualContribution 
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                organizationId={organizationId}
                cycleId={cycleId}
                departmentId={departmentId}
              />
            )}
    </div>
  );
};
