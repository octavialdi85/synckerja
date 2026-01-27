import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Badge } from '@/features/ui/badge';
import { format } from 'date-fns';
import { Calendar, DollarSign, Target, Users, User } from 'lucide-react';
import { KOLCampaign } from '@/hooks/useKOLCampaigns';

interface CampaignDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: KOLCampaign | null;
}

const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({
  open,
  onOpenChange,
  campaign,
}) => {
  if (!campaign) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{campaign.name}</span>
            <Badge className={getStatusColor(campaign.status)}>
              {campaign.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Campaign Name</label>
                <p className="text-sm text-gray-900 mt-1">{campaign.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-600 mt-1">
                  {campaign.description || 'No description provided'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Objectives</label>
                <p className="text-sm text-gray-600 mt-1">
                  {campaign.objectives || 'No objectives specified'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {campaign.start_date ? format(new Date(campaign.start_date), 'PPP') : 'Not specified'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {campaign.end_date ? format(new Date(campaign.end_date), 'PPP') : 'Not specified'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Created By
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {campaign.creator_name || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Budget Information */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700">Campaign Budget</label>
                <p className="text-xl font-semibold text-blue-600 mt-1">
                  {campaign.budget ? `$${campaign.budget.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700">Total Budget</label>
                <p className="text-xl font-semibold text-green-600 mt-1">
                  {campaign.total_budget ? `$${campaign.total_budget.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700">Allocated Budget</label>
                <p className="text-xl font-semibold text-purple-600 mt-1">
                  {campaign.allocated_budget ? `$${campaign.allocated_budget.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Target Metrics */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Target Reach
                </label>
                <p className="text-xl font-semibold text-orange-600 mt-1">
                  {campaign.target_reach ? campaign.target_reach.toLocaleString() : 'Not specified'}
                </p>
              </div>
              
              <div className="p-4 bg-pink-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700">Target Engagement</label>
                <p className="text-xl font-semibold text-pink-600 mt-1">
                  {campaign.target_engagement ? `${campaign.target_engagement}%` : 'Not specified'}
                </p>
              </div>
              
              <div className="p-4 bg-indigo-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700">Target Conversion</label>
                <p className="text-xl font-semibold text-indigo-600 mt-1">
                  {campaign.target_conversion ? campaign.target_conversion.toLocaleString() : 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="border-t pt-4 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Created: {format(new Date(campaign.created_at), 'PPp')}</span>
              <span>Updated: {format(new Date(campaign.updated_at), 'PPp')}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignDetailsModal;
