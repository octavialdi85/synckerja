import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar } from 'lucide-react';

interface Quarter {
  id: string;
  name: string;
  dateRange: string;
  selected: boolean;
}

interface Year {
  id: string;
  name: string;
  dateRange: string;
  selected: boolean;
  expanded: boolean;
  quarters: Quarter[];
}

interface TimePeriodsProps {
  onSelectionChange?: (selection: { years: string[], quarters: string[] }) => void;
  initialSelection?: { years: string[], quarters: string[] };
  onClose?: () => void;
  availableTimePeriods?: Year[];
}

// No hardcoded data - only use data from database
const initialTimePeriodsData: Year[] = [];

export const TimePeriods: React.FC<TimePeriodsProps> = ({ 
  onSelectionChange, 
  initialSelection,
  onClose,
  availableTimePeriods
}) => {
  const [timePeriods, setTimePeriods] = useState<Year[]>(availableTimePeriods || []);
  const checkboxRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  // Update timePeriods when availableTimePeriods changes - but preserve selection state
  React.useEffect(() => {
    if (availableTimePeriods && availableTimePeriods.length > 0) {
      setTimePeriods(prevPeriods =>
        availableTimePeriods.map(newYear => {
          const existingYear = prevPeriods.find(p => p.id === newYear.id);
          return {
            ...newYear,
            selected: existingYear?.selected ?? false,
            expanded: existingYear?.expanded ?? false,
            quarters: newYear.quarters.map(newQuarter => {
              const existingQuarter = existingYear?.quarters.find(q => q.id === newQuarter.id);
              return { ...newQuarter, selected: existingQuarter?.selected ?? false };
            }),
          };
        })
      );
    } else {
      setTimePeriods([]);
    }
  }, [availableTimePeriods]);

  // Set indeterminate state for year checkboxes
  React.useEffect(() => {
    timePeriods.forEach(year => {
      const checkbox = checkboxRefs.current[year.id];
      if (checkbox) {
        const someQuartersSelected = year.quarters.some(q => q.selected);
        const allQuartersSelected = year.quarters.every(q => q.selected);
        checkbox.indeterminate = someQuartersSelected && !allQuartersSelected;
      }
    });
  }, [timePeriods]);

  // Update selection when initialSelection changes
  React.useEffect(() => {
    if (initialSelection) {
      setTimePeriods(prevPeriods =>
        prevPeriods.map(year => ({
          ...year,
          selected: initialSelection.years.includes(year.id),
          quarters: year.quarters.map(quarter => ({
            ...quarter,
            selected: initialSelection.quarters.includes(quarter.id)
          }))
        }))
      );
    }
  }, [initialSelection]);

  const handleYearToggle = (yearId: string) => {
    setTimePeriods(prevPeriods =>
      prevPeriods.map(year =>
        year.id === yearId ? { ...year, expanded: !year.expanded } : year
      )
    );
  };

  const handleYearSelect = (yearId: string) => {
    setTimePeriods(prevPeriods => {
      const updatedPeriods = prevPeriods.map(year => {
        if (year.id === yearId) {
          const allQuartersSelected = year.quarters.every(q => q.selected);
          const newSelected = !allQuartersSelected;
          return {
            ...year,
            selected: newSelected,
            quarters: year.quarters.map(quarter => ({ ...quarter, selected: newSelected })),
          };
        }
        return year;
      });
      // Notify parent after this commit (do not call inside updater - causes "setState during render" warning)
      const selectedYears = updatedPeriods.filter(y => y.selected).map(y => y.id);
      const selectedQuarters = updatedPeriods.flatMap(y => y.quarters).filter(q => q.selected).map(q => q.id);
      queueMicrotask(() => {
        onSelectionChange?.({ years: selectedYears, quarters: selectedQuarters });
      });
      return updatedPeriods;
    });
  };

  const handleQuarterSelect = (yearId: string, quarterId: string) => {
    setTimePeriods(prevPeriods => {
      const updatedPeriods = prevPeriods.map(year => {
        if (year.id === yearId) {
          const updatedQuarters = year.quarters.map(quarter =>
            quarter.id === quarterId ? { ...quarter, selected: !quarter.selected } : quarter
          );
          const allQuartersSelected = updatedQuarters.every(q => q.selected);
          return {
            ...year,
            selected: allQuartersSelected,
            quarters: updatedQuarters,
          };
        }
        return year;
      });
      const selectedYears = updatedPeriods.filter(y => y.selected).map(y => y.id);
      const selectedQuarters = updatedPeriods.flatMap(y => y.quarters).filter(q => q.selected).map(q => q.id);
      queueMicrotask(() => {
        onSelectionChange?.({ years: selectedYears, quarters: selectedQuarters });
      });
      return updatedPeriods;
    });
  };

  const handleSelectAll = () => {
    setTimePeriods(prevPeriods => {
      const updatedPeriods = prevPeriods.map(year => ({
        ...year,
        selected: true,
        quarters: year.quarters.map(quarter => ({ ...quarter, selected: true })),
      }));
      const selectedYears = updatedPeriods.map(y => y.id);
      const selectedQuarters = updatedPeriods.flatMap(y => y.quarters).map(q => q.id);
      queueMicrotask(() => {
        onSelectionChange?.({ years: selectedYears, quarters: selectedQuarters });
      });
      return updatedPeriods;
    });
  };

  const handleClear = () => {
    setTimePeriods(prevPeriods => {
      const updatedPeriods = prevPeriods.map(year => ({
        ...year,
        selected: false,
        quarters: year.quarters.map(quarter => ({ ...quarter, selected: false })),
      }));
      queueMicrotask(() => {
        onSelectionChange?.({ years: [], quarters: [] });
      });
      return updatedPeriods;
    });
  };

  return (
    <div className="bg-white border border-gray-200 shadow-sm w-[300px] min-w-[300px] max-w-[300px] h-[300px] flex flex-col rounded-md">
       {/* Header */}
       <div className="flex items-center justify-between p-3 border-b border-gray-100">
         <h3 className="text-sm font-semibold text-gray-900">Select Time Periods</h3>
         <div className="flex items-center space-x-2 text-xs">
           <button 
             onClick={handleSelectAll} 
             className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
           >
             Select all
           </button>
           <span className="text-gray-400">-</span>
           <button 
             onClick={handleClear} 
             className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
           >
             Clear
           </button>
           {onClose && (
             <>
               <span className="text-gray-400">-</span>
               <button 
                 onClick={onClose} 
                 className="text-green-600 hover:text-green-800 font-medium transition-colors"
               >
                 Done
               </button>
             </>
           )}
         </div>
       </div>

      {/* Time Period List - Seamless Vertical Scroll */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {timePeriods.length > 0 ? (
          timePeriods.map(year => (
            <div key={year.id} className="border-b border-gray-50 last:border-b-0">
              {/* Year Row */}
              <div className="flex items-center py-2 px-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="relative">
                    <input
                      type="checkbox"
                      ref={el => checkboxRefs.current[year.id] = el}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                      checked={year.selected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleYearSelect(year.id);
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{year.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 text-left min-w-0 flex-shrink-0">{year.dateRange}</span>
                  <button 
                    onClick={() => handleYearToggle(year.id)} 
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
                  >
                    {year.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>

               {/* Quarters List */}
               {year.expanded && (
                 <div className="pl-6 pr-3 py-1 bg-gray-50">
                   {year.quarters.map(quarter => (
                     <div key={quarter.id} className="flex items-center py-1.5 hover:bg-gray-100 transition-colors">
                       <div className="flex items-center space-x-2 flex-1">
                         <input
                           type="checkbox"
                           className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                           checked={quarter.selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleQuarterSelect(year.id, quarter.id);
                          }}
                         />
                         <span className="text-sm text-gray-700 text-left">{quarter.name} -- ({quarter.dateRange})</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-8 px-4">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <Calendar className="h-8 w-8 mx-auto" />
              </div>
              <p className="text-sm text-gray-500">No time periods available</p>
              <p className="text-xs text-gray-400 mt-1">Please check your OKR cycles configuration</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimePeriods;
