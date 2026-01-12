import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, Plus } from 'lucide-react';

interface PayrollExpenseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  periodFilter: string;
  onPeriodChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onExport: () => void;
}

export const PayrollExpenseFilters = ({
  searchTerm,
  onSearchChange,
  periodFilter,
  onPeriodChange,
  statusFilter,
  onStatusChange,
  onExport
}: PayrollExpenseFiltersProps) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm mb-2 p-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
          <Input
            placeholder="Search employees or payroll periods..."
            className="pl-7 h-7 text-xs border-slate-200 focus:border-blue-400"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filters */}
        <Select value={periodFilter} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[140px] h-7 text-xs border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-periods">All Periods</SelectItem>
            <SelectItem value="current">Current Period</SelectItem>
            <SelectItem value="previous">Previous Period</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[120px] h-7 text-xs border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
          </SelectContent>
        </Select>

        {/* Action Buttons */}
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          <Filter className="h-3 w-3 mr-1" />
          More Filters
        </Button>

        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onExport}>
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>

        <Button size="sm" className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700">
          <Plus className="h-3 w-3 mr-1" />
          Add Entry
        </Button>
      </div>
    </div>
  );
};
