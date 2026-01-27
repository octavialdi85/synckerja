
import React, { useState } from 'react';
import { Search, Filter, Plus, FileText } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useKOLCampaignAssignments } from '@/hooks/organized/utils';
import { useEnhancedKOLContentPosts } from '../hooks/useEnhancedKOLContentPosts';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';
import AddContentPostModal from '../modals/AddContentPostModal';

export const KOLContentPostFilters = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { assignments } = useKOLCampaignAssignments();
  
  // Ensure assignments is always an array
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const { createContentPostWithPayment, isCreating } = useEnhancedKOLContentPosts();

  const handleCreatePost = async (data: any) => {
    await createContentPostWithPayment(data);
  };

  return (
    <>
      <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/60 p-3 mb-3 shadow-sm">
        {/* Header Section with Title and Add Button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">KOL Content Posts</h1>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Plus className="w-4 h-4" />
              Create Content Post & Agreement
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search content posts..."
              className="pl-8 pr-3 py-2 text-xs border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {safeAssignments.map((assignment) => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  {assignment.campaign.name} - {assignment.kol_profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="reel">Reel</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="live">Live</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs border-slate-200 hover:bg-slate-50"
          >
            <Filter className="h-3 w-3 mr-1" />
            More Filters
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs border-slate-200 hover:bg-slate-50"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Enhanced Modal with Payment Terms */}
      <AddContentPostModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleCreatePost}
        isLoading={isCreating}
      />
    </>
  );
};
