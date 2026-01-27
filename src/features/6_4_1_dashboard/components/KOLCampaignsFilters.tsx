
import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import CreateCampaignModal from '../modals/CreateCampaignModal';

const KOLCampaignsFilters = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/60 p-3 mb-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search campaigns..."
              className="pl-8 pr-3 py-2 text-xs h-8 border-slate-200/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200/60">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Budget Range Filter */}
          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200/60">
              <SelectValue placeholder="Budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Budget</SelectItem>
              <SelectItem value="low">&lt; $10K</SelectItem>
              <SelectItem value="medium">$10K - $50K</SelectItem>
              <SelectItem value="high">&gt; $50K</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200/60">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Button */}
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-slate-200/60">
            Clear
          </Button>

          {/* New Campaign Button */}
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white ml-auto"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Campaign
          </Button>
        </div>
      </div>

      <CreateCampaignModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </>
  );
};

export default KOLCampaignsFilters;
