

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/organized/utils';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useKOLCampaignOptions } from '@/hooks/organized/utils';

interface KOLRatingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  kolId: string;
  kolName: string;
}

const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 cursor-pointer ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => onRatingChange(star)}
        />
      ))}
    </div>
  );
};

export const KOLRatingsModal: React.FC<KOLRatingsModalProps> = ({
  isOpen,
  onClose,
  kolId,
  kolName
}) => {
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();
  const { data: campaigns = [], isLoading: campaignsLoading } = useKOLCampaignOptions();
  
  const [formData, setFormData] = useState({
    overall_rating: 5,
    professionalism_rating: 5,
    communication_rating: 5,
    content_quality_rating: 5,
    audience_engagement_rating: 5,
    brand_alignment_rating: 5,
    adherence_to_brief_rating: 5,
    roi_rating: 5,
    satisfaction_rating: 5,
    feedback: '',
    collaboration_highlights: '',
    areas_for_improvement: '',
    would_collaborate_again: true
  });

  const [campaignId, setCampaignId] = useState('no-campaign');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationId) {
      toast({
        title: 'Error',
        description: 'Organization not found',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Get the current user session and refresh if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast({
          title: 'Authentication Error',
          description: 'Please refresh the page and try again',
          variant: 'destructive'
        });
        return;
      }

      if (!session?.user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to submit a rating',
          variant: 'destructive'
        });
        return;
      }

      console.log('Current user:', session.user.id);

      const ratingData = {
        kol_profile_id: kolId,
        organization_id: organizationId,
        campaign_id: campaignId === 'no-campaign' ? null : campaignId,
        overall_rating: formData.overall_rating,
        professionalism_rating: formData.professionalism_rating,
        communication_rating: formData.communication_rating,
        content_quality_rating: formData.content_quality_rating,
        audience_engagement_rating: formData.audience_engagement_rating,
        brand_alignment_rating: formData.brand_alignment_rating,
        adherence_to_brief_rating: formData.adherence_to_brief_rating,
        roi_rating: formData.roi_rating,
        satisfaction_rating: formData.satisfaction_rating,
        feedback: formData.feedback,
        collaboration_highlights: formData.collaboration_highlights,
        areas_for_improvement: formData.areas_for_improvement,
        would_collaborate_again: formData.would_collaborate_again,
        rated_by: session.user.id
      };

      console.log('Submitting rating data:', ratingData);

      const { data, error } = await supabase
        .from('kol_ratings')
        .insert(ratingData)
        .select();

      if (error) {
        console.error('Error adding rating:', error);
        toast({
          title: 'Error',
          description: `Failed to add rating: ${error.message}`,
          variant: 'destructive'
        });
        return;
      }

      console.log('Rating added successfully:', data);

      toast({
        title: 'Success',
        description: 'Rating added successfully'
      });

      onClose();
      
      // Reset form
      setFormData({
        overall_rating: 5,
        professionalism_rating: 5,
        communication_rating: 5,
        content_quality_rating: 5,
        audience_engagement_rating: 5,
        brand_alignment_rating: 5,
        adherence_to_brief_rating: 5,
        roi_rating: 5,
        satisfaction_rating: 5,
        feedback: '',
        collaboration_highlights: '',
        areas_for_improvement: '',
        would_collaborate_again: true
      });
      setCampaignId('no-campaign');
      
    } catch (error) {
      console.error('Error adding rating:', error);
      toast({
        title: 'Error',
        description: 'Failed to add rating. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate KOL: {kolName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="campaign_id">Campaign (Optional)</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder={campaignsLoading ? "Loading campaigns..." : "Select a campaign or leave empty"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-campaign">No Campaign</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating Fields */}
          <div className="space-y-4">
            <div>
              <Label>Overall Rating</Label>
              <StarRating 
                rating={formData.overall_rating} 
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, overall_rating: rating }))}
              />
            </div>

            <div>
              <Label>Professionalism</Label>
              <StarRating 
                rating={formData.professionalism_rating} 
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, professionalism_rating: rating }))}
              />
            </div>

            <div>
              <Label>Communication</Label>
              <StarRating 
                rating={formData.communication_rating} 
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, communication_rating: rating }))}
              />
            </div>

            <div>
              <Label>Content Quality</Label>
              <StarRating 
                rating={formData.content_quality_rating} 
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, content_quality_rating: rating }))}
              />
            </div>

            <div>
              <Label>Audience Engagement</Label>
              <StarRating 
                rating={formData.audience_engagement_rating} 
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, audience_engagement_rating: rating }))}
              />
            </div>

            <div>
              <Label>Brand Alignment</Label>
              <StarRating 
                rating={formData.brand_alignment_rating} 
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, brand_alignment_rating: rating }))}
              />
            </div>

            <div>
              <Label>Adherence to Brief</Label>
              <StarRating 
                rating={formData.adherence_to_brief_rating} 
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, adherence_to_brief_rating: rating }))}
              />
            </div>
          </div>

          {/* ROI Rating */}
          <div>
            <Label>ROI Rating</Label>
            <RadioGroup 
              value={formData.roi_rating.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, roi_rating: parseInt(value) }))}
              className="flex flex-row gap-4"
            >
              {['1', '2', '3', '4', '5'].map((value) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`roi-${value}`} />
                  <Label htmlFor={`roi-${value}`}>{value}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Satisfaction Rating */}
          <div>
            <Label>Satisfaction Rating</Label>
            <RadioGroup 
              value={formData.satisfaction_rating.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, satisfaction_rating: parseInt(value) }))}
              className="flex flex-row gap-4"
            >
              {['1', '2', '3', '4', '5'].map((value) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`satisfaction-${value}`} />
                  <Label htmlFor={`satisfaction-${value}`}>{value}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Text Fields */}
          <div>
            <Label htmlFor="feedback">General Feedback</Label>
            <Textarea
              id="feedback"
              value={formData.feedback}
              onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
              placeholder="Provide general feedback about the collaboration"
            />
          </div>

          <div>
            <Label htmlFor="collaboration_highlights">Collaboration Highlights</Label>
            <Textarea
              id="collaboration_highlights"
              value={formData.collaboration_highlights}
              onChange={(e) => setFormData(prev => ({ ...prev, collaboration_highlights: e.target.value }))}
              placeholder="What went well in this collaboration?"
            />
          </div>

          <div>
            <Label htmlFor="areas_for_improvement">Areas for Improvement</Label>
            <Textarea
              id="areas_for_improvement"
              value={formData.areas_for_improvement}
              onChange={(e) => setFormData(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
              placeholder="What could be improved in future collaborations?"
            />
          </div>

          {/* Would Collaborate Again */}
          <div>
            <Label>Would you collaborate again?</Label>
            <RadioGroup 
              value={formData.would_collaborate_again.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, would_collaborate_again: value === 'true' }))}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="collaborate-yes" />
                <Label htmlFor="collaborate-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="collaborate-no" />
                <Label htmlFor="collaborate-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Submit Rating
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

