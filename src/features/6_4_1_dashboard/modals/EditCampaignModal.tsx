import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { KOLCampaign, useKOLCampaigns } from '../hooks/useKOLCampaigns';
import { Loader2 } from 'lucide-react';

interface EditCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: KOLCampaign | null;
}

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  open,
  onOpenChange,
  campaign,
}) => {
  const { updateCampaign } = useKOLCampaigns();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objectives: '',
    budget: '',
    total_budget: '',
    allocated_budget: '',
    target_reach: '',
    target_engagement: '',
    target_conversion: '',
    start_date: '',
    end_date: '',
    status: 'draft' as 'draft' | 'active' | 'completed' | 'cancelled',
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        objectives: campaign.objectives || '',
        budget: campaign.budget?.toString() || '',
        total_budget: campaign.total_budget?.toString() || '',
        allocated_budget: campaign.allocated_budget?.toString() || '',
        target_reach: campaign.target_reach?.toString() || '',
        target_engagement: campaign.target_engagement?.toString() || '',
        target_conversion: campaign.target_conversion?.toString() || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        status: campaign.status,
      });
    }
  }, [campaign]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    const updateData = {
      id: campaign.id,
      name: formData.name,
      description: formData.description || null,
      objectives: formData.objectives || null,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
      allocated_budget: formData.allocated_budget ? parseFloat(formData.allocated_budget) : null,
      target_reach: formData.target_reach ? parseInt(formData.target_reach) : null,
      target_engagement: formData.target_engagement ? parseInt(formData.target_engagement) : null,
      target_conversion: formData.target_conversion ? parseInt(formData.target_conversion) : null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: formData.status,
    };

    updateCampaign.mutate(updateData, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="objectives">Objectives</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => handleInputChange('objectives', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Budget Information */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Budget Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="budget">Campaign Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="total_budget">Total Budget ($)</Label>
                <Input
                  id="total_budget"
                  type="number"
                  step="0.01"
                  value={formData.total_budget}
                  onChange={(e) => handleInputChange('total_budget', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="allocated_budget">Allocated Budget ($)</Label>
                <Input
                  id="allocated_budget"
                  type="number"
                  step="0.01"
                  value={formData.allocated_budget}
                  onChange={(e) => handleInputChange('allocated_budget', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Target Metrics */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Target Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="target_reach">Target Reach</Label>
                <Input
                  id="target_reach"
                  type="number"
                  value={formData.target_reach}
                  onChange={(e) => handleInputChange('target_reach', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="target_engagement">Target Engagement (%)</Label>
                <Input
                  id="target_engagement"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.target_engagement}
                  onChange={(e) => handleInputChange('target_engagement', e.target.value)}
                  placeholder="e.g. 15.5"
                />
                <p className="text-xs text-slate-500 mt-1">Enter engagement rate as percentage (0-100%)</p>
              </div>

              <div>
                <Label htmlFor="target_conversion">Target Conversion</Label>
                <Input
                  id="target_conversion"
                  type="number"
                  value={formData.target_conversion}
                  onChange={(e) => handleInputChange('target_conversion', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCampaign.isPending}>
              {updateCampaign.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Campaign
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCampaignModal;
