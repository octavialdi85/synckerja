import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Plus, Target } from 'lucide-react';
import { AddObjectiveDialog } from '../../AddObjectiveDialog';
import { FiturTimePeriod, YearQuarterSelection } from './FiturTimePeriod';

interface SectionCompanyObjectivesProgressOverviewProps {
  enhancedCompanyObjectives: any[];
  calculateOverallProgress: () => number;
  activeObjectives: any[];
  draftObjectives: any[];
  completedObjectives: any[];
  loading?: boolean;
  error?: string | null;
  // Stats data
  stats?: {
    avgProgress: number;
    totalObjectives: number;
    nextDeadline: string;
    active?: number;
    draft?: number;
    completed?: number;
  };
  // Props for modal functionality
  organizationId?: string;
  yearQuarterSelection?: YearQuarterSelection;
  onYearQuarterChange?: (selection: YearQuarterSelection) => void;
  availableYears?: number[];
}

export const CompanyObjectivesProgressCard = ({
  enhancedCompanyObjectives,
  calculateOverallProgress,
  activeObjectives,
  draftObjectives,
  completedObjectives,
  loading = false,
  error = null,
  stats,
  // Props for modal functionality
  organizationId,
  yearQuarterSelection,
  onYearQuarterChange,
  availableYears
}: SectionCompanyObjectivesProgressOverviewProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
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
    console.log('🟡 SectionCompanyObjectivesProgressOverview - Year quarter selection changed:', selection);
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
  const hasSelectedPeriod = currentYearQuarterSelection && 
    Object.values(currentYearQuarterSelection.years).some(year => 
      year.selected || Object.values(year.quarters).some(Boolean)
    );

  // Calculate stats - prefer data from props/arguments, fallback to stats
  const finalStats = (() => {
    // If no period is selected, return zero stats
    if (!hasSelectedPeriod) {
      return {
        total: 0,
        active: 0,
        draft: 0,
        completed: 0,
        averageProgress: 0
      };
    }

    // If we have actual objective arrays with data, use those
    if (enhancedCompanyObjectives.length > 0) {
      return {
        total: enhancedCompanyObjectives.length,
        active: enhancedCompanyObjectives.filter(obj => obj.status === 'active').length,
        draft: enhancedCompanyObjectives.filter(obj => obj.status === 'draft').length,
        completed: enhancedCompanyObjectives.filter(obj => obj.status === 'completed').length,
        averageProgress: calculateOverallProgress()
      };
    }
    
    // If we have specific objective arrays, use those
    if (activeObjectives.length > 0 || draftObjectives.length > 0 || completedObjectives.length > 0) {
      return {
        total: activeObjectives.length + draftObjectives.length + completedObjectives.length,
        active: activeObjectives.length,
        draft: draftObjectives.length,
        completed: completedObjectives.length,
        averageProgress: calculateOverallProgress()
      };
    }
    
    // Fallback to stats from useObjectiveStats
    if (stats) {
      return {
        total: stats.totalObjectives,
        active: stats.active || 0,
        draft: stats.draft || 0,
        completed: stats.completed || 0,
        averageProgress: stats.avgProgress
      };
    }
    
    // Final fallback
    return {
      total: 0,
      active: 0,
      draft: 0,
      completed: 0,
      averageProgress: 0
    };
  })();

  return (
    <div className="space-y-3 flex-shrink-0">

      {/* Progress Overview Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm relative z-10">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-900">
                Company Objectives - 2025
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
              
              {/* Add Objective Button */}
              <AddObjectiveDialog 
                type="company"
                buttonClassName="h-8 px-3 py-2 text-sm"
                onObjectiveAdded={() => {
                  console.log('Company objective created successfully');
                  // Trigger any necessary data refresh here
                }}
              />
              
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
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
                <span className="text-xs font-semibold text-gray-900">{finalStats.averageProgress}%</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${finalStats.averageProgress}%` }}
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
                <div className="text-sm font-bold text-green-600">{finalStats.active}</div>
                <div className="text-xs text-green-700 font-medium">Active</div>
              </div>
              <div className="bg-gray-50 rounded-md p-2">
                <div className="text-sm font-bold text-gray-600">{finalStats.draft}</div>
                <div className="text-xs text-gray-600 font-medium">Draft</div>
              </div>
              <div className="bg-blue-50 rounded-md p-2">
                <div className="text-sm font-bold text-blue-600">{finalStats.completed}</div>
                <div className="text-xs text-blue-700 font-medium">Completed</div>
              </div>
            </div>
            
            <div className="text-center bg-gray-50 rounded-md p-2">
              <div className="text-sm font-bold text-gray-900">{finalStats.total} Total</div>
              <div className="text-xs text-gray-600">Overall Progress: {finalStats.averageProgress}%</div>
            </div>
          </div>
        )}
      </div>

          </div>
        );
      };
