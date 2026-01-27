import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import { Badge } from '@/features/ui/badge';
import { Calendar, Package, User, Clock } from 'lucide-react';
import { useCampaignDeliverables } from '@/hooks/organized/useCampaignDeliverables';
import { useKOLContentPosts } from '@/hooks/organized/utils';
import { useKOLCampaignAssignments } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';
import { useCurrentOrg } from '@/hooks/organized/utils';

interface KOLProfile {
  id: string;
  name: string;
  email?: string;
  profile_photo_url?: string;
  category?: string;
  followers_count?: number;
}

interface DeliverableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  kolProfile: KOLProfile;
  onDeliverableSet: () => void;
}

const DeliverableModal: React.FC<DeliverableModalProps> = ({
  open,
  onOpenChange,
  campaignId,
  kolProfile,
  onDeliverableSet
}) => {
  const [formData, setFormData] = useState({
    deliverable_type: '',
    platform: '',
    quantity: 1,
    description: '',
    due_date: '',
    status: 'pending' as const
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createDeliverable } = useCampaignDeliverables();
  const { createContentPost } = useKOLContentPosts();
  const { assignments } = useKOLCampaignAssignments();
  const { toast } = useToast();
  const { currentOrg } = useCurrentOrg();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.deliverable_type || !formData.platform) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!currentOrg?.id) {
      toast({
        title: "Error",
        description: "Organization not found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Step 1: Create deliverable
      const deliverableData = {
        campaign_id: campaignId,
        kol_profile_id: kolProfile.id,
        deliverable_type: formData.deliverable_type,
        content_type: formData.deliverable_type,
        platform: formData.platform,
        quantity: formData.quantity,
        description: formData.description,
        due_date: formData.due_date || undefined,
        status: formData.status,
        organization_id: currentOrg.id,
      };

      console.log('Creating deliverable:', deliverableData);
      
      const createdDeliverable = await createDeliverable.mutateAsync(deliverableData);
      
      // Step 2: Find the campaign assignment
      const campaignAssignment = assignments.find(
        assignment => assignment.campaign_id === campaignId && assignment.kol_profile_id === kolProfile.id
      );

      if (!campaignAssignment) {
        console.error('Campaign assignment not found! Cannot create content posts without a valid assignment.');
        toast({
          title: "Error",
          description: "Campaign assignment not found. Please ensure the KOL is assigned to this campaign first.",
          variant: "destructive",
        });
        return;
      }

      // Step 3: Create multiple content posts based on quantity
      const contentPostPromises = [];
      
      for (let i = 0; i < formData.quantity; i++) {
        const contentPostData = {
          campaign_assignment_id: campaignAssignment.id, // Now guaranteed to exist
          organization_id: currentOrg.id, 
          kol_profile_id: kolProfile.id,  
          campaign_id: campaignId,        
          platform: formData.platform.toLowerCase(),
          content_type: formData.deliverable_type.toLowerCase(),
          status: 'draft' as const,
          campaign_deliverable_id: createdDeliverable.id, // Link to the deliverable
          post_date: formData.due_date || undefined,
          caption: formData.description ? `${formData.description} ${formData.quantity > 1 ? `(${i + 1}/${formData.quantity})` : ''}` : undefined,
        };

        console.log(`Creating content post ${i + 1}/${formData.quantity}:`, contentPostData);
        
        contentPostPromises.push(createContentPost(contentPostData));
      }

      // Wait for all content posts to be created
      await Promise.all(contentPostPromises);

      toast({
        title: "Success",
        description: `Deliverable and ${formData.quantity} content post${formData.quantity > 1 ? 's' : ''} have been created successfully`,
      });
      
      onDeliverableSet();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        deliverable_type: '',
        platform: '',
        quantity: 1,
        description: '',
        due_date: '',
        status: 'pending'
      });
    } catch (error) {
      console.error('Error creating deliverable and content posts:', error);
      toast({
        title: "Error",
        description: "Failed to create deliverable and content posts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformOptions = [
    'Instagram', 'TikTok', 'YouTube', 'Twitter', 'Facebook', 'LinkedIn', 'Other'
  ];

  const contentTypeOptions = [
    'Post', 'Story', 'Video', 'Reel', 'Article', 'Live Stream', 'Review', 'Tutorial'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Set Deliverable Requirements
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* KOL Profile Display */}
          <div className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/20">
            <Avatar className="w-12 h-12">
              <AvatarImage src={kolProfile.profile_photo_url} />
              <AvatarFallback>
                {kolProfile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{kolProfile.name}</h3>
              <p className="text-sm text-muted-foreground">{kolProfile.email}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {kolProfile.category || 'General'}
                </Badge>
                {kolProfile.followers_count && (
                  <Badge variant="outline" className="text-xs">
                    {kolProfile.followers_count.toLocaleString()} followers
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Deliverable Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="content_type">Content Type *</Label>
                <Select 
                  value={formData.deliverable_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, deliverable_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypeOptions.map(type => (
                      <SelectItem key={type} value={type.toLowerCase()}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="platform">Platform *</Label>
                <Select 
                  value={formData.platform} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformOptions.map(platform => (
                      <SelectItem key={platform} value={platform.toLowerCase()}>
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will create {formData.quantity} content post{formData.quantity > 1 ? 's' : ''} in the Content Post tab
                </p>
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the deliverable requirements..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.deliverable_type || !formData.platform}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? 'Creating...' : 'Set Deliverable'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliverableModal;
