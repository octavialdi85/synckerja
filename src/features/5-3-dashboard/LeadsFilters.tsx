import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Button } from '@/features/ui/button';
import { Search, Plus, MoreVertical, Download, RefreshCw } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { StatusManagement } from './StatusManagement';
import { DateRangeFilter } from './DateRangeFilter';
import { EmployeeDropdown } from '@/features/ui/employee-dropdown';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { generateLeadsPDF } from './LeadsPDFGenerator';
import { NewLead } from '@/types/leads';

interface LeadStatus {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface LeadSource {
  id: string;
  name: string;
  description?: string;
}

interface Service {
  id: string;
  name: string;
}

interface SubService {
  id: string;
  name: string;
  service_id: string;
}

export interface LeadsFilters {
  dataCompleteness: 'all' | 'full' | 'partial' | 'empty';
  services: string;
  category: string;
  assignee: string;
  fuPriority: string;
  status: string;
  source: string;
  dateRange: DateRange | null;
  search?: string;
}

interface LeadsFiltersProps {
  onNewLeadClick: () => void;
  onFiltersChange: (filters: LeadsFilters) => void;
  filteredLeads?: NewLead[];
  filters?: LeadsFilters;
}

export const LeadsFilters = ({ onNewLeadClick, onFiltersChange, filteredLeads = [], filters: externalFilters }: LeadsFiltersProps) => {
  const [statusManagementOpen, setStatusManagementOpen] = useState(false);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [subServices, setSubServices] = useState<SubService[]>([]);
  const [filters, setFilters] = useState<LeadsFilters>(externalFilters || {
    dataCompleteness: 'all',
    services: 'all',
    category: 'all',
    assignee: 'all',
    fuPriority: 'all',
    status: 'all',
    source: 'all',
    dateRange: null,
    search: ''
  });

  const fetchLeadStatuses = async () => {
    const { data, error } = await supabase
      .from('lead_statuses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data) {
      setLeadStatuses(data);
    }
  };

  const fetchLeadSources = async () => {
    const { data, error } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setLeadSources(data);
    }
  };

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setServices(data);
    }
  };

  const fetchSubServices = async () => {
    const { data, error } = await supabase
      .from('sub_services')
      .select('id, name, service_id')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setSubServices(data);
    }
  };

  const updateFilters = (key: keyof LeadsFilters, value: string | DateRange | null) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClear = () => {
    const clearedFilters: LeadsFilters = {
      dataCompleteness: 'all',
      services: 'all',
      category: 'all',
      assignee: 'all',
      fuPriority: 'all',
      status: 'all',
      source: 'all',
      dateRange: null,
      search: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  useEffect(() => {
    fetchLeadStatuses();
    fetchLeadSources();
    fetchServices();
    fetchSubServices();
  }, []);

  useEffect(() => {
    if (externalFilters) {
      setFilters(externalFilters);
    }
  }, [externalFilters]);

  return (
    <>
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 z-10" />
          <Input
            type="text"
            placeholder="Search leads..."
            value={filters.search || ''}
            onChange={(e) => updateFilters('search', e.target.value)}
            className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Date Range Filter */}
        <div className="min-w-[180px]">
          <DateRangeFilter
            onDateRangeChange={(range) => updateFilters('dateRange', range)}
            className="h-9 text-sm"
          />
        </div>

        {/* Source Filter */}
        <Select value={filters.source} onValueChange={(value) => updateFilters('source', value)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {leadSources.map((source) => (
              <SelectItem key={source.id} value={source.name}>
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Data Completeness Filter */}
        <Select value={filters.dataCompleteness} onValueChange={(value) => updateFilters('dataCompleteness', value as any)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Data Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Data</SelectItem>
            <SelectItem value="full">Complete Data</SelectItem>
            <SelectItem value="partial">Incomplete Data</SelectItem>
            <SelectItem value="empty">No Data Filled</SelectItem>
          </SelectContent>
        </Select>

        {/* Services Filter */}
        <Select value={filters.services} onValueChange={(value) => updateFilters('services', value)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.name}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={filters.category} onValueChange={(value) => updateFilters('category', value)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {subServices.map((subService) => (
              <SelectItem key={subService.id} value={subService.name}>
                {subService.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee Filter */}
        <div className="min-w-[120px]">
          <EmployeeDropdown
            value={filters.assignee}
            onValueChange={(value) => updateFilters('assignee', value)}
            placeholder="Assignee"
            triggerClassName="h-9 text-sm text-gray-700"
            allOptionLabel="All Assignees"
            includeAllOption={true}
          />
        </div>

        {/* FU Priority Filter */}
        <Select value={filters.fuPriority} onValueChange={(value) => updateFilters('fuPriority', value)}>
          <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
            <SelectValue placeholder="FU Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="Please Follow Up">Please Follow Up</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter with CRUD */}
        <div className="flex items-center gap-1">
          <Select value={filters.status} onValueChange={(value) => updateFilters('status', value)}>
            <SelectTrigger className="w-full sm:w-36 lg:w-40 h-9 text-sm text-gray-700 placeholder:text-gray-700 text-left">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {leadStatuses.map((status) => (
                <SelectItem key={status.id} value={status.name}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusManagementOpen(true)}>
                Manage Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={handleClear}
          className="h-9 px-3 hover:bg-gray-100 rounded-md transition-colors border border-gray-300 flex items-center justify-center"
          title="Clear all filters"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>

        {/* Download PDF Button */}
        <Button 
          onClick={() => generateLeadsPDF({ leads: filteredLeads, filters })}
          variant="outline"
          className="h-9 px-3 text-sm"
        >
          <Download className="h-4 w-4 mr-1" />
          Download PDF
        </Button>

        {/* New Lead Button */}
        <Button 
          onClick={onNewLeadClick}
          className="h-9 px-3 text-sm bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Lead
        </Button>
      </div>

      <StatusManagement 
        open={statusManagementOpen} 
        onOpenChange={setStatusManagementOpen} 
      />
    </>
  );
};
