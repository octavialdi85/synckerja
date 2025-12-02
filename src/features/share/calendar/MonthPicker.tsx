import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/features/ui/button"
import { format, addMonths, subMonths, startOfMonth, isSameMonth } from "date-fns"
import { id as idLocale } from "date-fns/locale"

export interface MonthPickerProps {
  selected?: Date | null
  onSelect?: (date: Date) => void
  className?: string
  disabled?: boolean
}

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

function MonthPicker({
  selected,
  onSelect,
  className,
  disabled = false,
}: MonthPickerProps) {
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear())
  const [viewingMonth, setViewingMonth] = React.useState(new Date())

  // Initialize viewing month from selected date if available
  React.useEffect(() => {
    if (selected) {
      setViewingMonth(selected)
      setCurrentYear(selected.getFullYear())
    }
  }, [selected])

  const handlePreviousYear = () => {
    setCurrentYear(currentYear - 1)
    setViewingMonth(new Date(currentYear - 1, viewingMonth.getMonth(), 1))
  }

  const handleNextYear = () => {
    setCurrentYear(currentYear + 1)
    setViewingMonth(new Date(currentYear + 1, viewingMonth.getMonth(), 1))
  }

  const handleMonthClick = (monthIndex: number) => {
    if (disabled) return
    const selectedDate = startOfMonth(new Date(currentYear, monthIndex, 1))
    setViewingMonth(selectedDate)
    onSelect?.(selectedDate)
  }

  return (
    <div
      className={cn("month-picker p-4 bg-white rounded-lg shadow-sm border border-gray-200 mx-auto", className)}
      style={{ width: 'fit-content', minWidth: '320px' }}
    >
      {/* Header with year navigation */}
      <div className="flex justify-center items-center mb-4">
        <button
          type="button"
          onClick={handlePreviousYear}
          disabled={disabled}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-white p-0 hover:bg-gray-50 transition-all duration-200 border-gray-200 hover:border-gray-300 rounded-md shadow-sm flex items-center justify-center mr-2",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-4 w-4 text-gray-700" />
        </button>
        <span className="text-lg font-semibold text-gray-800 mx-4 min-w-[80px] text-center">
          {currentYear}
        </span>
        <button
          type="button"
          onClick={handleNextYear}
          disabled={disabled}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-white p-0 hover:bg-gray-50 transition-all duration-200 border-gray-200 hover:border-gray-300 rounded-md shadow-sm flex items-center justify-center ml-2",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-4 w-4 text-gray-700" />
        </button>
      </div>

      {/* Months grid */}
      <div className="grid grid-cols-3 gap-2">
        {months.map((monthName, monthIndex) => {
          const monthDate = new Date(currentYear, monthIndex, 1)
          const isSelected = selected && isSameMonth(monthDate, selected)
          const isCurrentMonth = isSameMonth(monthDate, new Date())

          return (
            <button
              key={monthIndex}
              type="button"
              onClick={() => handleMonthClick(monthIndex)}
              disabled={disabled}
              className={cn(
                "h-12 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 border",
                "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                // Default styling
                !isSelected && !isCurrentMonth && "border-gray-200 text-gray-700 bg-white",
                // Current month styling (not selected)
                isCurrentMonth && !isSelected && "border-blue-300 text-blue-700 bg-blue-50",
                // Selected month styling
                isSelected && "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 font-semibold shadow-md",
                // Disabled styling
                disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {monthName}
            </button>
          )
        })}
      </div>
    </div>
  )
}

MonthPicker.displayName = "MonthPicker"

export { MonthPicker }

