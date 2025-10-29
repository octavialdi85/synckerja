import React, { useState } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { cn } from '@/lib/utils';
import { TimePeriods } from '@/features/share/TimePeriods';

export interface YearQuarterSelection {
  years: {
    [year: string]: {
      selected: boolean;
      quarters: {
        [quarter: string]: boolean;
      };
    };
  };
}

interface FiturTimePeriodProps {
  value: YearQuarterSelection;
  onChange: (selection: YearQuarterSelection) => void;
  availableYears?: number[];
  className?: string;
  isLoading?: boolean;
}

const QUARTERS = [
  { key: 'Q1', label: 'Q1', dateRange: 'Jan 1 - Mar 31' },
  { key: 'Q2', label: 'Q2', dateRange: 'Apr 1 - Jun 30' },
  { key: 'Q3', label: 'Q3', dateRange: 'Jul 1 - Sep 30' },
  { key: 'Q4', label: 'Q4', dateRange: 'Oct 1 - Dec 31' },
];

// Helper function to get current quarter
const getCurrentQuarter = () => {
  const month = new Date().getMonth() + 1; // getMonth() returns 0-11
  if (month >= 1 && month <= 3) return 'Q1';
  if (month >= 4 && month <= 6) return 'Q2';
  if (month >= 7 && month <= 9) return 'Q3';
  return 'Q4';
};

export const FiturTimePeriod: React.FC<FiturTimePeriodProps> = ({
  value,
  onChange,
  availableYears,
  className,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Removed excessive debug logging for performance

  // Only use availableYears from database, no fallback to hardcoded years
  const years = availableYears || [];

  // Initialize with current quarter selection if not provided and data is available
  React.useEffect(() => {
    if (!isInitialized && Object.keys(value.years).length === 0 && years.length > 0) {
      const currentYear = new Date().getFullYear().toString();
      const currentQuarter = getCurrentQuarter();
      
      // Only initialize if current year is available in the data
      if (years.includes(parseInt(currentYear))) {
        const defaultValue: YearQuarterSelection = { 
          years: {
            [currentYear]: {
              selected: false,
              quarters: {
                [currentQuarter]: true
              }
            }
          }
        };
        
        onChange(defaultValue);
      }
      setIsInitialized(true);
    }
  }, [value, onChange, isInitialized, years]);

  const getSelectedSummary = () => {
    // Show loading state if data is not available
    if (isLoading) {
      return 'Loading...';
    }
    
    // Show message if no data available
    if (years.length === 0) {
      return 'No data available';
    }
    
    const selectedItems: string[] = [];
    
    if (!value || !value.years) {
      return 'Select Period';
    }
    
    Object.entries(value.years).forEach(([year, yearData]) => {
      if (yearData.selected) {
        selectedItems.push(year);
      } else {
        const selectedQuarters = Object.entries(yearData.quarters)
          .filter(([_, selected]) => selected)
          .map(([quarter]) => quarter);
        
        if (selectedQuarters.length > 0) {
          selectedItems.push(`${selectedQuarters.join(', ')} ${year}`);
        }
      }
    });

    if (selectedItems.length === 0) return 'Select periods';
    if (selectedItems.length === 1) return selectedItems[0];
    return `${selectedItems.length} periods selected`;
  };

  // Convert YearQuarterSelection to TimePeriods format
  const convertToTimePeriodsFormat = () => {
    return years.map(year => {
      const yearStr = year.toString();
      const yearData = value.years[yearStr] || { selected: false, quarters: {} };
      
      return {
        id: yearStr,
        name: yearStr,
        dateRange: 'Jan 1 - Dec 31',
        selected: yearData.selected || false,
        expanded: false, // TimePeriods component will manage its own expanded state
        quarters: QUARTERS.map(quarter => ({
          id: `${quarter.key}-${yearStr}`,
          name: `${quarter.key}-${yearStr}`,
          dateRange: quarter.dateRange,
          selected: yearData.quarters[quarter.key] || false
        }))
      };
    });
  };

  // Handle selection change from TimePeriods component
  const handleTimePeriodsChange = (selection: { years: string[], quarters: string[] }) => {
    const newValue: YearQuarterSelection = { years: {} };
    
    years.forEach(year => {
      const yearStr = year.toString();
      const isYearSelected = selection.years.includes(yearStr);
      
      newValue.years[yearStr] = {
        selected: isYearSelected,
        quarters: {}
      };
      
      QUARTERS.forEach(quarter => {
        const quarterId = `${quarter.key}-${yearStr}`;
        newValue.years[yearStr].quarters[quarter.key] = selection.quarters.includes(quarterId);
      });
    });
    
    onChange(newValue);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("justify-between", className)}
          disabled={isLoading || years.length === 0}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="truncate">{getSelectedSummary()}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      {!isLoading && years.length > 0 && (
        <PopoverContent className="w-auto p-0" align="start">
          <TimePeriods
            availableTimePeriods={convertToTimePeriodsFormat()}
            onSelectionChange={handleTimePeriodsChange}
            onClose={() => setIsOpen(false)}
          />
        </PopoverContent>
      )}
    </Popover>
  );
};

// Utility function to check if there's any selection
export const hasYearQuarterSelection = (selection: YearQuarterSelection): boolean => {
  return Object.values(selection.years).some(yearData => 
    yearData.selected || Object.values(yearData.quarters).some(Boolean)
  );
};
