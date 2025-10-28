import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Plus, Building } from 'lucide-react';
import { ModalAddDepartmentContribution } from '@/features/1_home/components/HomeOKRDashboard/modal/ModalAddDepartmentContribution';
import { FiturTimePeriod, YearQuarterSelection } from './FiturTimePeriod';

interface SectionDepartmentObjectivesProgressOverviewProps {
  enhancedDepartmentObjectives: any[];
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
}

export const DepartmentObjectivesProgressCard = ({
  enhancedDepartmentObjectives,
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
  availableYears
}: SectionDepartmentObjectivesProgressOverviewProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Default year quarter selection if not provided
  const defaultYearQuarterSelection: YearQuarterSelection = {
    years: {
      [new Date().getFullYear().toString()]: {
        selected: false,
        quarters: {
          'Q3': true // Default to current quarter
        }
      }
    }
  };
  
  const currentYearQuarterSelection = yearQuarterSelection || defaultYearQuarterSelection;
  
  const handleYearQuarterChange = (selection: YearQuarterSelection) => {
    console.log('🟡 SectionDepartmentObjectivesProgressOverview - Year quarter selection changed:', selection);
    if (onYearQuarterChange) {
      console.log('🟡 Calling parent onYearQuarterChange');
      onYearQuarterChange(selection);
    } else {
      console.log('🟡 No parent onYearQuarterChange handler provided');
    }
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Check if any period is selected
  const hasSelectedPeriod = yearQuarterSelection && 
    Object.values(yearQuarterSelection.years).some(year => 
      year.selected || Object.values(year.quarters).some(Boolean)
    );

  const stats = {
    total: hasSelectedPeriod ? enhancedDepartmentObjectives.length : 0,
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
              <Building className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-900">
                Department Objectives - 2025
              </h4>
            </div>
            <div className="flex items-center space-x-3">
              {/* Time Period Selector */}
              <FiturTimePeriod
                value={currentYearQuarterSelection}
                onChange={handleYearQuarterChange}
                availableYears={availableYears || [2024, 2025, 2026, 2027]}
                className="h-8"
              />
              
              {/* Add Contribution Button */}
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors h-8"
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
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="ml-2 text-sm text-gray-600">Loading progress...</span>
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
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
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
              <div className="bg-purple-50 rounded-md p-2">
                <div className="text-sm font-bold text-purple-600">{stats.completed}</div>
                <div className="text-xs text-purple-700 font-medium">Completed</div>
              </div>
            </div>
            
            <div className="text-center bg-gray-50 rounded-md p-2">
              <div className="text-sm font-bold text-gray-900">{stats.total} Total</div>
              <div className="text-xs text-gray-600">Overall Progress: {stats.averageProgress}%</div>
            </div>
          </div>
        )}
      </div>

            {/* Create Department Contribution Modal */}
            {organizationId && (
              <ModalAddDepartmentContribution 
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                organizationId={organizationId}
                cycleId={cycleId || 'default-cycle'}
                departmentId={departmentId}
              />
            )}
          </div>
        );
      };

