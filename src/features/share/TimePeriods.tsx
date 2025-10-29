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
      console.log('🔍 TimePeriods: availableTimePeriods changed:', availableTimePeriods);
      setTimePeriods(prevPeriods => {
        console.log('🔍 TimePeriods: useEffect - Before merge, prevPeriods:', prevPeriods.map(y => ({ 
          id: y.id, 
          selected: y.selected, 
          quarters: y.quarters.map(q => ({ id: q.id, selected: q.selected }))
        })));
        
        const merged = availableTimePeriods.map(newYear => {
          const existingYear = prevPeriods.find(p => p.id === newYear.id);
          const result = {
            ...newYear,
            selected: existingYear?.selected || false,
            expanded: existingYear?.expanded || false,
            quarters: newYear.quarters.map(newQuarter => {
              const existingQuarter = existingYear?.quarters.find(q => q.id === newQuarter.id);
              return {
                ...newQuarter,
                selected: existingQuarter?.selected || false
              };
            })
          };
          
          console.log('🔍 TimePeriods: useEffect - Merged year:', result.id, 'Selected:', result.selected, 'Quarters:', result.quarters.map(q => ({ id: q.id, selected: q.selected })));
          return result;
        });
        
        console.log('🔍 TimePeriods: useEffect - Final merged result:', merged.map(y => ({ 
          id: y.id, 
          selected: y.selected, 
          quartersSelected: y.quarters.filter(q => q.selected).length
        })));
        
        return merged;
      });
    } else {
      // Clear timePeriods if no data available
      setTimePeriods([]);
    }
  }, [availableTimePeriods]);

  // Debug current timePeriods state
  React.useEffect(() => {
    console.log('🔍 TimePeriods: Current timePeriods state:', timePeriods);
  }, [timePeriods]);

  // Set indeterminate state for year checkboxes
  React.useEffect(() => {
    timePeriods.forEach(year => {
      const checkbox = checkboxRefs.current[year.id];
      if (checkbox) {
        const someQuartersSelected = year.quarters.some(q => q.selected);
        const allQuartersSelected = year.quarters.every(q => q.selected);
        
        // Set indeterminate if some quarters are selected but not all
        checkbox.indeterminate = someQuartersSelected && !allQuartersSelected;
        console.log(`🔍 TimePeriods: Setting indeterminate for year ${year.id}: ${checkbox.indeterminate} (some: ${someQuartersSelected}, all: ${allQuartersSelected})`);
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
    console.log('🔍 TimePeriods: handleYearSelect called for year:', yearId);
    setTimePeriods(prevPeriods => {
      console.log('🔍 TimePeriods: Before update - All periods:', prevPeriods.map(y => ({ 
        id: y.id, 
        selected: y.selected, 
        quarters: y.quarters.map(q => ({ id: q.id, selected: q.selected }))
      })));
      
      const updatedPeriods = prevPeriods.map(year => {
        if (year.id === yearId) {
          console.log('🔍 TimePeriods: Before update - Target Year:', year.id, 'Selected:', year.selected, 'Quarters:', year.quarters.map(q => ({ id: q.id, selected: q.selected })));

          const someQuartersSelected = year.quarters.some(q => q.selected);
          const allQuartersSelected = year.quarters.every(q => q.selected);
          
          // If year is in strip state or not selected, select all quarters
          // If year is fully selected, deselect all quarters
          const newSelected = !allQuartersSelected;
          
          console.log('🔍 TimePeriods: Year selection calculation:', { 
            yearId, 
            oldSelected: year.selected, 
            newSelected,
            someQuartersSelected,
            allQuartersSelected,
            quarters: year.quarters.map(q => ({ id: q.id, selected: q.selected }))
          });
          
          const updatedYear = {
            ...year,
            selected: newSelected,
            quarters: year.quarters.map(quarter => ({ ...quarter, selected: newSelected })),
          };
          
          console.log('🔍 TimePeriods: After update - Updated Year:', updatedYear.id, 'Selected:', updatedYear.selected, 'Quarters:', updatedYear.quarters.map(q => ({ id: q.id, selected: q.selected })));
          
          // Notify parent component
          if (onSelectionChange) {
            const selectedYears = prevPeriods
              .filter(y => y.id === yearId ? newSelected : y.selected)
              .map(y => y.id);
            const selectedQuarters = prevPeriods
              .flatMap(y => y.id === yearId ? updatedYear.quarters : y.quarters)
              .filter(q => q.selected)
              .map(q => q.id);
            console.log('🔍 TimePeriods: Notifying parent with selection:', { years: selectedYears, quarters: selectedQuarters });
            onSelectionChange({ years: selectedYears, quarters: selectedQuarters });
          }
          
          return updatedYear;
        }
        return year;
      });
      
      console.log('🔍 TimePeriods: Final updated periods state:', updatedPeriods.map(y => ({ 
        id: y.id, 
        selected: y.selected, 
        quartersSelected: y.quarters.filter(q => q.selected).length,
        totalQuarters: y.quarters.length
      })));
      
      return updatedPeriods;
    });
  };

  const handleQuarterSelect = (yearId: string, quarterId: string) => {
    console.log('🔍 TimePeriods: handleQuarterSelect called for:', { yearId, quarterId });
    setTimePeriods(prevPeriods => {
      const updatedPeriods = prevPeriods.map(year => {
        if (year.id === yearId) {
          const updatedQuarters = year.quarters.map(quarter =>
            quarter.id === quarterId ? { ...quarter, selected: !quarter.selected } : quarter
          );
          const allQuartersSelected = updatedQuarters.every(q => q.selected);
          const someQuartersSelected = updatedQuarters.some(q => q.selected);
          
          console.log('🔍 TimePeriods: Quarter selection changed:', { 
            quarterId, 
            allQuartersSelected, 
            someQuartersSelected 
          });
          
          // Set year selection based on quarters:
          // - If all quarters selected: year.selected = true
          // - If some quarters selected: year.selected = false (strip state)
          // - If no quarters selected: year.selected = false
          const updatedYear = {
            ...year,
            selected: allQuartersSelected,
            quarters: updatedQuarters,
          };
          
          // Notify parent component
          if (onSelectionChange) {
            const selectedYears = prevPeriods
              .filter(y => y.id === yearId ? allQuartersSelected : y.selected)
              .map(y => y.id);
            const selectedQuarters = prevPeriods
              .flatMap(y => y.id === yearId ? updatedQuarters : y.quarters)
              .filter(q => q.selected)
              .map(q => q.id);
            console.log('🔍 TimePeriods: Notifying parent with quarter selection:', { years: selectedYears, quarters: selectedQuarters });
            onSelectionChange({ years: selectedYears, quarters: selectedQuarters });
          }
          
          return updatedYear;
        }
        return year;
      });
      console.log('🔍 TimePeriods: Updated periods after quarter selection:', updatedPeriods);
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
      
      // Notify parent component
      if (onSelectionChange) {
        const selectedYears = updatedPeriods.map(y => y.id);
        const selectedQuarters = updatedPeriods.flatMap(y => y.quarters).map(q => q.id);
        onSelectionChange({ years: selectedYears, quarters: selectedQuarters });
      }
      
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
      
      // Notify parent component
      if (onSelectionChange) {
        onSelectionChange({ years: [], quarters: [] });
      }
      
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
                        console.log('🔍 TimePeriods: Year checkbox clicked:', year.id, 'current selected:', year.selected);
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
                             console.log('🔍 TimePeriods: Quarter checkbox clicked:', quarter.id, 'current selected:', quarter.selected);
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
