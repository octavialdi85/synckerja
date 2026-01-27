import { useState } from 'react';
import { useCreateConversion, useConversionTypes } from '@/hooks/organized/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { useToast } from '@/hooks/organized/utils';

interface ConversionTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentPost: any;
}

export const ConversionTrackingModal = ({ open, onOpenChange, contentPost }: ConversionTrackingModalProps) => {
  const { toast } = useToast();
  const createConversion = useCreateConversion();
  const { data: conversionTypes = [] } = useConversionTypes();
  
  const [formData, setFormData] = useState({
    conversion_type: '',
    conversion_value: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contentPost || !formData.conversion_type) {
      toast({
        title: 'Error',
        description: 'Please select a conversion type',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createConversion.mutateAsync({
        content_post_id: contentPost.id,
        kol_profile_id: contentPost.kol_profile_id,
        conversion_type: formData.conversion_type,
        conversion_value: parseFloat(formData.conversion_value) || 0,
        utm_source: formData.utm_source || null,
        utm_medium: formData.utm_medium || null,
        utm_campaign: formData.utm_campaign || null,
        utm_content: formData.utm_content || null,
        conversion_date: new Date().toISOString(),
      });

      setFormData({
        conversion_type: '',
        conversion_value: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_content: '',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error recording conversion:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!contentPost) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Conversion</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conversion_type">Conversion Type *</Label>
            <Select value={formData.conversion_type} onValueChange={(value) => handleInputChange('conversion_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select conversion type" />
              </SelectTrigger>
              <SelectContent>
                {conversionTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name} ({type.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversion_value">Conversion Value ($)</Label>
            <Input
              id="conversion_value"
              type="number"
              step="0.01"
              value={formData.conversion_value}
              onChange={(e) => handleInputChange('conversion_value', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-3">
            <Label>UTM Parameters (Optional)</Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="utm_source" className="text-xs">Source</Label>
                <Input
                  id="utm_source"
                  value={formData.utm_source}
                  onChange={(e) => handleInputChange('utm_source', e.target.value)}
                  placeholder="instagram"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="utm_medium" className="text-xs">Medium</Label>
                <Input
                  id="utm_medium"
                  value={formData.utm_medium}
                  onChange={(e) => handleInputChange('utm_medium', e.target.value)}
                  placeholder="social"
                  className="text-sm"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="utm_campaign" className="text-xs">Campaign</Label>
              <Input
                id="utm_campaign"
                value={formData.utm_campaign}
                onChange={(e) => handleInputChange('utm_campaign', e.target.value)}
                placeholder="summer_sale"
                className="text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="utm_content" className="text-xs">Content</Label>
              <Input
                id="utm_content"
                value={formData.utm_content}
                onChange={(e) => handleInputChange('utm_content', e.target.value)}
                placeholder="post_caption"
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createConversion.isPending}>
              {createConversion.isPending ? 'Recording...' : 'Record Conversion'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
